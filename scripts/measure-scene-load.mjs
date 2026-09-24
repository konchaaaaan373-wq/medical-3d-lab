#!/usr/bin/env node
/**
 * How long a scene takes to open on a slow link, and where the time goes.
 *
 *   npm run build
 *   npm run measure:load -- --scene heart-anatomy [--mbps 9] [--rtt 60] [--cpu 4]
 *
 * Every other browser check serves `dist/` from localhost with no throttling,
 * where a 4.5 MB atlas arrives in 20 ms and nothing is slow. That is how the
 * model request going out 3.7 s after navigation went unseen: on localhost the
 * same gap is under two seconds of CPU and reads as "fine" (2026-09-24,
 * `docs/verification-lessons.md` L-109). This emulates a link and a phone CPU
 * over CDP and prints, for each model file, when its request started and
 * ended, and when the part tree appeared.
 *
 * It measures; it does not enforce. Wall-clock numbers from a software-GL
 * container are not a budget anyone can hold a PR to. The property that *can*
 * be enforced — the model files are preloaded and fetched once — is enforced by
 * `verify:anatomy`.
 *
 * Run one browser check at a time (CLAUDE.md).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromiumExecutable } from './lib/browser.mjs';
import { serveDist } from './lib/serve-dist.mjs';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const slug = value('--scene', 'brain-anatomy');
const mbps = Number(value('--mbps', '9'));
const rtt = Number(value('--rtt', '60'));
const cpu = Number(value('--cpu', '4'));
const distDir = resolve(value('--dist', 'dist'));
if (!existsSync(distDir)) {
  console.error(`No build at ${distDir}. Run \`npm run build\` first.`);
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright is not installed:  npm i --no-save playwright');
  process.exit(1);
}

const { base, close } = await serveDist(distDir);
const browser = await chromium.launch({ executablePath: chromiumExecutable(chromium) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: rtt,
    downloadThroughput: (mbps * 1e6) / 8,
    uploadThroughput: 250000,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

  const started = Date.now();
  await page.goto(`${base}#/${slug}`);
  // The same "ready" `verify:anatomy` uses: the part tree exists only once the
  // model has loaded and been read.
  await page.waitForFunction(() => document.querySelectorAll('.anatomy-tree-leaf').length > 0, {
    timeout: 300000,
  });
  const ready = Date.now() - started;

  const files = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => /\.(glb|gltf|bin|drc|wasm)$|draco/.test(entry.name))
      .map((entry) => ({
        file: new URL(entry.name).pathname,
        by: entry.initiatorType,
        start: Math.round(entry.startTime),
        end: Math.round(entry.responseEnd),
        kB: Math.round(entry.encodedBodySize / 1024),
      }))
  );

  console.log(`${slug} — ${mbps} Mbps, ${rtt} ms RTT, CPU ×${cpu} (serve-dist: no compression on the wire)`);
  for (const f of files) {
    console.log(`  ${String(f.start).padStart(6)} → ${String(f.end).padStart(6)} ms  ${String(f.kB).padStart(5)} kB  ${f.by.padEnd(6)} ${f.file}`);
  }
  console.log(`  part tree after ${ready} ms`);
} finally {
  await browser.close();
  close();
}
