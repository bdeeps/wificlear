<!-- glassbox:start -->
<!-- Generated from glassbox.json by the Glassbox hub (npm run readme -- wificlear). Edit glassbox.json, not this block. -->

<h1 align="center">WifiClear</h1>

<p align="center"><b>How does Wi-Fi work?</b><br>Wi-Fi is radio: a wave that wiggles billions of times a second, nudged to carry bits. Watch the wave carry data, see the signal fade through walls, see devices take turns on the air, and follow a laptop's secret handshake with the router.</p>

<p align="center"><a href="https://glassbox.how/wificlear/"><b>▶ Play with it</b></a> &nbsp;·&nbsp; <a href="https://glassbox.how/e/wificlear/">Read the 60-second explainer</a></p>

<p align="center">
  <a href="https://glassbox.how/e/wificlear/"><img alt="Glassbox No. 220" src="https://img.shields.io/badge/Glassbox-No.%20220-8ef0ff"></a>
  <a href="https://glassbox.how/e/wificlear/"><img alt="Communication" src="https://img.shields.io/badge/field-Communication-5ce1a9"></a>
  <a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-3fb950"></a>
  <a href="LICENSE-CONTENT.md"><img alt="Content: CC BY 4.0" src="https://img.shields.io/badge/content-CC%20BY%204.0-ef9421"></a>
  <a href="#privacy"><img alt="Privacy: explained" src="https://img.shields.io/badge/privacy-explained-555"></a>
</p>

## In 60 seconds

1. **Wi-Fi is radio.** A Wi-Fi signal is a radio wave: an electric and a magnetic field wiggling together at the speed of light. It uses bands around 2.4, 5 and 6 GHz, which is 2.4 to 6 billion wiggles a second and wavelengths of about 12, 5.5 and 4.6 cm. An antenna is a piece of metal about half a wavelength long. It turns current into waves and passing waves back into a tiny voltage.
2. **Bits ride on the wave.** The router nudges the height and timing of a steady carrier wave. Each distinct nudge is a symbol, drawn as a dot on a constellation. BPSK has two dots and carries 1 bit per symbol. 64-QAM has 64 and carries 6, and Wi-Fi 6 goes up to 1024-QAM with 10. Noise blurs the dots, so a router uses dense modulation only when the signal is clean.
3. **Signal fades with distance and walls.** A router radiates in every direction, so received power falls with the square of distance. Walls take their own share: roughly 3 dB for drywall, 8 for brick, 13 or more for concrete. Higher bands lose more, so 2.4 GHz reaches furthest and 6 GHz is quicker but more local. As your signal weakens the router drops to sparser modulation and your link rate falls. Extra antennas (MIMO) and wider channels multiply the rate when the signal is good.
4. **Everyone shares one channel.** Only one device on a channel can talk at a time. Each listens first, then waits a random number of 9-microsecond slots and sends. If no acknowledgement comes back, it doubles the range of its random wait and tries again. This is CSMA/CA. More devices means more waiting and more collisions. On 2.4 GHz only channels 1, 6 and 11 do not overlap, and a neighbour on the same channel shares your air.
5. **Joining is a handshake.** The router announces its network name, the SSID, in beacons about ten times a second. Your laptop asks to join, then both sides turn the Wi-Fi password into the same master key without ever sending it. They swap two random numbers and mix them in to get a fresh session key, and a small code proves the laptop knew the password. From then on every frame is encrypted, so someone listening in the street hears only scrambled bytes. WPA3 also stops recorded handshakes from being used to guess passwords offline.
6. **Faster every few years.** Wi-Fi is the IEEE 802.11 family. Each generation used more of the same tricks: denser modulation, wider channels, more streams and better sharing of the air. The best-case link rate went from 2 Mbit/s in 1997 to 54 in 802.11a and g, 600 in 802.11n, about 6.9 Gbit/s in 802.11ac, 9.6 in 802.11ax and about 23 in 802.11be. Real speeds are usually well under half of those headline numbers.

## Words worth knowing

