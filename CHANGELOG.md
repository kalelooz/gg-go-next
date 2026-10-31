# Changelog

Every version of GG Go Next. The app shows the newest section in its "What's new" window after an update, and each
GitHub release uses the same text, so keep every change on one line that starts with `- `.

## 0.4.1

- **Update notices while it runs.** The app now asks GitHub for a new version every hour, not only at start, so you hear about updates even if you leave it open all day.
- **STRATZ token in Customize.** A new section explains what the token is for, opens stratz.com/api for you and checks the token before saving it, so you don't have to wait for a draft to set it up.
- **Strong picks before the draft.** Pick your role in the draft helper and, before any hero is picked, it lists your best heroes in that role and the best heroes in that role this patch (Divine and Immortal games).
- Each suggested hero links to its matchups on STRATZ.
- **Spoken jokes.** The jokes are now voice only, with several versions each, so the overlay's text stays plain: no TP, short on buyback gold, no wards or no observers after 15:00, a lonely Roshan. Each one at most once or twice a game. Turn off Spoken jokes in Customize to skip them.
- **Customize, rebuilt.** A sidebar splits it into five short pages: Setup, On screen, Voice, Hotkeys, and Updates and help. Shorter descriptions, more room, and a new font (Barlow) that ships with the app. A card at the top shows whether setup is done, or what's left. The draft helper uses the same font.
- **How it works.** A button at the top of Customize shows the setup steps and what the app reads and sends, as two pictures.
- **Ctrl+Shift+S hides and shows the overlay**, so it stays out of the way while the shop is open. The tray tick follows it.
- **Change both hotkeys in Customize.** Click one and press a new combination. It tells you if another program already uses it, and it won't take a key Dota needs.
- On Windows 10, the tray menu no longer opens half-hidden behind the box of hidden tray icons.

## 0.4.0

- **One-click Dota setup.** Customize has a "Set up Dota" button that finds Dota through Steam and puts the game-data file in its folder, so nobody has to copy it by hand. A line under it turns green once Dota is connected. On a fresh install, Customize opens by itself until this is done.
- **One-click updates.** When a newer version is out, Update now in Customize or the tray downloads it, checks its signature, installs it and opens the app again. Nothing installs without that click. The single exe still opens the download page.
- Long tips no longer push the timers to the window's left edge.

## 0.3.0

- **Installer.** GG Go Next now comes as a normal Windows setup file, with a Start menu entry and an uninstaller in Windows settings. No admin rights needed. A single exe without setup is still on each release page.
- **What's new.** After an update, this window shows what changed, once.
- **Report a problem or idea.** A button at the top of Customize, and a tray menu item, open a short form for a bug, an idea or a question. Your app version is filled in for you.

## 0.2.0

- **Update notice.** When a newer version is out, the tray menu and Customize show it with a Download button. The app asks GitHub once at start; turn off "Check for updates" in Customize to skip it.
- Game-feed logs are off unless you turn on "Save game-feed logs" in Customize.
- Timer rows are words only, and the app ships no Valve files.

## 0.1.0

- First public version: map timers, voice calls, level-up and item hints, and the draft helper.
