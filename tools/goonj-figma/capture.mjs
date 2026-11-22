/**
 * Captures the Goonj campaign page (desktop, 1440 wide) for the Figma plugin.
 *
 * For every region it records:
 *   - the visuals as JPEG tiles (≤ 1800 css px tall, rendered at 2x) with all
 *     HTML text made transparent, so text can be rebuilt as editable layers;
 *   - every visible line of text: position, font, size, weight, colour,
 *     tracking, alignment, strike-through, mixed styles within a block;
 *   - hotspot rectangles for the things you can click.
 *
 * It also steps through the interactive states: the sign-up form (step 1,
 * step 2, success), the ten testimonials, and each "Why join early" card.
 *
 * Needs the dev server running and the route
 * apps/web/app/goonj/figma-capture (dev only: the live page in preview mode).
 *
 *   node capture.mjs [baseUrl]   →  out/data.json + out/img/*.jpg
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const URL = `${BASE}/goonj/figma-capture`;
const OUT = path.resolve("out");
const IMG = path.join(OUT, "img");
const W = 1440;
const H = 900;
const DPR = 2;
const TILE = 1800;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(IMG, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let imgCount = 0;

// ---------------------------------------------------------------- in-page helpers
const HELPERS = () => {
  const TEXTY = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "BLOCKQUOTE", "FIGCAPTION", "DT", "DD", "BUTTON"]);
  const PARA = "h1,h2,h3,h4,h5,h6,p,blockquote";

  // text set in perspective (the phone splash) stays in the image
  const in3d = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (getComputedStyle(e).transform.startsWith("matrix3d")) return true;
    }
    return false;
  };
  window.__in3d = in3d;
  const isInline = (d) => d === "inline" || d === "contents";

  const blockOf = (node) => {
    let el = node.parentElement;
    while (el) {
      if (el.closest("svg")) return null; // SVG text stays in the image
      const d = getComputedStyle(el).display;
      if (TEXTY.has(el.tagName)) return el;
      // anything inside a heading/paragraph (word masks, flex words) belongs to it
      if (!el.matches(PARA) && el.parentElement && el.parentElement.closest(PARA)) {
        el = el.parentElement;
        continue;
      }
      if (!isInline(d)) return el;
      el = el.parentElement;
    }
    return null;
  };

  const parseColor = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return [1, 1, 1, 1];
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
  };

  // gradient text (background-clip: text): take the gradient's middle colour
  const gradientColor = (el) => {
    let e = el;
    while (e && e !== document.body) {
      const cs = getComputedStyle(e);
      if ((cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") && cs.backgroundImage !== "none") {
        const cols = cs.backgroundImage.match(/rgba?\([^)]+\)/g);
        if (cols && cols.length) return parseColor(cols[Math.floor(cols.length / 2)]);
      }
      e = e.parentElement;
    }
    return null;
  };

  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none") return 0;
      o *= Number(cs.opacity);
    }
    return o;
  };

  // visible part of a rect after every overflow-clipping ancestor
  const clipRect = (el, r) => {
    let { left, top, right, bottom } = r;
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const b = e.getBoundingClientRect();
        if (cs.overflowX !== "visible") {
          left = Math.max(left, b.left);
          right = Math.min(right, b.right);
        }
        if (cs.overflowY !== "visible") {
          top = Math.max(top, b.top);
          bottom = Math.min(bottom, b.bottom);
        }
      }
    }
    return { left, top, right, bottom, w: right - left, h: bottom - top };
  };

  const decoLine = (el, block) => {
    for (let e = el; e && e !== block.parentElement; e = e.parentElement) {
      if (getComputedStyle(e).textDecorationLine.includes("line-through")) return true;
    }
    return false;
  };

  /** All visible text inside `root`, grouped into blocks, in page coordinates. */
  window.__extractText = (rootSel, excludeSels = []) => {
    const root = typeof rootSel === "string" ? document.querySelector(rootSel) : rootSel;
    if (!root) return [];
    const excl = excludeSels.flatMap((s) => [...document.querySelectorAll(s)]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const blocks = new Map();
    const sy = window.scrollY;
    const sx = window.scrollX;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.trim()) {
        // a space between words keeps its place inside a block we've started
        const b0 = n.parentElement && blockOf(n);
        const bb = b0 && blocks.get(b0);
        if (bb && bb.segs.length && !/\s$/.test(bb.segs.at(-1).t)) bb.segs.at(-1).t += " ";
        continue;
      }
      const parent = n.parentElement;
      if (!parent || excl.some((x) => x.contains(parent))) continue;
      if (parent.closest("script,style,noscript,svg,[hidden]")) continue;
      if (in3d(parent)) continue;
      const block = blockOf(n);
      if (!block) continue;
      const op = opacityOf(parent);
      if (op < 0.05) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
      if (!rects.length) continue;
      const vis = rects.map((r) => clipRect(parent, r)).filter((c) => c.w > 1 && c.h > 2);
      const area = vis.reduce((a, c) => a + c.w * c.h, 0);
      const full = rects.reduce((a, r) => a + r.width * r.height, 0);
      if (area / full < 0.5) continue;
      const cs = getComputedStyle(parent);
      const color = gradientColor(parent) || parseColor(cs.color);
      color[3] *= op;
      const tt = cs.textTransform;
      let text = n.data.replace(/\s+/g, " ");
      if (tt === "uppercase") text = text.toUpperCase();
      const seg = {
        t: text,
        color,
        size: parseFloat(cs.fontSize),
        weight: Number(cs.fontWeight),
        ls: cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing),
        italic: cs.fontStyle === "italic",
        strike: decoLine(parent, block),
        family: cs.fontFamily,
      };
      if (!blocks.has(block)) blocks.set(block, { segs: [], rects: [], last: null });
      const b = blocks.get(block);
      // visibly apart from the previous piece (CSS gaps, new line): add a space
      if (b.last) {
        const f = rects[0];
        const apart = Math.abs(f.top - b.last.top) > seg.size * 0.5 || f.left - b.last.right > seg.size * 0.12;
        const prev = b.segs.at(-1);
        if (apart && !/\s$/.test(prev.t) && !/^\s/.test(seg.t)) prev.t += " ";
      }
      b.segs.push(seg);
      b.rects.push(...rects);
      b.last = rects.at(-1);
    }
    const out = [];
    for (const [block, b] of blocks) {
      const cs = getComputedStyle(block);
      const left = Math.min(...b.rects.map((r) => r.left));
      const top = Math.min(...b.rects.map((r) => r.top));
      const right = Math.max(...b.rects.map((r) => r.right));
      const bottom = Math.max(...b.rects.map((r) => r.bottom));
      const lines = new Set(b.rects.map((r) => Math.round(r.top))).size;
      // tidy whitespace across segments
      const segs = b.segs.map((s) => ({ ...s }));
      segs[0].t = segs[0].t.replace(/^\s+/, "");
      segs[segs.length - 1].t = segs[segs.length - 1].t.replace(/\s+$/, "");
      for (let i = 1; i < segs.length; i++) {
        if (/\s$/.test(segs[i - 1].t) && /^\s/.test(segs[i].t)) segs[i].t = segs[i].t.replace(/^\s+/, "");
      }
      const lh = cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight);
      let align = cs.textAlign;
      if (align === "start" || align === "-webkit-auto") align = "left";
      if (align === "end") align = "right";
      // a centred flex/grid label is centred even if text-align says left
      out.push({
        x: left + sx,
        y: top + sy,
        w: right - left,
        h: bottom - top,
        lines,
        lineHeight: lh,
        align: ["left", "center", "right", "justify"].includes(align) ? align : "left",
        segs: segs.filter((s) => s.t.length),
      });
    }
    return out.filter((t) => t.segs.length);
  };

  // Make all HTML text invisible (keeping layout), leave icons and SVG text alone.
  window.__hideText = () => {
    window.__pins = [];
    // keep perspective text visible in the image
    for (const el of document.querySelectorAll("body *")) {
      if (el.childElementCount === 0 && el.textContent.trim() && window.__in3d(el)) {
        const c = getComputedStyle(el).color;
        el.style.setProperty("color", c, "important");
        el.style.setProperty("-webkit-text-fill-color", c, "important");
        window.__pins.push([el, "color"], [el, "-webkit-text-fill-color"]);
      }
    }
    for (const svg of document.querySelectorAll("svg")) {
      const c = getComputedStyle(svg).color;
      svg.style.setProperty("color", c, "important");
      window.__pins.push([svg, "color"]);
    }
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if ((cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") && cs.backgroundImage !== "none") {
        el.style.setProperty("background-image", "none", "important");
        window.__pins.push([el, "background-image"]);
      }
    }
    const st = document.createElement("style");
    st.id = "__hide";
    st.textContent = `
      body *:not(svg):not(svg *) { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }
      ::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; }`;
    document.head.appendChild(st);
  };
  window.__showText = () => {
    document.getElementById("__hide")?.remove();
    for (const [el, prop] of window.__pins || []) el.style.removeProperty(prop);
    window.__pins = [];
  };

  // Placeholders of empty inputs, as text blocks.
  window.__placeholders = (rootSel) => {
    const root = document.querySelector(rootSel);
    if (!root) return [];
    return [...root.querySelectorAll("input[placeholder], input")]
      .filter((i) => i.type !== "hidden" && i.type !== "checkbox" && !i.value && i.offsetParent)
      .map((i) => {
        const label = i.placeholder || i.getAttribute("aria-label") || i.closest("label")?.textContent || "";
        const ph = getComputedStyle(i, "::placeholder");
        const cs = getComputedStyle(i);
        const r = i.getBoundingClientRect();
        if (!label.trim() || r.width < 4) return null;
        const pl = parseFloat(cs.paddingLeft);
        return {
          x: r.left + pl + window.scrollX,
          y: r.top + (r.height - parseFloat(cs.fontSize) * 1.25) / 2 + window.scrollY,
          w: r.width - pl * 2,
          h: parseFloat(cs.fontSize) * 1.25,
          lines: 1,
          lineHeight: null,
          align: "left",
          segs: [
            {
              t: label.trim(),
              color: (() => {
                const m = ph.color.match(/rgba?\(([^)]+)\)/);
                const p = m ? m[1].split(/[ ,/]+/).map(Number) : [250, 248, 245, 0.4];
                return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
              })(),
              size: parseFloat(cs.fontSize),
              weight: Number(cs.fontWeight),
              ls: 0,
              italic: false,
              strike: false,
              family: cs.fontFamily,
            },
          ],
        };
      })
      .filter(Boolean);
  };

  window.__rect = (el) => {
    const e = typeof el === "string" ? document.querySelector(el) : el;
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
  };
};

