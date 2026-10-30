# GG Go Next

A free Windows overlay for Dota 2: map timers, voice calls, item and skill hints, and a draft helper.
Made by kalelooz.

![The overlay during a game: rune, Roshan, Tormentor and glyph timers, then level-up and item hints](docs/screenshot.jpg)

## What it does

- **Timers** for power, bounty and water runes, wisdom shrines, lotus pools, camp stacks, Roshan's pit and
  respawn window, Aegis, Tormentor, the enemy glyph and your team's wards. Rules come from Valve's patch notes
  (currently 7.41f), listed with sources in [docs/game-rules.md](docs/game-rules.md).
- **Voice calls** 20 seconds before runes, at stack time, and before Roshan changes pit. Each role has its own
  Show and Voice switches, so a carry isn't called for stacks and a support isn't told to farm ancients.
- **Top strip** with day and night, TP, buyback (and how much gold you're short) and your courier.
- **Hints** at level-up (which ability most good players skill next), items that win more in your game, and
  neutral item picks.
- **Draft helper** in its own window. Type any hero, including old names and short forms (Wisp, Furion, AM),
  drag picks into Pos 1 to 5, and see which heroes do well against the enemy draft and in your lane, from
  Divine and Immortal games.

Press **Ctrl+Shift+D** in game to open Customize. The tray icon has the draft helper, voice choice and your role.

## What it reads, and what it never does

- It only reads Valve's **Game State Integration**, the official feed Dota sends to local apps you allow in a
  config file.
- It never reads game memory or game files, and never presses keys or clicks for you.
- The draft helper only knows the heroes you type in.

## Privacy

- No account, no login, no server of ours. Everything runs on your PC.
- Two online services, nothing else:
  - **STRATZ**, with your own free token, for the draft numbers and the in-game hints.
  - **Valve's image server**, for item and hero pictures.
- Your settings and STRATZ token stay in `%APPDATA%\com.kalelooz.gggonext`.
- Game-feed logs are off. Turn on "Save game-feed logs" in Customize only if you want to send a bug report.

## Install

1. Download `GG Go Next.exe` from [Releases](../../releases). The release notes list its SHA-256; in PowerShell,
   `Get-FileHash "GG Go Next.exe"` should print the same value.
2. Copy [docs/gamestate_integration_gggonext.cfg](docs/gamestate_integration_gggonext.cfg) into
   `Steam\steamapps\common\dota 2 beta\game\dota\cfg\gamestate_integration\` (create the last folder if it's missing).
3. In Steam, right-click Dota 2, then Properties, and add `-gamestateintegration` to Launch Options.
4. In Dota's video settings, pick **Borderless Window**, so the overlay can sit on top of the game.
5. Start `GG Go Next.exe`. It lives in the tray.
6. For the draft helper and hints, get a token at [stratz.com/api](https://stratz.com/api) and paste it into the
   draft helper window.

The exe isn't code-signed, so Windows may show a SmartScreen warning. Pick "More info", then "Run anyway".

**Uninstall:** delete the exe, the `.cfg` file from step 2, and the `com.kalelooz.gggonext` folders in
`%APPDATA%` and `%LOCALAPPDATA%`.

## Build it yourself

Needs Node.js 20+ and Rust (stable).

```
cd app
npm ci
npm test
npx tauri build --no-bundle
```

The exe lands in `app/src-tauri/target/release/gg-go-next.exe`. Release builds come from the same steps on
GitHub Actions ([.github/workflows/build.yml](.github/workflows/build.yml)), so the download matches this code.

## Where things are

| Folder | What's in it |
|---|---|
| `app/src/` | The windows (`index.html` overlay, `draft.html`, `settings.html`, `topbar.html`, `skillbar.html`) and the game logic they share (`timers.js`, `roles.js`, `picks.js`, ...). Each `*.test.mjs` tests the file it's named after. |
| `app/src-tauri/` | The Rust side: listens for the game feed, runs the tray menu, and calls STRATZ. |
| `app/src/voice/` | The recorded voice clips, one folder per voice. |
| `docs/` | Game rules with patch sources, research notes, and the game-feed config. |
| `tools/` | Scripts that rebuild the hero data, neutral item tables and voice clips. |

## FAQ

**Can I get banned for this?**
It uses only the feed Valve built for tools like this, and doesn't touch the game itself. Nobody outside Valve
can promise anything, but it does nothing Valve's anti-cheat looks for.

**Was AI used to make it?**
Yes. kalelooz plays Dota, designs the features, tests them in real games and decides what goes in. The code is
written with Claude Code.

**Something's wrong in game.**
Open an issue. If you can, turn on "Save game-feed logs", reproduce it, and attach the newest file from the
`logs` folder next to the exe.

## Support

GG Go Next is free. If it helps your games, you can tip at [ko-fi.com/kalelooz](https://ko-fi.com/kalelooz).

## Credits

- Draft and item data: [STRATZ](https://stratz.com)
- Hero list: [dotaconstants](https://github.com/odota/dotaconstants) by OpenDota (MIT)
- Voices: [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0)

## License and disclaimer

MIT, see [LICENSE](LICENSE).

GG Go Next isn't affiliated with or endorsed by Valve. Dota 2 is a trademark of Valve Corporation. Item and hero
pictures load from Valve's servers and belong to Valve.
