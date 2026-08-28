import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const fails = [];
const ok = [];
const check = (cond, msg) => (cond ? ok.push(msg) : fails.push(msg));

async function openScene(size) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4173/#heart-failure', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  return page;
}

// --- chapter layout across viewports
for (const [name, size] of Object.entries({
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
  lowHeight: { width: 1440, height: 560 },
})) {
  const page = await openScene(size);
  await page.click('button:has-text("Story")');
  await page.waitForTimeout(2200);
  const boxes = await page.$$eval('.story-chapter .story-chapter-name', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, right: r.right, text: el.innerText.trim() };
    })
  );
  const track = await page.$eval('.story-track', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, right: r.right };
  }).catch(() => null);

  if (!boxes.length) { fails.push(`${name}: no chapter labels found`); }
  for (let i = 1; i < boxes.length; i++) {
    check(boxes[i].x >= boxes[i - 1].right - 0.5,
      `${name}: chapters "${boxes[i-1].text}" / "${boxes[i].text}" do not overlap`);
  }
  if (track) {
    check(boxes.every((b) => b.x >= track.x - 1), `${name}: no chapter runs off the track's left edge`);
    check(boxes.every((b) => b.right <= track.right + 1), `${name}: no chapter runs off the right edge`);
    check(boxes.every((b) => b.x >= -1 && b.right <= size.width + 1), `${name}: all chapters inside the viewport`);
  }

  // low viewport: elements we deliberately hide must stay hidden
  if (name === 'lowHeight') {
    const visible = await page.$$eval('.stage-summary, .stage-summary-ja, .disclaimer-en, .story-note',
      (els) => els.filter((el) => getComputedStyle(el).display !== 'none').map((el) => el.className));
    check(visible.length === 0, `lowHeight: secondary UI stays hidden (leaked: ${visible.join(', ') || 'none'})`);
  }

  // Japanese caption must be primary typography, not a subtitle
  const caption = await page.$eval('.story-caption-text.lang-ja', (el) => {
    const s = getComputedStyle(el);
    return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight, 10), display: s.display };
  }).catch(() => null);
  const en = await page.$eval('.story-caption-text.lang-en', (el) => {
    const s = getComputedStyle(el);
    return { size: parseFloat(s.fontSize), weight: parseInt(s.fontWeight, 10) };
  }).catch(() => null);
  if (caption && en) {
    check(caption.size >= en.size - 0.6 && caption.weight >= en.weight,
      `${name}: JA caption is primary typography (${caption.size}px/${caption.weight} vs EN ${en.size}px/${en.weight})`);
  }
  await page.close();
}

// --- language switch round trip with the timeline stopped
{
  const page = await openScene({ width: 1440, height: 900 });
  await page.click('button:has-text("Story")');
  await page.waitForTimeout(2000);
  // Drive to the completion screen: the timeline is genuinely stopped there,
  // which is both the state the stale-kicker bug appeared in and the only
  // state where two reads a second apart are comparable at all.
  const track = await page.$('.story-track');
  const box = await track.boundingBox();
  await page.mouse.click(box.x + box.width * 0.995, box.y + box.height / 2);
  await page.waitForTimeout(4000);
  const read = async () => page.evaluate(() => {
    // checkVisibility walks ancestors. Testing only the element's own display
    // reported hidden text as visible: on the completion screen the timeline
    // row is hidden as a whole, and innerText on an unrendered subtree falls
    // back to textContent, which is every language at once.
    const shown = (sel) => [...document.querySelectorAll(sel)]
      .filter((el) => el.checkVisibility())
      .map((el) => (el.innerText || el.textContent).trim())
      .filter(Boolean);
    return {
      lang: document.querySelector('#ui').dataset.lang,
      title: shown('.brand-title, .brand h1, header h1'),
      caption: shown('.story-caption-text'),
      part: shown('.story-part'),
      chapters: shown('.story-chapter-name > span'),
      cta: shown('.story-leave > span'),
      complete: shown('.story-complete span'),
      note: shown('.story-note'),
    };
  });
  const ja1 = await read();
  await page.click('button[title="Language / 表示言語"]');
  await page.waitForTimeout(500);
  const enState = await read();
  await page.click('button[title="Language / 表示言語"]');
  await page.waitForTimeout(500);
  const ja2 = await read();

  check(enState.lang === 'en', `language switches to EN (got ${enState.lang})`);
  check(ja2.lang === 'ja', `language switches back to JA (got ${ja2.lang})`);
  check(JSON.stringify(ja1) === JSON.stringify(ja2),
    'JA -> EN -> JA returns every visible story string to its Japanese form');
  // and no Japanese leaks into the EN view, or vice versa
  const hasJa = (s) => /[぀-ヿ一-龯]/.test(s);
  const leaked = enState.caption.concat(enState.part, enState.chapters, enState.cta, enState.complete)
    .filter((s) => hasJa(s));
  check(leaked.length === 0, `EN view shows no stale Japanese (leaked: ${JSON.stringify(leaked)})`);
  check(ja2.part.every(hasJa), `JA view shows no stale English (part=${JSON.stringify(ja2.part)})`);

  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.waitForTimeout(500);
  check(errors.length === 0, `no console errors (${errors.join(' | ')})`);
  await page.close();
}

await browser.close();
console.log(ok.map((m) => 'PASS  ' + m).join('\n'));
if (fails.length) { console.log('\n' + fails.map((m) => 'FAIL  ' + m).join('\n')); process.exit(1); }
console.log(`\nall ${ok.length} UI checks passed`);
