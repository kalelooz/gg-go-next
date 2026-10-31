# GG Go Next

A free Dota 2 overlay for Windows. Timers, voice calls, item and skill hints, and a draft helper, all from the
game feed Valve made for tools like this. No account, no ads. Made by kalelooz.

**[Download for Windows](../../releases/latest)** · **[Website](https://kalelooz.github.io/gg-go-next/)**: tour with sound, the voices, FAQ

<a href="https://kalelooz.github.io/gg-go-next/"><img src="docs/tour.webp" width="720" alt="A 45-second tour: the overlay's timers, item and skill hints, spoken calls, the draft helper before and during a draft, and Customize"></a>

## What you get

- **Never miss a rune or a stack.** Timers for runes, shrines, lotus pools, stacks, Roshan, Aegis, Tormentor, the
  enemy glyph and your wards, with a voice call 20 seconds before.
- **Pick better.** The draft helper shows which heroes do well against the enemy draft and in your lane, from
  Divine and Immortal games.
- **Buy and skill better.** Items that win more right now, and the next skill most good players take.
- **Only what your role needs.** A carry isn't called for stacks, a support isn't told to farm ancients. You can
  change every switch per role.
- **A bit of fun.** Now and then a spoken joke, like "No TP. Enjoy the walk." Eight voices to pick from.

## Is it safe?

- It only uses Valve's **Game State Integration**, the official feed Dota sends to apps you allow.
- It never reads game memory or game files, and never presses keys or clicks for you.
- No account and no server of ours. Online it only talks to STRATZ (with your own free token), Valve's image server
  and GitHub (to check for updates, can be turned off).

**Can I get banned?** It only uses the feed Valve built for tools like this and doesn't touch the game. Nobody
outside Valve can promise anything, but it does nothing Valve's anti-cheat looks for.

**Windows says the file might be unsafe.** The files aren't code-signed yet, so SmartScreen warns about them. Pick
"More info", then "Run anyway". Each release lists the file's SHA-256, so you can check it with `Get-FileHash`.

## Setup

1. Download and run **[GG-Go-Next-setup.exe](../../releases/latest)**. Customize opens by itself.
2. Click **Set up Dota**.
3. In Steam, right-click Dota 2, then Properties, and add `-gamestateintegration` to Launch Options. In Dota's video
   settings, pick **Borderless Window**.
4. For the draft helper and hints, add a free STRATZ token. Customize walks you through it.

In game, **Ctrl+Shift+D** opens Customize and **Ctrl+Shift+S** hides the overlay. More answers are in the
[FAQ on the website](https://kalelooz.github.io/gg-go-next/#faq). Found a bug or have an idea? Click **Report a
problem** in Customize, or see [CONTRIBUTING.md](CONTRIBUTING.md).

<details>
<summary><b>Build it yourself</b></summary>

Needs Node.js 22+ and Rust. `cd app`, `npm ci`, `npm test`, `npx tauri build`. Releases are built the same way on
GitHub Actions ([build.yml](.github/workflows/build.yml)), so the download matches this code. Every change is in
[CHANGELOG.md](CHANGELOG.md).
</details>

---

Data from [STRATZ](https://stratz.com). Hero list from [dotaconstants](https://github.com/odota/dotaconstants)
(MIT). Voices made with [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0). Font: [Barlow](https://github.com/jpt/barlow) (SIL OFL). GG Go Next is MIT
licensed ([LICENSE](LICENSE)) and isn't affiliated with or endorsed by Valve. Dota 2 is a trademark of Valve
Corporation; hero and item pictures load from Valve's servers and belong to Valve. Every license the app ships
with is in [third-party-notices.txt](app/src/third-party-notices.txt).