// ---------------------------------------------------------------- node helpers
async function open(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate(HELPERS);
  await page.addStyleTag({
    content: `nextjs-portal{display:none!important} header{visibility:hidden!important}
      [class*="previewNote"]{display:none!important}`,
  });
  // load every lazy image
  await page.evaluate(async () => {
    document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await sleep(1500);
  return page;
}

/** Text + JPEG tiles for a page-coordinate region; texts made region-relative. */
async function capture(page, region, { textRoot, exclude = [], hide = [], extra = [] } = {}) {
  let texts = await page.evaluate((r, ex) => window.__extractText(r, ex), textRoot, exclude);
  for (const e of extra) texts = texts.concat(await page.evaluate((s) => window.__placeholders(s), e));
  const hideTag = hide.length
    ? await page.addStyleTag({ content: `${hide.join(",")}{visibility:hidden!important}` })
    : null;
  await page.evaluate(() => window.__hideText());
  await sleep(250);
  const tiles = [];
  for (let y = 0; y < region.h; y += TILE) {
    const h = Math.min(TILE, region.h - y);
    const file = `t${String(imgCount++).padStart(3, "0")}.jpg`;
    await page.screenshot({
      path: path.join(IMG, file),
      type: "jpeg",
      quality: 82,
      captureBeyondViewport: true,
      clip: { x: region.x, y: region.y + y, width: region.w, height: h },
    });
    tiles.push({ y, h, src: file });
  }
  await page.evaluate(() => window.__showText());
  if (hideTag) await hideTag.evaluate((n) => n.remove());
  return {
    w: Math.round(region.w),
    h: Math.round(region.h),
    tiles,
    texts: texts
      .filter((t) => t.y + t.h > region.y && t.y < region.y + region.h && t.x + t.w > region.x && t.x < region.x + region.w)
      .map((t) => ({ ...t, x: t.x - region.x, y: t.y - region.y })),
  };
}

const rel = (r, region) => r && { x: r.x - region.x, y: r.y - region.y, w: r.w, h: r.h };

// ---------------------------------------------------------------- run
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const data = { width: W, viewport: H, sections: [], hero: {}, wall: {}, reel: {}, nav: {}, footer: {} };

{
  const page = await open(browser);

  // nav: rebuilt natively in Figma; just the labels and targets
  data.nav = await page.evaluate(() => ({
    links: [...document.querySelectorAll("header nav a")].map((a) => ({ label: a.textContent.trim(), target: a.getAttribute("href").slice(1) })),
    logo: window.__rect("header a[aria-label]"),
    pill: window.__rect("header nav"),
  }));
  data.nav.logo.y = 18;
  data.nav.pill.y = 14;

  // ---- hero, step 1
  const heroSel = 'section[aria-labelledby="hero-title"]';
  const heroR = await page.evaluate((s) => window.__rect(s), heroSel);
  const s1 = await capture(page, heroR, { textRoot: heroSel, extra: [heroSel] });
  s1.hot = {
    next: rel(await page.evaluate(() => window.__rect([...document.querySelectorAll("#signup button")].find((b) => /count me in|continue/i.test(b.textContent)) || "#signup button[type]")), heroR),
  };
  data.hero.step1 = s1;

  // ---- stories: ten states (Next = the next person)
  const storiesR = await page.evaluate(() => window.__rect("#stories"));
  data.wall.states = [];
  for (let k = 0; k < 10; k++) {
    const st = await capture(page, storiesR, { textRoot: "#stories" });
    st.featured = await page.evaluate(() => document.querySelector("#stories figcaption span")?.textContent?.trim());
    st.hot = {
      next: rel(await page.evaluate(() => window.__rect('#stories button[aria-label="Next story"]')), storiesR),
      prev: rel(await page.evaluate(() => window.__rect('#stories button[aria-label="Previous story"]')), storiesR),
      tiles: await page.evaluate(
        (sr) =>
          [...document.querySelectorAll('#stories button[aria-label^="Read "]')].map((b) => {
            const r = window.__rect(b);
            return { x: r.x - sr.x, y: r.y - sr.y, w: r.w, h: r.h, name: b.getAttribute("aria-label").replace(/^Read |'s story$/g, "") };
          }),
        storiesR,
      ),
    };
    data.wall.states.push(st);
    await page.click('#stories button[aria-label="Next story"]');
    await sleep(900);
  }

  // ---- points: heading only (the reel is rebuilt from the cards)
  const pointsR = await page.evaluate(() => window.__rect("#points"));
  const reelSel = "#points [class*='reel']";
  const pts = await capture(page, pointsR, { textRoot: "#points", exclude: [reelSel], hide: [reelSel] });
  const reelR = await page.evaluate((s) => window.__rect(s), reelSel);
  data.reel.y = reelR.y - pointsR.y;
  data.sections.push({ key: "points", name: "Why join early", ...pts });

  // ---- reel cards (first set only), each captured on its own
  data.reel.cards = [];
  const n = await page.evaluate(() => [...document.querySelectorAll("#points article:not([data-dup])")].length);
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate((i) => {
      const a = [...document.querySelectorAll("#points article:not([data-dup])")][i];
      const reel = a.closest("[class*='reel']");
      reel.scrollLeft = a.offsetLeft - 40;
      a.setAttribute("data-cap", String(i));
      return null;
    }, i);
    await sleep(300);
    const cr = await page.evaluate((i) => window.__rect(`#points article[data-cap="${i}"]`), i);
    const c = await capture(page, cr, { textRoot: `#points article[data-cap="${i}"]` });
    data.reel.cards.push(c);
  }
  data.reel.gap = await page.evaluate(() => {
    const a = [...document.querySelectorAll("#points article:not([data-dup])")];
    return a.length > 1 ? a[1].offsetLeft - a[0].offsetLeft - a[0].offsetWidth : 18;
  });

  // ---- why: intro + six sticky panels
  const introR = await page.evaluate(() => window.__rect("#why > div:first-child"));
  data.sections.push({ key: "why", name: "Goonj gets you", ...(await capture(page, introR, { textRoot: "#why > div:first-child" })) });
  const panels = await page.evaluate(() => document.querySelectorAll("#why [data-panel]").length);
  for (let i = 0; i < panels; i++) {
    const sel = `#why [data-panel]:nth-of-type(${i + 1})`;
    const pr = await page.evaluate((i) => window.__rect([...document.querySelectorAll("#why [data-panel]")][i]), i);
    await page.evaluate((i) => [...document.querySelectorAll("#why [data-panel]")][i].setAttribute("data-cap-panel", i), i);
    const c = await capture(page, pr, { textRoot: `#why [data-cap-panel="${i}"]` });
    data.sections.push({ key: `panel${i}`, name: `Goonj gets you · ${i + 1}`, sticky: true, ...c });
    void sel;
  }

  // ---- footer (banner, links, echo rings)
  const footR = await page.evaluate(() => window.__rect("footer"));
  const foot = await capture(page, footR, { textRoot: "footer" });
  foot.hot = { cta: rel(await page.evaluate(() => window.__rect('footer a[href="#signup"]')), footR) };
  data.sections.push({ key: "footer", name: "Footer", ...foot });
  await page.close();
}

{
  // ---- hero, step 2 (preview mode steps without signing anyone up)
  const page = await open(browser);
  const heroSel = 'section[aria-labelledby="hero-title"]';
  await page.evaluate(() => [...document.querySelectorAll("#signup button")].find((b) => /count me in|continue/i.test(b.textContent))?.click());
  await sleep(1200);
  const heroR = await page.evaluate((s) => window.__rect(s), heroSel);
  const s2 = await capture(page, heroR, { textRoot: heroSel, extra: [heroSel] });
  s2.hot = {
    back: rel(await page.evaluate(() => window.__rect('#signup button[aria-label^="Back"]')), heroR),
    submit: rel(await page.evaluate(() => window.__rect('#signup button[type="submit"]')), heroR),
  };
  data.hero.step2 = s2;

  // ---- hero, success: swap the success pass into the form slot
  await page.evaluate(() => {
    const slot = document.getElementById("signup");
    const pass = document.querySelector("#capture-success > *");
    slot.replaceChildren(pass);
  });
  await sleep(1500);
  const heroR3 = await page.evaluate((s) => window.__rect(s), heroSel);
  data.hero.success = await capture(page, heroR3, { textRoot: heroSel });
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "data.json"), JSON.stringify(data));
const bytes = fs.readdirSync(IMG).reduce((a, f) => a + fs.statSync(path.join(IMG, f)).size, 0);
console.log(`captured ${imgCount} tiles, ${(bytes / 1e6).toFixed(1)} MB`);
console.log(
  "hero:",
  Object.fromEntries(Object.entries(data.hero).map(([k, v]) => [k, `${v.h}px, ${v.texts.length} texts`])),
  "| wall states:",
  data.wall.states.length,
  "| cards:",
  data.reel.cards.length,
  "| sections:",
  data.sections.map((s) => `${s.key}:${s.h}`).join(" "),
);
