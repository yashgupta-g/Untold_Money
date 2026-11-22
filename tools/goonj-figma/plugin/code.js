// Goonj campaign page → interactive Figma prototype.
// Receives the captured page (data + images) from ui.html and builds:
//   • components: Hero (Step 1 / Step 2 / Success), Stories (one per person),
//     six reel cards, Reel (seven looping positions)
//   • "Desktop — Goonj" : the page as an auto-layout frame, with a fixed glass
//     nav, sticky "Goonj gets you" panels and every interaction wired up.

figma.showUI(__html__, { width: 380, height: 120 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "error") {
    figma.notify("Start the local server first: in tools/goonj-figma run  node serve.mjs", { timeout: 10000, error: true });
    return;
  }
  if (msg.type !== "build") return;
  try {
    await build(msg.data, msg.images);
    figma.closePlugin("Goonj page built. Press Play (▶) on “Desktop — Goonj” to try it.");
  } catch (e) {
    console.error(e);
    figma.closePlugin("Build failed: " + (e && e.message ? e.message : String(e)));
  }
};

// ------------------------------------------------------------------ fonts
const STYLE_NAMES = {
  200: ["Extralight", "ExtraLight", "Extra Light", "Light"],
  300: ["Light"],
  400: ["Regular"],
  500: ["Medium"],
  600: ["Semibold", "SemiBold", "Semi Bold", "Medium"],
  700: ["Bold", "Semibold", "SemiBold", "Semi Bold"],
};
let FAMILY = "Inter";
let AVAILABLE = new Set();
const loaded = new Set();

async function setupFonts() {
  const list = await figma.listAvailableFontsAsync();
  AVAILABLE = new Set(list.map((f) => f.fontName.family + "|" + f.fontName.style));
  FAMILY = list.some((f) => f.fontName.family === "General Sans") ? "General Sans" : "Inter";
}

function fontFor(weight) {
  const w = Math.min(700, Math.max(200, Math.round((weight || 400) / 100) * 100));
  const tries = (STYLE_NAMES[w] || ["Regular"]).concat(["Regular"]);
  for (const style of tries) if (AVAILABLE.has(FAMILY + "|" + style)) return { family: FAMILY, style };
  return { family: "Inter", style: "Regular" };
}

async function load(fn) {
  const k = fn.family + "|" + fn.style;
  if (loaded.has(k)) return;
  await figma.loadFontAsync(fn);
  loaded.add(k);
}

// ------------------------------------------------------------------ helpers
let HASH = {};

function solid(c) {
  return { type: "SOLID", color: { r: c[0], g: c[1], b: c[2] }, opacity: c[3] === undefined ? 1 : c[3] };
}

function imageRect(src, x, y, w, h, name) {
  const r = figma.createRectangle();
  r.name = name || "image";
  r.resize(Math.max(1, w), Math.max(1, h));
  r.x = x;
  r.y = y;
  r.fills = [{ type: "IMAGE", imageHash: HASH[src], scaleMode: "FILL" }];
  return r;
}

async function makeText(spec) {
  const t = figma.createText();
  const chars = spec.segs.map((s) => s.t).join("");
  for (const s of spec.segs) await load(fontFor(s.weight));
  await load(fontFor(spec.segs[0].weight));
  t.fontName = fontFor(spec.segs[0].weight);
  t.characters = chars;
  let i = 0;
  for (const s of spec.segs) {
    const a = i;
    const b = i + s.t.length;
    i = b;
    if (b <= a) continue;
    t.setRangeFontName(a, b, fontFor(s.weight));
    t.setRangeFontSize(a, b, Math.max(1, s.size));
    t.setRangeFills(a, b, [solid(s.color)]);
    if (s.ls) t.setRangeLetterSpacing(a, b, { unit: "PIXELS", value: s.ls });
    if (s.strike) t.setRangeTextDecoration(a, b, "STRIKETHROUGH");
  }
  const align = { left: "LEFT", center: "CENTER", right: "RIGHT", justify: "JUSTIFIED" }[spec.align] || "LEFT";
  t.textAlignHorizontal = align;
  const lineBox = spec.h / Math.max(1, spec.lines);
  if (spec.lineHeight) t.lineHeight = { unit: "PIXELS", value: spec.lineHeight };
  if (spec.lines > 1) {
    t.textAutoResize = "HEIGHT";
    t.resize(Math.ceil(spec.w) + 4, t.height);
    t.x = spec.x - 2;
  } else {
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    // keep centred / right-aligned single lines anchored where they were
    if (align === "CENTER") t.x = spec.x + spec.w / 2 - t.width / 2;
    else if (align === "RIGHT") t.x = spec.x + spec.w - t.width;
    else t.x = spec.x;
  }
  const lh = spec.lineHeight || lineBox;
  t.y = spec.y - (lh - lineBox) / 2;
  t.name = chars.length > 40 ? chars.slice(0, 40) + "…" : chars;
  return t;
}

