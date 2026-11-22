/**
 * Records the moving parts of the Goonj page as looping GIFs for the Figma
 * prototype (Figma's free plan has no video, but GIF fills play in prototypes).
 *
 *   - the six "Goonj gets you" panel videos (tinted, as on the site)
 *   - the hero's voice-wave lines (and the smoke around the photo card)
 *   - each "Why join early" card's moving pattern
 *   - the closing banner's aurora and the footer's echo rings
 *
 * The page runs at a quarter speed (CSS animations, canvas, videos) so frames
 * can be grabbed evenly; HTML text is hidden, since Figma keeps it editable.
 * Each GIF is placed by matching it to the static capture's layout.
 *
 *   node capture-anim.mjs   (after capture.mjs)  →  out/gif/*.gif + out/anims.json
 */
import fs from "node:fs";
import path from "node:path";
import gifenc from "gifenc";
import pngjs from "pngjs";
import puppeteer from "puppeteer-core";

const { GIFEncoder, applyPalette, quantize } = gifenc;
const { PNG } = pngjs;

const BASE = process.argv[2] || "http://localhost:3000";
const URL = `${BASE}/goonj/figma-capture`;
const OUT = path.resolve("out");
const GIF = path.join(OUT, "gif");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1440;
const H = 900;
const RATE = 0.25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.rmSync(GIF, { recursive: true, force: true });
fs.mkdirSync(GIF, { recursive: true });

// the helpers (text hiding, rects) live in capture.mjs; reuse them
const src = fs.readFileSync(path.resolve("capture.mjs"), "utf8");
const HELPERS = eval("(" + src.slice(src.indexOf("const HELPERS = () =>") + "const HELPERS = ".length, src.indexOf("// ---------------------------------------------------------------- node helpers")).trim().replace(/;$/, "") + ")");

// ------------------------------------------------------------------ gif
function downscale(png, w, h) {
  if (png.width === w && png.height === h) return png.data;
  const out = new Uint8Array(w * h * 4);
  const sx = png.width / w;
  const sy = png.height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // box filter over the source pixels
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * png.width + xx) * 4;
          r += png.data[i];
          g += png.data[i + 1];
          b += png.data[i + 2];
          n++;
        }
      }
      const o = (y * w + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return out;
}

function encodeGif(frames, w, h, delayMs, file) {
  // one palette for the whole loop, from a sample of every frame
  const sample = [];
  for (let f = 0; f < frames.length; f += 2) {
    const d = frames[f];
    for (let i = 0; i < d.length; i += 4 * 7) sample.push(d[i], d[i + 1], d[i + 2], 255);
  }
  const palette = quantize(new Uint8Array(sample), 255, { format: "rgb565" });
  while (palette.length < 255) palette.push([0, 0, 0]);
  palette.push([0, 0, 0]); // 255 = transparent (unchanged pixel)
  const gif = GIFEncoder();
  let prev = null;
  frames.forEach((rgba, f) => {
    const idx = applyPalette(rgba, palette.slice(0, 255), "rgb565");
    const opts = { palette, delay: delayMs, repeat: 0, dispose: 1 };
    if (prev) {
      // only what changed since the last frame; the rest stays transparent
      const delta = new Uint8Array(idx.length);
      for (let i = 0; i < idx.length; i++) delta[i] = idx[i] === prev[i] ? 255 : idx[i];
      gif.writeFrame(delta, w, h, { ...opts, transparent: true, transparentIndex: 255 });
    } else {
      gif.writeFrame(idx, w, h, opts);
    }
    prev = idx;
  });
  gif.finish();
  fs.writeFileSync(path.join(GIF, file), gif.bytes());
  return fs.statSync(path.join(GIF, file)).size;
}

/** Grabs `n` evenly spaced frames of a viewport clip, returns RGBA buffers. */
async function record(page, clip, { n, animDt, outW, outH }) {
  const frames = [];
  const realDt = animDt / RATE;
  let next = Date.now();
  for (let f = 0; f < n; f++) {
    const wait = next - Date.now();
    if (wait > 0) await sleep(wait);
    next += realDt;
    const buf = await page.screenshot({ type: "png", clip: { ...clip, y: clip.y + (await page.evaluate(() => window.scrollY)) }, captureBeyondViewport: false });
    const png = PNG.sync.read(Buffer.from(buf));
    frames.push(downscale(png, outW || png.width, outH || png.height));
  }
  return frames;
}

// ------------------------------------------------------------------ pages
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--autoplay-policy=no-user-gesture-required"] });

