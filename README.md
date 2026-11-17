[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/izrael666/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/izrael666/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# best-game-01 — Starhold

**Starhold** is an original orbital arcade shooter. Guard the Heart Star at the center of the field: asteroids drift in from the dark, and you must break them before they reach it. Big rocks split in two. Aim with the mouse, fire with a click or Space; Arrows or A/D turn the cannon. P pauses, M mutes. Each wave brings more rocks; the star has 3 hearts, and the game ends when it goes dark ("The star is dark") — press Space or click to guard it again. Score, wave, and best score are shown throughout.

The game runs in a desktop browser from static files with no network request, played with keyboard and mouse, complete from its start to its restart, with its own art, sounds, and names.

## What the program does

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`, the summary the judge reads, with the vendored make.fun library. It first checks that `game/index.html` exists and that `screenshots/` holds 3 or 4 images, each no larger than the scorer's 256 KiB cap, and fails with a clear error if the entry is incomplete.

## How to run

Serve the game locally, then open it in a browser:

```sh
node serve.ts
```

Then open http://localhost:8080.

To build the entry's output the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The output is `out/` with `game/`, `screenshots/` (4 JPEGs: start, two play moments, and game over), and `dossier.json`.