/** An animated GIF layer; `cropH` shows only its top part (cropped, not squashed). */
function gifRect(a, cropH) {
  const h = cropH ? Math.min(cropH, a.h) : a.h;
  const r = figma.createRectangle();
  r.name = "Animation · " + a.src.replace(/\.gif$/, "");
  r.resize(Math.max(1, a.w), Math.max(1, h));
  r.x = a.x;
  r.y = a.y;
  r.fills = [
    cropH
      ? { type: "IMAGE", imageHash: HASH[a.src], scaleMode: "CROP", imageTransform: [[1, 0, 0], [0, h / a.h, 0]] }
      : { type: "IMAGE", imageHash: HASH[a.src], scaleMode: "FILL" },
  ];
  return r;
}

/** Background tiles (+ animations on top) and editable text, into `parent`. */
async function fill(parent, region, anims, cropH) {
  const bg = figma.createFrame();
  bg.name = "Visual";
  bg.fills = [];
  bg.resize(region.w, region.h);
  bg.clipsContent = false;
  for (const t of region.tiles) bg.appendChild(imageRect(t.src, 0, t.y, region.w, t.h, "tile"));
  for (const a of anims || []) bg.appendChild(gifRect(a, cropH));
  bg.locked = true;
  parent.appendChild(bg);
  const texts = figma.createFrame();
  texts.name = "Text";
  texts.fills = [];
  texts.resize(region.w, region.h);
  texts.clipsContent = false;
  for (const spec of region.texts) texts.appendChild(await makeText(spec));
  parent.appendChild(texts);
}

function hotspot(parent, r, name) {
  const h = figma.createRectangle();
  h.name = "Hotspot · " + name;
  h.resize(Math.max(1, r.w), Math.max(1, r.h));
  h.x = r.x;
  h.y = r.y;
  h.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0 }];
  h.cornerRadius = Math.min(r.h / 2, 28);
  parent.appendChild(h);
  return h;
}

const ease = (type) => ({ type });
const changeTo = (dest, duration, easing) => ({
  type: "NODE",
  destinationId: dest.id,
  navigation: "CHANGE_TO",
  transition: duration === 0 ? null : { type: "SMART_ANIMATE", easing: ease(easing || "EASE_OUT"), duration: duration || 0.4 },
  preserveScrollPosition: true,
});
const scrollTo = (dest) => ({
  type: "NODE",
  destinationId: dest.id,
  navigation: "SCROLL_TO",
  transition: { type: "SCROLL_ANIMATE", easing: ease("EASE_IN_AND_OUT"), duration: 0.7 },
  preserveScrollPosition: false,
});
async function onClick(node, action) {
  await node.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [action] }]);
}

function component(name, w, h) {
  const c = figma.createComponent();
  c.name = name;
  c.resize(w, h);
  c.fills = [];
  c.clipsContent = true;
  return c;
}

function variantSet(page, comps, name, x, y) {
  let cx = 0;
  for (const c of comps) {
    c.x = cx;
    c.y = 0;
    cx += c.width + 80;
  }
  const set = figma.combineAsVariants(comps, page);
  set.name = name;
  set.x = x;
  set.y = y;
  set.fills = [{ type: "SOLID", color: { r: 0.06, g: 0.07, b: 0.08 } }];
  return set;
}

function labelFrame(name, w, h, bg) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, h);
  f.fills = bg ? [solid(bg)] : [];
  f.clipsContent = true;
  return f;
}