async function openLive() {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  // slow every rAF-driven animation (the canvas) by RATE
  await page.evaluateOnNewDocument((rate) => {
    const raf = window.requestAnimationFrame.bind(window);
    let base = null;
    window.requestAnimationFrame = (cb) =>
      raf((ts) => {
        if (base === null) base = ts;
        cb(base + (ts - base) * rate);
      });
  }, RATE);
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });
  const cdp = await page.target().createCDPSession();
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: RATE });
  await page.evaluate(HELPERS);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} header{visibility:hidden!important}" });
  await page.evaluate(async () => {
    document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
    await document.fonts.ready;
  });
  await sleep(2500);
  return page;
}

async function openStatic() {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(HELPERS);
  return page;
}

const scrollTo = async (page, y) => {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await sleep(2500);
};
const slowVideos = (page) =>
  page.evaluate((rate) => {
    for (const v of document.querySelectorAll("video")) {
      v.playbackRate = rate;
      v.play().catch(() => {});
    }
  }, RATE);

const anims = [];
const add = (name, target, rect, frames, w, h, delay) => {
  const file = `${name}.gif`;
  const size = encodeGif(frames, w, h, delay, file);
  anims.push({ target, src: file, ...rect });
  console.log(`${file}: ${frames.length} frames ${w}x${h}, ${(size / 1e6).toFixed(2)} MB`);
};

// static layout (where things sit in the captured design)
const st = await openStatic();
const S = await st.evaluate(() => {
  const hero = window.__rect('section[aria-labelledby="hero-title"]');
  const card = window.__rect("#signup ~ * [class*='card'], [class*='zoom'] [class*='card']");
  const foot = window.__rect("footer");
  const strip = window.__rect('section[aria-labelledby="hero-title"] ul');
  const banner = window.__rect("footer section[aria-labelledby='cta-title']");
  const ringsSvg = document.querySelector("footer svg[preserveAspectRatio='xMidYMax slice']");
  const rings = ringsSvg && window.__rect(ringsSvg.parentElement);
  return { hero, card, foot, banner, rings, strip };
});
await st.close();

const live = await openLive();

// ---- hero: voice-wave lines (rings repeat every 2π/1.4 s, so loop on that)
{
  await scrollTo(live, 0);
  await live.evaluate(() => window.__hideText());
  await sleep(300);
  // down to just below the promises strip, above where the photo card begins
  const h = Math.round(S.strip.y + S.strip.h - S.hero.y + 14);
  const frames = await record(live, { x: 0, y: 0, width: W, height: h }, { n: 45, animDt: 100 });
  add("hero-echo", "hero", { x: 0, y: 0, w: W, h }, frames, W, h, 100);
  await live.evaluate(() => window.__showText());
}

// ---- hero: smoke around the resting photo card
{
  const zoomTop = await live.evaluate(() => {
    const z = document.querySelector("[class*='zoom']");
    return z.getBoundingClientRect().top + window.scrollY;
  });
  await scrollTo(live, zoomTop);
  await live.evaluate(() => window.__hideText());
  const vr = await live.evaluate(() => {
    const z = document.querySelector("[class*='zoom']");
    const cs = getComputedStyle(z);
    const ix = parseFloat(cs.getPropertyValue("--ix")) || 0;
    const it = parseFloat(cs.getPropertyValue("--it")) || 0;
    return { x: ix, y: it, w: innerWidth - ix * 2, h: innerHeight - it * 2 };
  });
  const pad = { top: 28, side: 110, bottom: 80 };
  const clip = {
    x: Math.round(Math.max(0, vr.x - pad.side)),
    y: Math.round(Math.max(0, vr.y - pad.top)),
    width: Math.round(Math.min(W, vr.w + pad.side * 2)),
    height: Math.round(vr.h + pad.top + pad.bottom),
  };
  const frames = await record(live, clip, { n: 40, animDt: 100 });
  // in the static design the card sits at S.card (relative to the hero)
  add(
    "hero-smoke",
    "hero:step1",
    { x: S.card.x - (vr.x - clip.x), y: S.card.y - S.hero.y - (vr.y - clip.y), w: clip.width, h: clip.height },
    frames,
    clip.width,
    clip.height,
    100,
  );
  await live.evaluate(() => window.__showText());
}

