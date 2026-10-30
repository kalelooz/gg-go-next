#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

// Opens the Customize window over the game and closes it again, so nobody has to alt-tab to the tray
const HOTKEY: &str = "ctrl+shift+d";

fn toggle_settings(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("settings") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

// Must match the uri in Dota's gamestate_integration_gggonext.cfg
const GSI_ADDR: &str = "127.0.0.1:3101";

// Raw game-feed logs (opt-in): one file per app run. Oldest go first past either limit; logs/keep/ is never touched.
const KEEP_LOGS: usize = 10;
const KEEP_LOG_BYTES: u64 = 300 * 1024 * 1024;

// Tray toggles and the draft window's position, saved to settings.json so they survive a restart
struct Settings(Mutex<Value>);

fn settings_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("settings.json"))
}

fn load_settings(app: &AppHandle) -> Value {
    settings_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .filter(Value::is_object)
        .unwrap_or_else(|| json!({}))
}

fn save_settings(app: &AppHandle, v: &Value) {
    if let Some(p) = settings_path(app) {
        let _ = create_dir_all(p.parent().unwrap());
        let _ = std::fs::write(p, v.to_string());
    }
}

// The overlay asks for the saved toggles when it starts, since the tray only emits on change
#[tauri::command]
fn get_settings(state: tauri::State<Settings>) -> Value {
    state.0.lock().unwrap()["toggles"].clone()
}

// The tray menu, kept so a change made in the Customize window also ticks or unticks it there
struct TrayMenu(Menu<tauri::Wry>);

// From the Customize window: save, tell every window, and keep the tray's tick marks in step
#[tauri::command]
fn set_setting(app: AppHandle, state: tauri::State<Settings>, menu: tauri::State<TrayMenu>, id: String, value: Value) {
    let ticked = |item_id: &str, on: bool| {
        if let Some(c) = menu.0.get(item_id).and_then(|i| i.as_check_menuitem().cloned()) {
            let _ = c.set_checked(on);
        }
    };
    if id == "voice_pick" {
        for (v, _) in VOICES {
            ticked(&format!("voice:{v}"), value.as_str() == Some(v));
        }
    } else if id == "role" {
        for (r, _) in ROLES {
            ticked(&format!("role:{r}"), value.as_str() == Some(r));
        }
    } else if let Some(on) = value.as_bool() {
        ticked(&id, on);
    }
    let _ = app.emit("settings", (id.clone(), value.clone()));
    let mut s = state.0.lock().unwrap();
    s["toggles"][id] = value;
    save_settings(&app, &s);
}

fn trim_logs(dir: &std::path::Path, keep: usize, keep_bytes: u64) {
    let mut logs: Vec<(PathBuf, u64)> = std::fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.file_name().to_str().is_some_and(|n| n.starts_with("gsi-") && n.ends_with(".jsonl")))
        .map(|e| (e.path(), e.metadata().map(|m| m.len()).unwrap_or(0)))
        .collect();
    // gsi-<unix seconds>.jsonl, so name order is age order; newest first
    logs.sort();
    logs.reverse();
    let mut total = 0;
    // room for the log this run is about to start
    for (i, (path, size)) in logs.iter().enumerate() {
        total += size;
        if i + 1 >= keep || total > keep_bytes {
            let _ = std::fs::remove_file(path);
        }
    }
}

const STRATZ_URL: &str = "https://api.stratz.com/graphql";

