# Contributing to GG Go Next

Thanks for helping. Right now the best way to help is with **bug reports and ideas**. Code changes (pull
requests) aren't open yet, so please open an issue instead of sending code.

## Bugs, ideas and questions

Open one with the [issue forms](https://github.com/kalelooz/gg-go-next/issues/new/choose), or click **Report a
problem** in Customize, which fills in your version for you.

For a bug, these help most:

- What you did, what you expected, and what happened instead.
- Your GG Go Next version (Customize, Updates and help) and Windows 10 or 11.
- A screenshot if something looks wrong. Blur player names and anything else personal first.
- If it's about timers or the overlay, turn on **Save game-feed logs**, play a game, and attach the log from the
  `logs` folder next to the app. Logs can include player names, so check before you post.

One issue per problem. Search first; if it's already there, a thumbs-up or a short comment is enough.

## Rules the app keeps

Ideas that break these won't be built, however useful:

- **Valve's game feed and your own input only.** GG Go Next never reads game memory or game files, never presses
  keys or clicks for you, and never changes Dota itself. Anything else risks a VAC ban for every user.
- **No personal data.** No accounts, no tracking, no ads, and no server of its own.
- **Online, only what the app already talks to:** STRATZ, Valve's image server and GitHub. A new service needs a
  good reason and a line in the README.
- **Free.** Tips are welcome and never unlock anything.

## Be kind

Be respectful, stay on topic, and assume good intent. Posts that are rude, spammy or off topic get hidden or
locked.

## Building it yourself

Needs Node.js 22+ and Rust on Windows.

```
cd app
npm ci
npm test
npx tauri build
```

Every change gets one line in [CHANGELOG.md](CHANGELOG.md). The licenses of the bundled libraries are in
[third-party-notices.txt](app/src/third-party-notices.txt); after changing Rust dependencies, rebuild it with
`cargo about generate about.hbs -o ../src/third-party-notices.txt` from `app/src-tauri` (needs
[cargo-about](https://github.com/EmbarkStudios/cargo-about)).

GG Go Next is under the [MIT license](LICENSE). By posting an issue with code, text or pictures in it, you agree
they can be used in the app under that license.
