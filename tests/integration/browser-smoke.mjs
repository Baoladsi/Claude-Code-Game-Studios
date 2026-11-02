// Browser smoke test + screenshot evidence for the vertical slice.
// Requires Playwright (not a project dependency): `npx playwright install chromium` once.
// Usage: node tests/integration/browser-smoke.mjs [outDir]
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'production/qa/evidence/vertical-slice';
const port = 8123;
await mkdir(out, { recursive: true });

const server = spawn(process.execPath, ['tools/serve.mjs', String(port)], { stdio: 'pipe' });
await new Promise((r) => server.stdout.once('data', r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const base = `http://localhost:${port}/`;
const wait = (ms) => page.waitForTimeout(ms);
const hold = async (key, ms) => { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); };

try {
  await page.goto(base);
  await wait(500);
  await page.screenshot({ path: `${out}/01-title.png` });

  await page.keyboard.press('Enter');
  await hold('KeyW', 1400);
  await page.keyboard.press('KeyJ');
  await wait(400);
  await page.screenshot({ path: `${out}/02-field-combat.png` });

  await page.goto(`${base}?scene=arena&autostart=1`);
  await wait(300);
  await hold('KeyW', 700);
  await wait(2600);
  await page.evaluate(() => { const w = globalThis.__aetherfall.world; w.player.hp = w.player.maxHp; w.glitch.value = 100; });
  await page.keyboard.press('KeyE');
  await wait(900);
  await page.screenshot({ path: `${out}/03-boss-phase1-glitch.png` });

  await page.evaluate(() => {
    const w = globalThis.__aetherfall.world;
    w.boss.hp = w.boss.maxHp * 0.45;
    w.boss.parts.antlers.hp = 0;
    w.boss.parts.antlers.broken = true;
    w.boss.interrupt('phaseShift');
    w.player.maxHp = 1e6; w.player.hp = 1e6;
    w.style.points = 1500;
  });
  await wait(4200);
  await page.screenshot({ path: `${out}/04-boss-phase2.png` });

  await page.evaluate(() => { const b = globalThis.__aetherfall.world.boss; b.hp = 1; b.fsm.change('idle'); });
  await page.evaluate(() => { const w = globalThis.__aetherfall.world; w.hitTarget(w.boss, { base: 10, poise: 0, partBreak: 0 }, { scaling: {} }, { fromX: w.boss.x, fromY: w.boss.y + 100 }); });
  await wait(5000);
  await page.screenshot({ path: `${out}/05-world-first.png` });

  const state = await page.evaluate(() => ({ state: globalThis.__aetherfall.state, bossAlive: globalThis.__aetherfall.world.boss.alive }));
  if (state.state !== 'victory' || state.bossAlive) errors.push(`unexpected end state ${JSON.stringify(state)}`);
} finally {
  await browser.close();
  server.kill();
}
if (errors.length) {
  console.error('SMOKE FAIL\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`SMOKE PASS — screenshots in ${out}/`);