// ------------------------------------------------------------------ build
async function build(data, images) {
  await setupFonts();
  for (const k of Object.keys(images)) HASH[k] = figma.createImage(images[k]).hash;

  // A new page if the plan allows; otherwise (Starter: 3 pages max) build on
  // the current page, to the right of whatever is already there.
  let page;
  let originX = 0;
  try {
    page = figma.createPage();
    page.name = "Goonj · Limited release (prototype)";
    await figma.setCurrentPageAsync(page);
  } catch (e) {
    page = figma.currentPage;
    await page.loadAsync();
    for (const n of page.children) originX = Math.max(originX, n.x + n.width + 400);
  }
  const W = data.width;
  const INK = [1 / 255, 13 / 255, 18 / 255, 1];
  const LIB_X = originX + W + 400;

  // ---- Hero: Step 1 / Step 2 / Success
  const heroComps = [];
  const heroStates = [
    ["State=Step 1", data.hero.step1],
    ["State=Step 2", data.hero.step2],
    ["State=Success", data.hero.success],
  ];
  const A = data.anims || [];
  const anim = (t) => A.filter((a) => a.target === t);
  for (const [n, st] of heroStates) {
    const c = component(n, W, st.h);
    c.fills = [solid(INK)];
    if (n === "State=Step 1") {
      await fill(c, st, anim("hero").concat(anim("hero:step1")));
    } else {
      // the form grows in steps 2/3, so the moving lines stay above it
      await fill(c, st, anim("hero"), 400);
    }
    heroComps.push(c);
  }
  const hotNext = hotspot(heroComps[0], data.hero.step1.hot.next, "Count me in");
  const hotBack = hotspot(heroComps[1], data.hero.step2.hot.back, "Back");
  const hotSubmit = hotspot(heroComps[1], data.hero.step2.hot.submit, "Request early access");
  const heroSet = variantSet(page, heroComps, "Hero · sign-up", LIB_X, 0);
  await onClick(hotNext, changeTo(heroComps[1], 0.45));
  await onClick(hotBack, changeTo(heroComps[0], 0.4));
  await onClick(hotSubmit, changeTo(heroComps[2], 0.5));

  // ---- Stories: one variant per featured person
  const wallComps = [];
  for (const st of data.wall.states) {
    const c = component("Person=" + st.featured, W, st.h);
    c.fills = [solid(INK)];
    await fill(c, st);
    wallComps.push(c);
  }
  const wallSet = variantSet(page, wallComps, "Stories · testimonial wall", LIB_X, heroSet.y + heroSet.height + 400);
  const byName = {};
  data.wall.states.forEach((st, i) => (byName[st.featured] = wallComps[i]));
  for (let i = 0; i < wallComps.length; i++) {
    const st = data.wall.states[i];
    const c = wallComps[i];
    const n = wallComps.length;
    if (st.hot.next) await onClick(hotspot(c, st.hot.next, "Next story"), changeTo(wallComps[(i + 1) % n], 0.55));
    if (st.hot.prev) await onClick(hotspot(c, st.hot.prev, "Previous story"), changeTo(wallComps[(i - 1 + n) % n], 0.55));
    for (const t of st.hot.tiles || []) {
      const dest = byName[t.name];
      if (dest) await onClick(hotspot(c, t, t.name), changeTo(dest, 0.55));
    }
  }

  // ---- Reel cards
  const cards = data.reel.cards;
  const cardComps = [];
  let cy = wallSet.y + wallSet.height + 400;
  for (let i = 0; i < cards.length; i++) {
    const cd = cards[i];
    const c = component("Card · " + (cd.texts[0] ? cd.texts[0].segs.map((s) => s.t).join("") : i + 1), cd.w, cd.h);
    c.cornerRadius = 26;
    await fill(c, cd, anim("card:" + i));
    c.x = LIB_X + i * (cd.w + 40);
    c.y = cy;
    page.appendChild(c);
    cardComps.push(c);
  }

  // ---- Reel: seven positions, each one card further left, looping
  const cw = cards[0].w;
  const gap = data.reel.gap || 18;
  const stride = cw + gap;
  const setW = stride * cards.length;
  const reelH = cards[0].h + 8;
  const reelComps = [];
  for (let k = 0; k <= cards.length; k++) {
    const c = component("Position=" + k, W, reelH);
    const strip = figma.createFrame();
    strip.name = "strip";
    strip.fills = [];
    strip.clipsContent = false;
    strip.resize(setW * 2, reelH);
    for (let j = 0; j < cards.length * 2; j++) {
      const inst = cardComps[j % cards.length].createInstance();
      inst.name = "card-" + j;
      inst.x = j * stride;
      inst.y = 4;
      strip.appendChild(inst);
    }
    strip.x = 40 - k * stride;
    strip.y = 0;
    c.appendChild(strip);
    reelComps.push(c);
  }
  const reelSet = variantSet(page, reelComps, "Reel · Why join early (auto-scroll)", LIB_X, cy + cards[0].h + 300);
  const speed = 60; // px per second, as on the site
  for (let k = 0; k < reelComps.length; k++) {
    const last = k === reelComps.length - 1;
    await reelComps[k].setReactionsAsync([
      {
        trigger: { type: "AFTER_TIMEOUT", timeout: 0.01 },
        actions: [last ? changeTo(reelComps[0], 0) : changeTo(reelComps[k + 1], stride / speed, "LINEAR")],
      },
    ]);
  }

  // ---- The page
  const main = figma.createFrame();
  main.name = "Desktop — Goonj";
  main.resize(W, 1000);
  main.layoutMode = "VERTICAL";
  main.primaryAxisSizingMode = "AUTO";
  main.counterAxisSizingMode = "FIXED";
  main.itemSpacing = 0;
  main.fills = [solid(INK)];
  main.clipsContent = true;
  main.x = originX;
  main.y = 0;
  page.appendChild(main);

  const hero = heroComps[0].createInstance();
  hero.name = "Hero";
  main.appendChild(hero);

  const stories = wallComps[0].createInstance();
  stories.name = "Stories";
  main.appendChild(stories);

  const sec = {};
  for (const s of data.sections) sec[s.key] = s;

  const points = labelFrame("Why join early", W, sec.points.h, INK);
  await fill(points, sec.points);
  const reel = reelComps[0].createInstance();
  reel.name = "Reel";
  reel.x = 0;
  reel.y = data.reel.y - 4;
  points.appendChild(reel);
  main.appendChild(points);

  const why = labelFrame("Goonj gets you", W, sec.why.h, INK);
  await fill(why, sec.why);
  main.appendChild(why);

  const panels = data.sections.filter((s) => s.sticky);
  for (let pi = 0; pi < panels.length; pi++) {
    const p = panels[pi];
    const f = labelFrame(p.name, W, p.h, [0, 0, 0, 1]);
    await fill(f, p, anim("panel:" + pi));
    main.appendChild(f);
    f.scrollBehavior = "STICKY_SCROLLS";
  }

  const footer = labelFrame("Footer", W, sec.footer.h, INK);
  await fill(footer, sec.footer, anim("footer"));
  main.appendChild(footer);
  if (sec.footer.hot && sec.footer.hot.cta) await onClick(hotspot(footer, sec.footer.hot.cta, "Get early access"), scrollTo(hero));

  // ---- Nav: native glass pill, fixed while the page scrolls
  const nav = figma.createFrame();
  nav.name = "Nav";
  nav.fills = [];
  nav.clipsContent = false;
  nav.resize(W, 84);
  main.appendChild(nav);
  nav.layoutPositioning = "ABSOLUTE";
  nav.x = 0;
  nav.y = 0;
  nav.scrollBehavior = "FIXED";

  if (data.nav.logoSvg) {
    const logo = figma.createNodeFromSvg(data.nav.logoSvg);
    logo.name = "Goonj logo";
    const s = data.nav.logo.h / logo.height;
    logo.rescale(s);
    logo.x = data.nav.logo.x;
    logo.y = data.nav.logo.y;
    nav.appendChild(logo);
    await onClick(logo, scrollTo(hero));
  }

  const pill = figma.createFrame();
  pill.name = "Chapters";
  pill.resize(data.nav.pill.w, 56);
  pill.layoutMode = "HORIZONTAL";
  pill.primaryAxisSizingMode = "AUTO";
  pill.counterAxisSizingMode = "FIXED";
  pill.counterAxisAlignItems = "CENTER";
  pill.paddingLeft = pill.paddingRight = 6;
  pill.itemSpacing = 0;
  pill.cornerRadius = 28;
  pill.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.06 }];
  pill.effects = [
    { type: "BACKGROUND_BLUR", radius: 24, visible: true },
    { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.55 }, offset: { x: 0, y: 10 }, radius: 30, spread: -14, visible: true, blendMode: "NORMAL" },
  ];
  const targets = { stories: stories, points: points, why: why };
  await load(fontFor(400));
  for (const l of data.nav.links) {
    const item = figma.createFrame();
    item.name = l.label;
    item.resize(80, 40);
    item.layoutMode = "HORIZONTAL";
    item.primaryAxisSizingMode = "AUTO";
    item.counterAxisSizingMode = "FIXED";
    item.counterAxisAlignItems = "CENTER";
    item.paddingLeft = item.paddingRight = 16;
    item.cornerRadius = 20;
    item.fills = [];
    const t = figma.createText();
    t.fontName = fontFor(400);
    t.characters = l.label;
    t.fontSize = 14.5;
    t.fills = [{ type: "SOLID", color: { r: 250 / 255, g: 248 / 255, b: 245 / 255 }, opacity: 0.72 }];
    item.appendChild(t);
    pill.appendChild(item);
    if (targets[l.target]) await onClick(item, scrollTo(targets[l.target]));
  }
  nav.appendChild(pill);
  pill.x = W / 2 - pill.width / 2;
  pill.y = data.nav.pill.y;

  // ---- start the prototype here
  // add our flow, keeping any flows already on the page
  page.flowStartingPoints = (page.flowStartingPoints || []).concat([{ nodeId: main.id, name: "Goonj · Limited release" }]);
  figma.viewport.scrollAndZoomIntoView([main]);
  void reelSet;
}