| Term | Meaning |
|---|---|
| **Frequency** | How many full wiggles of the wave happen each second. Wi-Fi uses billions of them (GHz). |
| **Wavelength** | The distance between two crests of the wave, about 12 cm at 2.4 GHz. Frequency times wavelength is the speed of light. |
| **Modulation** | Changing a steady carrier wave, in height or timing, so that it carries information. |
| **QAM** | Quadrature amplitude modulation: changing height and timing together, so each symbol carries several bits. |
| **RSSI** | Received signal strength, in dBm. A negative number: closer to zero is stronger. |
| **MIMO** | Multiple antennas at each end sending several independent streams at once to multiply the rate. |
| **CSMA/CA** | Listen before talking, wait a random time, and double the wait after a failure. How Wi-Fi avoids collisions. |
| **SSID** | The network's name, the thing you pick from the list. |
| **Handshake** | The four-message exchange that gives the laptop and router the same session key without sending it. |
| **WPA3** | The 2018 Wi-Fi security standard. It stops a recorded exchange being used to test password guesses offline. |

## A short history

**From Maxwell's equations and a spark in a German lab to a Hawaiian radio network, a name chosen by a branding firm, and a router in almost every home.**

- **1861** · Light is a wave, and other waves should exist (James Clerk Maxwell, Scotland and England)
- **1886** · Hertz makes radio waves in a lab (Heinrich Hertz, Karlsruhe, Germany)
- **1895** · Bose sends millimetre waves through walls (Jagadish Chandra Bose, Calcutta (now Kolkata), India)
- **1941** · A film star patents a way to hop between frequencies (Hedy Lamarr (as Hedy Kiesler Markey) and George Antheil, United States)
- **1971** · ALOHAnet: radio terminals that just retry (Norman Abramson, Franklin Kuo and the University of Hawai'i team, Honolulu, Hawai'i, USA)
- **1985** · The FCC lets anyone use spread spectrum (US Federal Communications Commission, Washington, USA)
- **1992** · CSIRO builds a wireless LAN that copes with echoes (John O'Sullivan and the CSIRO Radiophysics team, Sydney, Australia)
- **1997** · The first 802.11 standard: 2 Mbit/s (IEEE 802.11 working group, United States)

The full story, with 32 moments, charts, people and 32 sources: [glassbox.how/e/wificlear/history](https://glassbox.how/e/wificlear/history/). The data lives in [`history.json`](history.json).

## Privacy

This box has no accounts and no ads, and it ships its own fonts and libraries. When you run it yourself it sends nothing anywhere. On glassbox.how, the site's `/bar.js` also loads Glassbox's analytics: **Google Analytics** to count visits (it asks first in the EU, UK and Switzerland, and stays off when your browser sends Global Privacy Control or Do Not Track) and **ClickTrust** to detect bots.

It remembers a few things **in your own browser only**, and never sends them anywhere:

| Browser storage key | What it holds |
|---|---|
| `wificlear.v1` | Which chapters you have opened, your best quiz scores, and sound on or off. |

Exactly what each one sees is at [glassbox.how/privacy](https://glassbox.how/privacy/).

## Licences

- **Code:** [MIT](LICENSE). Use it, change it, ship it.
- **Explanations, text, images and videos** (`glassbox.json`, `glassbox/`): [CC BY 4.0](LICENSE-CONTENT.md). Credit “Glassbox, glassbox.how/e/wificlear”.
- **Third-party parts** keep their own licences: [three.js](https://threejs.org) (MIT), [Geist, Instrument Serif](https://openfontlicense.org) (SIL OFL 1.1).
- The Glassbox name and logo aren't covered by either licence. See the [terms](https://glassbox.how/terms/).

Found a mistake? [Open an issue](https://github.com/bdeeps/wificlear/issues). Corrections happen in public.
<!-- glassbox:end -->

## Run it

It's plain HTML, CSS and JavaScript. No build step and no dependencies. Run locally, it contacts no other website.

```bash
python3 -m http.server 8000
```

Three.js and the fonts ship in `vendor/` and `fonts/`, so it also works offline.

Then open http://localhost:8000.

## How it's built

| File | What |
|---|---|
| `index.html`, `css/app.css` | The page and its styles |
| `js/app.js`, `js/stage.js`, `js/ui.js`, `js/kit.js` | The shared Glassbox 3D engine: chapters, 3D stage, controls, quiz, video director |
| `js/chapters/*.js` | One file per chapter: the 3D model, controls, text, key terms, quiz and video scenes |
| `glassbox.json` | Title, question, explainer beats, key terms, browser storage and credits shown on glassbox.how |
| `reel` in each chapter | The storyboard the Glassbox studio records into short videos |
| `glassbox/` | The published video, slides, thumbnail and post copy |
| `fonts/`, `vendor/three/` | Self-hosted Geist and Instrument Serif (SIL OFL 1.1) and three.js (MIT) |
