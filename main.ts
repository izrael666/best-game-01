// Starhold's entry program (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail early with a clear error if the entry is incomplete: the game must have its entry
// point, and the screenshots must be 3 or 4 images, each no larger than the scorer's 256 KiB cap.
const indexPath = join(here, 'game', 'index.html');
if (!existsSync(indexPath)) throw new Error(`Starhold is missing its entry point: ${indexPath} does not exist.`);
const shotDir = join(here, 'screenshots');
const shotFiles = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => /\.(?:jpe?g|png)$/i.test(name)).sort()
  : [];
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`Starhold needs 3 or 4 screenshots in ${shotDir}, found ${shotFiles.length}.`);
}
for (const name of shotFiles) {
  const bytes = statSync(join(shotDir, name)).size;
  if (bytes > 262144) throw new Error(`Screenshot ${name} is ${bytes} bytes, over the 256 KiB cap.`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