// Runs from Rust because STRATZ requires a User-Agent header that webviews can't set
#[tauri::command]
async fn stratz(token: String, query: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let body = serde_json::json!({ "query": query }).to_string();
        let res = ureq::post(STRATZ_URL)
            .set("Authorization", &format!("Bearer {token}"))
            .set("User-Agent", "STRATZ_API")
            .set("Content-Type", "application/json")
            .send_string(&body);
        match res {
            Ok(r) => r.into_string().map_err(|e| e.to_string()),
            // a rejected token comes back as 401/403 with STRATZ's reason in the body; pass that on
            Err(ureq::Error::Status(code, r)) => Err(format!("STRATZ said {code}: {}", r.into_string().unwrap_or_default())),
            Err(e) => Err(e.to_string()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// Update notice: one request to GitHub at start (unless "Check for updates" is off). Nothing downloads or
// installs by itself; the tray item and Customize's banner only open the releases page.
const RELEASES_API: &str = "https://api.github.com/repos/kalelooz/gg-go-next/releases/latest";
const RELEASES_PAGE: &str = "https://github.com/kalelooz/gg-go-next/releases/latest";

// Newest version on GitHub, set only when it's newer than this build
struct Update(Mutex<Option<String>>);

// "v0.2.0" against "0.1.0"; anything that isn't plain numbers (a pre-release tag) never counts as newer
fn is_newer(tag: &str, current: &str) -> bool {
    let parse = |v: &str| v.trim_start_matches('v').split('.').map(|n| n.parse::<u64>().ok()).collect::<Option<Vec<_>>>();
    matches!((parse(tag), parse(current)), (Some(a), Some(b)) if a > b)
}

fn latest_release_tag(current: &str) -> Option<String> {
    let body = ureq::get(RELEASES_API)
        .set("User-Agent", &format!("gg-go-next/{current}"))
        .set("Accept", "application/vnd.github+json")
        .timeout(std::time::Duration::from_secs(10))
        .call()
        .ok()?
        .into_string()
        .ok()?;
    serde_json::from_str::<Value>(&body).ok()?["tag_name"].as_str().map(str::to_string)
}

// The page is a fixed address, never a link taken from the API answer
fn open_releases_page() {
    let _ = std::process::Command::new("explorer").arg(RELEASES_PAGE).spawn();
}

#[tauri::command]
fn get_update(state: tauri::State<Update>) -> Option<String> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn open_releases() {
    open_releases_page();
}

// The token lives in a file, not the webview's localStorage: WebView2 writes that to disk lazily,
// so closing the app soon after saving lost it
fn token_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_config_dir().map(|d| d.join("stratz_token.txt")).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_token(app: tauri::AppHandle) -> Option<String> {
    let t = std::fs::read_to_string(token_path(&app).ok()?).ok()?;
    Some(t.trim().to_string()).filter(|t| !t.is_empty())
}

#[tauri::command]
fn save_token(app: tauri::AppHandle, token: String) -> Result<(), String> {
    let path = token_path(&app)?;
    create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    std::fs::write(path, token.trim()).map_err(|e| e.to_string())
}

// (id, label, on at start); the overlay's own defaults in index.html must match
// Which runes, stacks and Roshan calls talk is set per role in Customize, so the tray only has the master switch
const TOGGLES: [(&str, &str, bool); 2] = [
    ("show", "Show timers", true),
    ("voice", "Voice alerts", true),
];

// Recorded alert voices: folder names under app/src/voice (tools/make_voice.py). The first is the default.
const VOICES: [(&str, &str); 8] = [
    ("am_michael", "Michael (US)"),
    ("am_fenrir", "Fenrir (US)"),
    ("am_puck", "Puck (US)"),
    ("af_heart", "Heart (US)"),
    ("af_bella", "Bella (US)"),
    ("af_nicole", "Nicole (US, soft)"),
    ("bm_george", "George (UK)"),
    ("bf_emma", "Emma (UK)"),
];

// Role menu: "auto" guesses from the lane and STRATZ (app/src/roles.js); 1-5 are positions
const ROLES: [(&str, &str); 6] = [
    ("auto", "Auto (guess)"),
    ("1", "Carry"),
    ("2", "Mid"),
    ("3", "Offlane"),
    ("4", "Soft support"),
    ("5", "Hard support"),
];

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_settings(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![stratz, load_token, save_token, get_settings, set_setting, get_update, open_releases])
        .setup(|app| {
            let saved = load_settings(app.handle());
            // another app may already own the combination; the tray item still works then
            if let Err(e) = app.global_shortcut().register(HOTKEY) {
                eprintln!("hotkey {HOTKEY} not available: {e}");
            }
            app.manage(Settings(Mutex::new(saved.clone())));
            app.manage(Update(Mutex::new(None)));

            let win = app.get_webview_window("overlay").unwrap();
            // A small box in the top-right corner, not a full-screen layer: Windows composites
            // every covered pixel each frame, and a full-screen overlay costs Dota FPS
            if let Some(m) = win.current_monitor()? {
                let (mp, ms) = (m.position(), m.size());
                let w = (ms.height as f64 * 0.44) as u32;
                // tall enough for every row plus the wards line and the items panel with its tips
                let h = (ms.height as f64 * 0.6) as u32;
                win.set_size(tauri::PhysicalSize::new(w, h))?;
                win.set_position(tauri::PhysicalPosition::new(
                    mp.x + ms.width as i32 - w as i32,
                    mp.y + (ms.height as f64 * 0.09) as i32,
                ))?;
            }
            // Clicks pass through to Dota; the overlay never takes input
            win.set_ignore_cursor_events(true)?;

            // Kill streaks go under Dota's top-bar portraits. Dota scales its HUD with screen height
            // and centers the top bar, so the strip is 860x28 at 1080p, scaled the same way
            let bar = app.get_webview_window("topbar").unwrap();
            if let Some(m) = bar.current_monitor()? {
                let (mp, ms) = (m.position(), m.size());
                let k = ms.height as f64 / 1080.0;
                let (w, h) = ((860.0 * k) as u32, (28.0 * k) as u32);
                bar.set_size(tauri::PhysicalSize::new(w, h))?;
                bar.set_position(tauri::PhysicalPosition::new(
                    mp.x + (ms.width as i32 - w as i32) / 2,
                    mp.y + (40.0 * k) as i32,
                ))?;
            }
            bar.set_ignore_cursor_events(true)?;

            // Skill bar marker over Dota's ability buttons: 1120x220 at 1080p from x 400, y 790, scaled with height
            // and kept centered like Dota's bottom HUD (positions in skillbar.html)
            let sk = app.get_webview_window("skillbar").unwrap();
            if let Some(m) = sk.current_monitor()? {
                let (mp, ms) = (m.position(), m.size());
                let k = ms.height as f64 / 1080.0;
                let (w, h) = ((1120.0 * k) as u32, (220.0 * k) as u32);
                sk.set_size(tauri::PhysicalSize::new(w, h))?;
                sk.set_position(tauri::PhysicalPosition::new(
                    mp.x + ms.width as i32 / 2 - (560.0 * k) as i32,
                    mp.y + (790.0 * k) as i32,
                ))?;
            }
            sk.set_ignore_cursor_events(true)?;

            // Draft helper sits on the right side, clear of Dota's hero grid
            let draft = app.get_webview_window("draft").unwrap();
            if let Some(m) = draft.current_monitor()? {
                let (mp, ms) = (m.position(), m.size());
                let w = (ms.height as f64 * 0.52 - 10.0 * m.scale_factor()) as u32;
                let h = (ms.height as f64 * 0.80) as u32;
                draft.set_size(tauri::PhysicalSize::new(w, h))?;
                draft.set_position(tauri::PhysicalPosition::new(
                    mp.x + ms.width as i32 - w as i32 - 16,
                    mp.y + (ms.height as f64 * 0.08) as i32,
                ))?;
            }
            // put it back where it was last dragged, if that spot is still on a connected screen
            if let (Some(x), Some(y)) = (saved["draft_pos"][0].as_i64(), saved["draft_pos"][1].as_i64()) {
                let on_screen = draft.available_monitors()?.iter().any(|m| {
                    let (p, s) = (m.position(), m.size());
                    x >= p.x as i64 && y >= p.y as i64 && x < p.x as i64 + s.width as i64 && y < p.y as i64 + s.height as i64
                });
                if on_screen {
                    draft.set_position(tauri::PhysicalPosition::new(x as i32, y as i32))?;
                }
            }
            let handle = app.handle().clone();
            draft.on_window_event(move |e| {
                if let WindowEvent::Moved(p) = e {
                    let state = handle.state::<Settings>();
                    let mut s = state.0.lock().unwrap();
                    s["draft_pos"] = json!([p.x, p.y]);
                    save_settings(&handle, &s);
                }
            });

            let menu = Menu::new(app)?;
            menu.append(&MenuItem::with_id(app, "draft", "Draft helper", true, None::<&str>)?)?;
            menu.append(&MenuItem::with_id(app, "settings", "Customize overlay   Ctrl+Shift+D", true, None::<&str>)?)?;
            menu.append(&PredefinedMenuItem::separator(app)?)?;
            for (id, label, on) in TOGGLES {
                let on = saved["toggles"][id].as_bool().unwrap_or(on);
                menu.append(&CheckMenuItem::with_id(app, id, label, true, on, None::<&str>)?)?;
            }
            // one ticked voice at a time; ids are "voice:<folder>"
            let picked = saved["toggles"]["voice_pick"].as_str().unwrap_or(VOICES[0].0).to_string();
            let voice_items = VOICES
                .iter()
                .map(|(v, label)| CheckMenuItem::with_id(app, format!("voice:{v}"), *label, true, *v == picked, None::<&str>))
                .collect::<Result<Vec<_>, _>>()?;
            let refs: Vec<&dyn IsMenuItem<_>> = voice_items.iter().map(|i| i as &dyn IsMenuItem<_>).collect();
            menu.append(&Submenu::with_items(app, "Voice", true, &refs)?)?;
            let role = saved["toggles"]["role"].as_str().unwrap_or("auto").to_string();
            let role_items = ROLES
                .iter()
                .map(|(r, label)| CheckMenuItem::with_id(app, format!("role:{r}"), *label, true, *r == role, None::<&str>))
                .collect::<Result<Vec<_>, _>>()?;
            let refs: Vec<&dyn IsMenuItem<_>> = role_items.iter().map(|i| i as &dyn IsMenuItem<_>).collect();
            menu.append(&Submenu::with_items(app, "Role", true, &refs)?)?;
            menu.append(&PredefinedMenuItem::separator(app)?)?;
            menu.append(&MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?)?;

            app.manage(TrayMenu(menu.clone()));
            if saved["toggles"]["check_updates"].as_bool() != Some(false) {
                let handle = app.handle().clone();
                let menu = menu.clone();
                std::thread::spawn(move || {
                    let current = handle.package_info().version.to_string();
                    let Some(tag) = latest_release_tag(&current).filter(|t| is_newer(t, &current)) else { return };
                    let version = tag.trim_start_matches('v').to_string();
                    *handle.state::<Update>().0.lock().unwrap() = Some(version.clone());
                    let _ = handle.emit("update", version.clone());
                    let h = handle.clone();
                    let _ = handle.run_on_main_thread(move || {
                        let label = format!("Version {version} is out: download");
                        if let Ok(item) = MenuItem::with_id(&h, "update", label, true, None::<&str>) {
                            let _ = menu.insert(&item, 0);
                            if let Ok(sep) = PredefinedMenuItem::separator(&h) {
                                let _ = menu.insert(&sep, 1);
                            }
                        }
                    });
                });
            }
            let tray_menu = menu.clone();
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("GG Go Next")
                .menu(&menu)
                .on_menu_event(move |app, ev| {
                    let id = ev.id().as_ref();
                    if id == "quit" {
                        app.exit(0);
                        return;
                    }
                    if id == "update" {
                        open_releases_page();
                        return;
                    }
                    if id == "draft" || id == "settings" {
                        if let Some(w) = app.get_webview_window(id) {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                        return;
                    }
                    if let Some(v) = id.strip_prefix("voice:") {
                        for item in &voice_items {
                            let _ = item.set_checked(item.id().as_ref() == id);
                        }
                        let _ = app.emit("settings", ("voice_pick".to_string(), v.to_string()));
                        let state = app.state::<Settings>();
                        let mut s = state.0.lock().unwrap();
                        s["toggles"]["voice_pick"] = json!(v);
                        save_settings(app, &s);
                        return;
                    }
                    if let Some(r) = id.strip_prefix("role:") {
                        for item in &role_items {
                            let _ = item.set_checked(item.id().as_ref() == id);
                        }
                        let _ = app.emit("settings", ("role".to_string(), r.to_string()));
                        let state = app.state::<Settings>();
                        let mut s = state.0.lock().unwrap();
                        s["toggles"]["role"] = json!(r);
                        save_settings(app, &s);
                        return;
                    }
                    if let Some(item) = tray_menu.get(id) {
                        if let Some(check) = item.as_check_menuitem() {
                            let on = check.is_checked().unwrap_or(true);
                            let _ = app.emit("settings", (id.to_string(), on));
                            let state = app.state::<Settings>();
                            let mut s = state.0.lock().unwrap();
                            s["toggles"][id] = json!(on);
                            save_settings(app, &s);
                        }
                    }
                })
                .build(app)?;

            // Raw logs show exactly what Valve sends, for fixing bugs. Off unless "Save game-feed logs" is ticked
            // in Customize; read once here, so a change applies on the next start.
            let log_path = if saved["toggles"]["save_logs"].as_bool() == Some(true) {
                let logs = std::env::current_exe()?.parent().unwrap().join("logs");
                create_dir_all(&logs)?;
                trim_logs(&logs, KEEP_LOGS, KEEP_LOG_BYTES);
                let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
                Some(logs.join(format!("gsi-{secs}.jsonl")))
            } else {
                None
            };

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let server = match tiny_http::Server::http(GSI_ADDR) {
                    Ok(s) => s,
                    Err(e) => {
                        let _ = handle.emit("gsi_error", format!("Port {GSI_ADDR} is busy: {e}"));
                        return;
                    }
                };
                let mut log = log_path.and_then(|p| OpenOptions::new().create(true).append(true).open(p).ok());
                for mut req in server.incoming_requests() {
                    let mut body = String::new();
                    let _ = req.as_reader().read_to_string(&mut body);
                    let line = body.replace(['\r', '\n'], "");
                    if let Some(f) = log.as_mut() {
                        let _ = writeln!(f, "{line}");
                    }
                    let _ = handle.emit("gsi", line);
                    let _ = req.respond(tiny_http::Response::empty(200));
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start GG Go Next");
}

#[cfg(test)]
mod tests {
    use super::{is_newer, trim_logs};

    fn names(dir: &std::path::Path) -> Vec<String> {
        let mut v: Vec<String> = std::fs::read_dir(dir).unwrap().flatten().map(|e| e.file_name().into_string().unwrap()).collect();
        v.sort();
        v
    }

    #[test]
    fn keeps_newest_logs_and_leaves_other_files() {
        let dir = std::env::temp_dir().join(format!("gg-go-next-trim-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("keep")).unwrap();
        for s in 100..105 {
            std::fs::write(dir.join(format!("gsi-{s}.jsonl")), "x".repeat(10)).unwrap();
        }
        std::fs::write(dir.join("notes.txt"), "mine").unwrap();
        // keep 3: two old ones stay, plus room for the new run
        trim_logs(&dir, 3, 1000);
        assert_eq!(names(&dir), ["gsi-103.jsonl", "gsi-104.jsonl", "keep", "notes.txt"]);
        // a size limit of 15 bytes keeps only the newest 10-byte file
        trim_logs(&dir, 10, 15);
        assert_eq!(names(&dir), ["gsi-104.jsonl", "keep", "notes.txt"]);
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn newer_versions() {
        assert!(is_newer("v0.2.0", "0.1.0"));
        assert!(is_newer("v0.10.0", "0.9.3"));
        assert!(is_newer("v1.0.0", "0.9.9"));
        assert!(!is_newer("v0.1.0", "0.1.0"));
        assert!(!is_newer("v0.1.0", "0.2.0"));
        assert!(!is_newer("v0.3.0-beta", "0.2.0"));
        assert!(!is_newer("", "0.1.0"));
    }
}
