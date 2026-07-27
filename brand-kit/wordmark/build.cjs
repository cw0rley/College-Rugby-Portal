// Builds a 600x240 landscape wordmark (transparent) from the path-based header lockup.
// The "COLLEGE RUGBY PORTAL" glyphs are condensed horizontally (SX) and stretched
// vertically (SY); badge + tagline are left untouched. Artwork is auto-centered.
// Output: wordmark-600x240.svg, wordmark-600x240.png (1x), wordmark-1200x480.png (2x)
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const SRC = path.resolve(__dirname, "../../public/logo-header.svg");
const OUT_W = 600;
const OUT_H = 240;
const PAD = 44; // min horizontal padding on the 600px canvas

// Wordmark text shaping — tweak these two:
const SX = 0.84; // horizontal scale (<1 = narrower)
const SY = 1.12; // vertical scale   (>1 = taller)
const ANCHOR_X = 140; // left edge of the wordmark text in source units
const BASELINE_Y = 72; // wordmark baseline in source units

const raw = fs.readFileSync(SRC, "utf8");
const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim();

// Split off the wordmark glyph run (baseline y=72, glyph scale 0.036) from the
// badge (before it) and the tagline (baseline y=108, after it).
const firstTag = inner.indexOf("108.000");
const tagStart = inner.lastIndexOf("<g", firstTag);
const firstWord = inner.indexOf("72.000");
const wordStart = inner.lastIndexOf("<g", firstWord);

const before = inner.slice(0, wordStart); // badge
const wordmark = inner.slice(wordStart, tagStart); // COLLEGE RUGBY PORTAL glyphs
const after = inner.slice(tagStart); // tagline

// Scale wordmark around its left baseline anchor so the left edge stays put.
const shapedWordmark =
  `<g transform="translate(${ANCHOR_X} ${BASELINE_Y}) scale(${SX} ${SY}) ` +
  `translate(${-ANCHOR_X} ${-BASELINE_Y})">${wordmark}</g>`;

const art = before + shapedWordmark + after;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Phase 1: render at native source coords to measure the true artwork bbox.
  const probe = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head>
    <body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 160" width="720" height="160">
    <g id="art">${art}</g></svg></body></html>`;
  await page.setContent(probe, { waitUntil: "domcontentloaded" });
  const bb = await page.evaluate(() => {
    const b = document.getElementById("art").getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });

  // Fit-with-padding transform, centered on the 600x240 canvas.
  const scale = Math.min((OUT_W - PAD * 2) / bb.w, (OUT_H - PAD * 2) / bb.h);
  const tx = OUT_W / 2 - (bb.x + bb.w / 2) * scale;
  const ty = OUT_H / 2 - (bb.y + bb.h / 2) * scale;
  const wrap = `translate(${tx.toFixed(3)}, ${ty.toFixed(3)}) scale(${scale.toFixed(5)})`;

  const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OUT_W} ${OUT_H}" width="${OUT_W}" height="${OUT_H}">
  <g transform="${wrap}">
${art}
  </g>
</svg>
`;
  const svgPath = path.join(__dirname, "wordmark-600x240.svg");
  fs.writeFileSync(svgPath, svg);
  console.log("Wrote", svgPath);

  // Phase 2: rasterize transparent PNGs at 1x and 2x.
  for (const [w, h, name] of [
    [OUT_W, OUT_H, "wordmark-600x240.png"],
    [OUT_W * 2, OUT_H * 2, "wordmark-1200x480.png"],
  ]) {
    const scaledSvg = svg
      .replace(`width="${OUT_W}"`, `width="${w}"`)
      .replace(`height="${OUT_H}"`, `height="${h}"`);
    const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}</style></head><body>${scaledSvg}</body></html>`;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const el = await page.$("svg");
    await el.screenshot({ path: path.join(__dirname, name), omitBackground: true });
    console.log("Wrote", name, `${w}x${h}`);
  }
  await browser.close();
})();