// ---- "Why join early" cards: freeze the reel, bring each card into view
{
  const ptsTop = await live.evaluate(() => document.getElementById("points").getBoundingClientRect().top + window.scrollY);
  await scrollTo(live, ptsTop);
  await live.addStyleTag({ content: "[class*='reel'] > [class*='track']{transform:translate3d(var(--capx,0px),0,0)!important} [data-bg]{transform:scale(1.16)!important}" });
  await live.evaluate(() => window.__hideText());
  const n = await live.evaluate(() => document.querySelectorAll("#points article:not([data-dup])").length);
  for (let i = 0; i < n; i++) {
    const r = await live.evaluate((i) => {
      const a = [...document.querySelectorAll("#points article:not([data-dup])")][i];
      document.documentElement.style.setProperty("--capx", `${-(a.offsetLeft - 60)}px`);
      return null;
    }, i);
    void r;
    await sleep(600);
    const cr = await live.evaluate((i) => {
      const a = [...document.querySelectorAll("#points article:not([data-dup])")][i];
      const b = a.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
    }, i);
    const frames = await record(live, { x: cr.x, y: cr.y, width: cr.w, height: cr.h }, { n: 36, animDt: 100 });
    add(`card-${i}`, `card:${i}`, { x: 0, y: 0, w: cr.w, h: cr.h }, frames, cr.w, cr.h, 100);
  }
  await live.evaluate(() => window.__showText());
}

// ---- "Goonj gets you": each panel's tinted video, full screen
{
  const n = await live.evaluate(() => document.querySelectorAll("#why [data-panel]").length);
  for (let i = 0; i < n; i++) {
    // scroll until this panel sits at the top, fully open
    const y = await live.evaluate((i) => {
      const p = [...document.querySelectorAll("#why [data-panel]")][i];
      let t = 0;
      for (let e = p; e; e = e.offsetParent) t += e.offsetTop;
      return t;
    }, i);
    await scrollTo(live, y);
    await live.evaluate(() => window.__hideText());
    await slowVideos(live);
    await sleep(1500);
    const frames = await record(live, { x: 0, y: 0, width: W, height: H }, { n: 24, animDt: 125, outW: 768, outH: 480 });
    add(`panel-${i}`, `panel:${i}`, { x: 0, y: 0, w: W, h: H }, frames, 768, 480, 125);
    await live.evaluate(() => window.__showText());
  }
}

// ---- footer: the banner's aurora, and the echo rings
{
  const fTop = await live.evaluate(() => document.querySelector("footer").getBoundingClientRect().top + window.scrollY);
  await scrollTo(live, fTop - 40);
  await live.evaluate(() => window.__hideText());
  const b = await live.evaluate(() => window.__rect("footer section[aria-labelledby='cta-title']"));
  const sy = await live.evaluate(() => window.scrollY);
  const bv = { x: Math.round(b.x), y: Math.round(b.y - sy), w: Math.round(b.w), h: Math.round(Math.min(b.h, H - (b.y - sy))) };
  const frames = await record(live, { x: bv.x, y: bv.y, width: bv.w, height: bv.h }, { n: 32, animDt: 125 });
  add("banner", "footer", { x: S.banner.x - S.foot.x, y: S.banner.y - S.foot.y, w: bv.w, h: bv.h }, frames, Math.round(bv.w), Math.round(bv.h), 125);

  const rTop = await live.evaluate(() => {
    const s = document.querySelector("footer svg[preserveAspectRatio='xMidYMax slice']").parentElement;
    return s.getBoundingClientRect().top + window.scrollY;
  });
  await scrollTo(live, rTop - 60);
  const rr = await live.evaluate(() => {
    const s = document.querySelector("footer svg[preserveAspectRatio='xMidYMax slice']").parentElement;
    const b = s.getBoundingClientRect();
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
  });
  const rf = await record(live, { x: Math.max(0, rr.x), y: rr.y, width: Math.min(W, rr.w), height: rr.h }, { n: 50, animDt: 100 });
  add("rings", "footer", { x: S.rings.x - S.foot.x + Math.max(0, -rr.x), y: S.rings.y - S.foot.y, w: Math.min(W, rr.w), h: rr.h }, rf, Math.min(W, rr.w), rr.h, 100);
  await live.evaluate(() => window.__showText());
}

await browser.close();
fs.writeFileSync(path.join(OUT, "anims.json"), JSON.stringify(anims));
const total = fs.readdirSync(GIF).reduce((a, f) => a + fs.statSync(path.join(GIF, f)).size, 0);
console.log(`${anims.length} GIFs, ${(total / 1e6).toFixed(1)} MB`);
