// Builds the platform workbench figure: one bench, one station per module.
// node build.mjs [--light]  → preview HTML next to this file.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 900;
const HEIGHT = 450;

// ---- world (x right-down, y left-down, z up; about 1 unit = 1 mm) ----
const BENCH = { x: -222, y: -121, w: 452, d: 214, r: 18 };
const BACK_DY = -35;
const BENCH_H = 12;
const FOOT_H = 6;

const BELT = { x: -150, y: -8.5, w: 330, d: 17, r: 1.5 };
const BELT_TOP = 9;
const TILE = 12;

const MKT = { x: -162, y: -19, w: 42, d: 38, r: 7 };
const MKT_DX = -30;
const MKT_H = 34;

const ANA_X = -120;
const ANA_BAR = { x: ANA_X - 6, y: -25, w: 12, d: 50, r: 3 };
const ANA_BAR_Z = 48;
const ANA_HEAD_Z = 34;
const DIAL_R = 9;

const ALR = [-45, 0];
const ALR_ARM = { x: ALR[0] - 4, y: -27, w: 8, d: 33, r: 1.2 };
const ALR_ARM_Z = 38;
const BELL_Z = 48;

const TRAY = { x: 18, y: 30, w: 152, d: 40, r: 8 };
const STACKS = [36, 66, 96, 126, 156];
const STACK_Y = 50;
const COIN_R = 8;
const COIN_H = 2.4;
const RAIL_Z = 3 + 12 * COIN_H;

const JRN = { x: 58, y: -68, w: 44, d: 30, r: 6 };
const JRN_H = 34;

const SOON = {
  backtest: { x: -128, y: -70, w: 42, d: 30, r: 7 },
  analyst: [-42, -54],
  trading: { x: 0, y: -70, w: 38, d: 30, r: 7 },
};

const CATCH = { x: 186, y: -15, w: 30, d: 30, r: 4 };
const JACK = { x: -166, y: 32, w: 14, d: 12, r: 1.5 };
const NAMEPLATE = { x: 180, y: 70, w: 34, d: 14, r: 2 };
const STRIP = { x: -190, y: BENCH.y + BENCH.d - 13, w: 330, d: 7, r: 1.5 };

const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [ANA_X, 0, ANA_BAR_Z + 13], [-170, 0, MKT_H + 16], [-68, -90, 37], [24, BENCH.y, 46]],
  WIDTH,
  HEIGHT,
  { pad: 12, azimuth: 58 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const box = (plan, z, h, tone = "mid", steps = 4, bevel = 0.6, extra = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...extra });
const halo = (plan, z, blur = 5) => `<path class="iso-halo" d="${k.haloOf(plan, z, 0.1, P)}" style="filter:blur(${blur}px)"/>`;
const screw = (x, y, z, r = 1.4) => L(k.ring(x, y, r, z, P, 16), { tone: "lo" }) + D([at([x, y, z])], { size: 0.42 });
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const face = (origin, z, side, inner) => `<g transform="${k.sideMatrix(origin, z, P, side)}">${inner}</g>`;
const windowSvg = (u, v, w, h, text, size, id) =>
  `<path class="pb-window" d="M${u} ${v}h${w}v${h}h${-w}Z"/>` +
  `<text class="iso-face-text pb-digits"${id ? ` data-display="${id}"` : ""} x="${u + w / 2}" y="${v + h * 0.78}" font-size="${size}" text-anchor="middle">${text}</text>`;


// ---- palette: the landing page's own tokens. Ceramic white and cool grey for
// every body, graphite for the belt, cobalt (--accent) as the one accent, and
// gain/loss green and red only on market candles.
const SET = (top, s3, s2, s1, s0, hi, mid, lo, faint, lit = "#2E4BF5") => ({
  paper: s2, face: top, top, "lit-top": top, "lit-shade": s3,
  "shade-3": s3, "shade-2": s2, "shade-1": s1, "shade-0": s0,
  hi, mid, lo, faint, dot: hi, lit,
});
const CERAMIC = SET("#FFFFFF", "#F2F3F7", "#E8EAF0", "#DCDFE7", "#CED2DC", "#6E7487", "#9298A9", "#B9BECB", "#DADDE5");
const PALETTE = {
  bench: SET("#F7F8FA", "#EEF0F4", "#E4E7ED", "#D8DCE4", "#CBD0DA", "#7C8294", "#A2A7B6", "#C4C8D2", "#E2E4EA"),
  ceramic: CERAMIC,
  graphite: SET("#5A606E", "#464B57", "#3C404B", "#33363F", "#2A2D35", "#14161B", "#1E2128", "#6A707E", "#4C515D"),
  cobalt: SET("#E4E9FF", "#A9B6FF", "#8C9DFF", "#7086FF", "#5A73FF", "#1A2CC4", "#2A40E0", "#5A73FF", "#8C9DFF", "#FFFFFF"),
  gain: SET("#E3F4EC", "#A9E2C8", "#78CFA8", "#3DB585", "#0F9D6B", "#0B5E40", "#0B7A53", "#2F9C72", "#5CC497"),
  loss: SET("#FCEBEC", "#F6B6B8", "#F0898D", "#E8656A", "#E0484D", "#8A1E23", "#B42A30", "#D0555A", "#EE8A8E"),
  warn: SET("#FBEFE4", "#F4C79E", "#EDA66B", "#E38C47", "#D9772E", "#7A3A0E", "#9A4A12", "#C26A2A", "#EBA875"),
  white: SET("#FFFFFF", "#FAFBFC", "#F4F5F8", "#ECEEF2", "#E2E5EB", "#7C8294", "#A2A7B6", "#C9CDD6", "#E3E5EB"),
};
// station classes (kept from the first draft) mapped onto the palette
const CLASS = {
  bench: "bench", slate: "graphite", gold: "cobalt", flag: "loss", up: "gain", down: "loss", white: "white", warn: "warn",
  blue: "ceramic", purple: "ceramic", red: "ceramic", yellow: "ceramic", mint: "ceramic", orange: "ceramic", teal: "ceramic", pink: "ceramic", indigo: "ceramic",
};
const TOY_CSS =
  Object.entries(CLASS)
    .map(([name, set]) => `.toy-${name}{${Object.entries(PALETTE[set]).map(([t, v]) => `--anatomy-${t}:${v}`).join(";")}}`)
    .join("") +
  `.toy .iso-edge{stroke-width:.75px}.toy .iso-dots circle{opacity:.55}` +
  `.pb-grid circle{fill:#C9CED9;opacity:1}` +
  `.pb-window{fill:#0F1116;stroke:#2A2D35;stroke-width:.5;vector-effect:non-scaling-stroke}.pb-digits{fill:#8CA5FF!important}` +
  `.iso-plate .iso-halo{opacity:.38}`;

// ---- bench ----
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BENCH, 26))) {
    out.push(S(k.cylinder(x, y, 8, -BENCH_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -BENCH_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "lo", inner: L(k.sideSeam(BENCH, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: "faint" }));
  // fine dot grid on the bench top
  const grid = [];
  for (let x = BENCH.x + 18; x < BENCH.x + BENCH.w - 12; x += 12) for (let y = BENCH.y + 18; y < BENCH.y + BENCH.d - 24; y += 12) grid.push(at([x, y, 0]));
  out.push(D(grid, { size: 0.42 }).replace('class="iso-dots"', 'class="iso-dots pb-grid"'));
  for (const [x, y] of k.corners(BENCH, 11)) out.push(screw(x, y, 0, 2.2));
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 5, 5, STRIP.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([STRIP.x + 2, STRIP.y + 3.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.6])], { size: 0.45 }));
  out.push(S(k.slabOf(NAMEPLATE, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(NAMEPLATE, 1.4), 0.8, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([NAMEPLATE.x + NAMEPLATE.w / 2, NAMEPLATE.y + 8.4], 0.8, P, "x"), "UNTOLDMONEY", { size: 3, tone: "mid", anchor: "middle" }));
  return out.join("");
}

// ---- backtesting: a reel-to-reel deck that replays years of candles ----
function backtest() {
  const BT = SOON.backtest;
  const out = [halo(BT, 0)];
  out.push(box(BT, 0, 10, "mid", 5, 0.8, { inner: L(k.sideSeam(BT, 3, P, 5), { tone: "faint" }) }));
  const deck = k.insetPlan(BT, 1.6);
  out.push(box(deck, 10, 1, "lo", 4, 0.3));
  for (const [x, y] of k.corners(deck, 2.4)) out.push(D([at([x, y, 11])], { size: 0.4 }));
  // two reels, tape past the head
  for (const cx of [-116, -98]) {
    out.push(S(k.cylinder(cx, -60, 8, 11, 2.2, P, 48, 0.4), { tone: "hi", crease: "lo" }));
    out.push(L([0, 1, 2].map((i) => { const a = i * 2.094 + 0.3; return k.ring(cx + Math.sin(a) * 4.6, -60 - Math.cos(a) * 4.6, 1.7, 13.2, P, 14); }).join(""), { tone: "lo" }));
    out.push(S(k.cylinder(cx, -60, 1.8, 13.2, 1.4, P, 16), { tone: "mid" }));
  }
  out.push(L(k.lineOnTop([-116, -52], [-98, -52], 12.2, P), { tone: "hi" }));
  out.push(box({ x: -110, y: -51.6, w: 6, d: 3, r: 0.6 }, 11, 4, "mid", 3, 0.3));
  // the equity curve the replay draws, on chart paper with a pen carriage
  const paper = { x: -125, y: -48.5, w: 31, d: 6.4, r: 0.4 };
  out.push(S(k.slabOf(paper, 11, 0.4, P, 2), { tone: "hi", crease: "none" }));
  const curve = [0, 0.4, 0.2, 1.1, 0.9, 1.8, 1.5, 2.6, 2.2, 3.4, 3.9, 3.3, 4.6].map((v, i) => [paper.x + 1.5 + i * 2.3, paper.y + paper.d - 1 - v]);
  out.push(L(k.onTop(curve, 11.4, P), { tone: "hi" }));
  out.push(box({ x: -92.4, y: -49, w: 2.2, d: 7.4, r: 0.4 }, 11, 3.2, "mid", 2, 0));
  // transport keys on the front face
  for (let i = 0; i < 3; i++) out.push(box({ x: BT.x + 4 + i * 5, y: BT.y + BT.d, w: 3.6, d: 1.2, r: 0.4 }, 3, 3.6, i === 1 ? "hi" : "mid", 2, 0));
  return out.join("");
}

// ---- AI analyst chat: a teleprinter that types answers in plain language ----
function analyst() {
  const base = { x: -62, y: -72, w: 40, d: 36, r: 3 };
  const body = { x: -60, y: -70, w: 36, d: 18, r: 2 };
  const keys = { x: -60, y: -52, w: 36, d: 14, r: 2 };
  const out = [halo(base, 0), box(base, 0, 2, "lo", 4, 0.3)];
  // paper roll at the back
  for (const x of [-57, -28]) out.push(box({ x, y: -68, w: 1.6, d: 4, r: 0.4 }, 20, 8, "mid", 2, 0));
  const roll = G.frameOf([-55.4, -66, 25], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(box(body, 2, 18, "mid", 4, 0.8, { inner: L(k.sideSeam(body, 8, P, 4), { tone: "faint" }) }));
  out.push(S(G.disc(0, 27.4, 3.6, roll, P), { tone: "hi", crease: "lo" }));
  // the answer coming out of the platen
  const sheet = { x: -52, y: -55.3, w: 20, d: 0.5, r: 0 };
  out.push(`<g class="toy toy-white">${S(k.slabOf(sheet, 21, 16, P, 1), { tone: "hi", crease: "none" })}${[[13, 34.5], [16, 32.6], [9, 30.7], [15, 28.8], [11, 26.9]].map(([w, z]) => L(k.segment([sheet.x + 2, -54.8, z], [sheet.x + 2 + w, -54.8, z], P), { tone: "lo", free: true })).join("")}</g>`);
  const platen = G.frameOf([-58, -55, 21], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.disc(0, 32, 2.6, platen, P), { tone: "mid", inner: L(G.arcOf(platen, 16, 2.6, P), { tone: "faint" }) }));
  for (const s of [-1.4, 32]) out.push(S(G.disc(s, s + 1.4, 3.6, platen, P), { tone: "mid" }));
  // keyboard deck where the question is typed
  out.push(box(keys, 2, 6, "mid", 4, 0.6));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
    const x = keys.x + 3 + c * 3.9 + (r % 2) * 1.2, y = keys.y + 2.4 + r * 3.6;
    out.push(S(k.slabOf({ x, y, w: 2.8, d: 2.6, r: 0.5 }, 8, 1, P, 2), { tone: r === 2 && c === 3 ? "hi" : "mid", crease: "none" }));
  }
  out.push(S(k.slabOf({ x: keys.x + 9, y: keys.y + 13.2 - 1.6, w: 16, d: 1.2, r: 0.5 }, 8, 0.8, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}

// ---- broker trading: an order press and a pneumatic tube out to the broker ----
function trading() {
  const plan = SOON.trading;
  const out = [];
  // bulkhead at the bench's back edge where the tube leaves for the broker
  const edge = BENCH.y - BACK_DY;
  out.push(box({ x: 24, y: edge, w: 12, d: 2.6, r: 0.6 }, 0, 46, "mid", 3, 0.4));
  out.push(D([at([26, edge + 2.6, 42]), at([34, edge + 2.6, 42]), at([26, edge + 2.6, 4]), at([34, edge + 2.6, 4])], { size: 0.42 }));
  out.push(halo(plan, 0));
  out.push(box(plan, 0, 14, "mid", 5, 0.8, { inner: L(k.sideSeam(plan, 3, P, 5), { tone: "faint" }) }));
  for (const [x, y] of [[plan.x + 3, plan.y + plan.d - 3], [plan.x + plan.w - 3, plan.y + plan.d - 3]]) out.push(screw(x, y, 14, 1));
  // ticket bed with a stamped order ticket
  out.push(box({ x: 5, y: -57, w: 16, d: 12, r: 0.8 }, 14, 1, "lo", 3, 0.2));
  out.push(S(k.slabOf({ x: 7, y: -55.5, w: 12, d: 8.6, r: 0.3 }, 15, 0.4, P, 2), { tone: "hi", crease: "none" }));
  out.push([[8, -53.5, 6], [8, -51.5, 9], [8, -49.5, 4]].map(([x, y, w]) => L(k.lineOnTop([x, y], [x + w, y], 15.4, P), { tone: "lo", free: true })).join(""));
  // press: column, arm, ram and lever
  out.push(S(k.cylinder(6, -64, 3, 14, 1.4, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(6, -64, 2, 15.4, 18.6, P, 18), { tone: "mid", crease: "none", inner: L(k.sideArc(6, -64, 2, 24, P, 12), { tone: "faint" }) }));
  out.push(box({ x: 3, y: -67, w: 18, d: 6, r: 1.4 }, 30, 5, "mid", 3, 0.5));
  out.push(S(k.cylinder(13, -51.5, 2.4, 20, 10, P, 20), { tone: "mid", crease: "none" }));
  out.push(box({ x: 10, y: -64, w: 6, d: 13, r: 1 }, 30, 5, "mid", 3, 0.4));
  out.push(S(k.cylinder(13, -51.5, 3.4, 18.6, 1.6, P, 24), { tone: "hi", crease: "lo" }));
  out.push(box({ x: 16, y: -53, w: 12, d: 2.4, r: 0.8 }, 32, 2, "mid", 2, 0.2));
  out.push(S(G.sphereOf([29.4, -51.8, 33], 2.4, P), { tone: "hi" }));
  // receiver and tube
  out.push(S(k.cylinder(30, -60, 4.4, 14, 8, P, 28, 0.4), { tone: "mid" }));
  const run = G.frameOf([30, -63.4, 38], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(S(G.disc(0, -63.4 - edge - 2.6 - 2, 2.6, run, P), { tone: "mid", inner: L([6, 12].map((s) => G.arcOf(run, s, 2.6, P)).join(""), { tone: "faint" }) }));
  out.push(S(G.disc(-63.4 - edge - 2.6 - 2, -63.4 - edge - 2.6, 4.2, run, P), { tone: "mid" }));
  out.push(S(k.cylinder(30, -60, 2.6, 22, 13, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(G.sphereOf([30, -60, 37.6], 3.6, P), { tone: "mid" }));
  // fills travel down this duct into the journal
  const duct = { x: plan.x + plan.w, y: -57, w: JRN.x - plan.x - plan.w, d: 8, r: 0.8 };
  out.push(box(duct, 16, 7, "lo", 3, 0.4));
  for (const x of [plan.x + plan.w, JRN.x - 2.2]) out.push(box({ x, y: -59.5, w: 2.2, d: 13, r: 0.6 }, 13, 13, "mid", 3, 0.3));
  return out.join("");
}

// ---- journal: card cabinet ----
function journal() {
  const out = [halo(JRN, 0), box(JRN, 0, JRN_H, "mid", 4, 0.8, { inner: L(k.sideSeam(JRN, 2.6, P, 4), { tone: "faint" }) })];
  for (let i = 0; i < 3; i++) {
    const z = 3 + i * 10;
    const front = { x: JRN.x + 3, y: JRN.y + JRN.d, w: JRN.w - 6, d: 1.4, r: 0.6 };
    out.push(box(front, z, 9, "mid", 3, 0.3));
    out.push(box({ x: JRN.x + JRN.w / 2 - 5, y: front.y + 1.4, w: 10, d: 1.8, r: 0.6 }, z + 5.2, 1.6, "hi", 3, 0));
    const hx = JRN.x + 8, hy = front.y + 1.4;
    out.push(L(k.pathOf([at([hx, hy, z + 2.2]), at([hx + 8, hy, z + 2.2]), at([hx + 8, hy, z + 4.6]), at([hx, hy, z + 4.6])], true), { tone: "lo" }));
  }
  for (const [x, y] of k.corners(JRN, 3)) out.push(screw(x, y, JRN_H, 1));
  // card in-tray and slot
  const tray = { x: JRN.x + 4, y: JRN.y + 4, w: 20, d: 15, r: 1 };
  out.push(box(tray, JRN_H, 1.2, "lo", 3, 0));
  for (let i = 0; i < 4; i++) out.push(box(k.insetPlan(tray, 1.6), JRN_H + 1.2 + i * 0.7, 0.7, i === 3 ? "hi" : "mid", 2, 0, { crease: "none" }));
  out.push(L(k.planOutline({ x: JRN.x + 30, y: JRN.y + 6, w: 10, d: 12, r: 0.8 }, JRN_H, P, 3), { tone: "lo" }));
  // win rate and profit factor windows on the +x face
  out.push(face([JRN.x + JRN.w, JRN.y + JRN.d], JRN_H, "right", windowSvg(3, 6, 11, 6.4, "58%", 4.2, "win") + windowSvg(16, 6, 11, 6.4, "1.60", 4.2, "pf")));
  return out.join("");
}

// ---- market data: candle printer ----
function market() {
  const out = [halo(MKT, 0)];
  out.push(box(MKT, 0, MKT_H, "mid", 4, 0.8, { inner: L([4, MKT_H - 6].map((z) => k.sideSeam(MKT, z, P, 4)).join(""), { tone: "faint" }) }));
  for (const [x, y] of k.corners(MKT, 3)) out.push(screw(x, y, MKT_H, 1.1));
  // feed mouth onto the belt
  out.push(`<path class="iso-shade" data-shade="0" d="${k.pathOf([at([MKT.x + MKT.w, -8, BELT_TOP]), at([MKT.x + MKT.w, 8, BELT_TOP]), at([MKT.x + MKT.w, 8, BELT_TOP + 17]), at([MKT.x + MKT.w, -8, BELT_TOP + 17])], true)}"/>`);
  out.push(L(k.pathOf([at([MKT.x + MKT.w, -8, BELT_TOP]), at([MKT.x + MKT.w, 8, BELT_TOP]), at([MKT.x + MKT.w, 8, BELT_TOP + 17]), at([MKT.x + MKT.w, -8, BELT_TOP + 17])], true), { tone: "lo" }));
  // paper roll in two bearing blocks
  for (const y of [-14, 10]) out.push(box({ x: -146, y, w: 8, d: 4, r: 0.8 }, MKT_H, 10, "mid", 3, 0.3));
  const F = G.frameOf([-142, -10, MKT_H + 9], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  out.push(`<g class="toy toy-white">${S(G.disc(0, 20, 7, F, P), { tone: "hi", crease: "lo", inner: L([4, 10, 16].map((s) => G.arcOf(F, s, 7, P)).join(""), { tone: "faint" }) })}</g>`);
  out.push(S(G.disc(20, 21, 2.2, F, P), { tone: "mid" }));
  // vents
  for (let i = 0; i < 4; i++) out.push(L(k.planOutline({ x: -130 + i * 2.6, y: -14, w: 1.2, d: 18, r: 0.6 }, MKT_H, P, 3), { tone: "lo" }));
  // candle counter on the front face
  out.push(face([MKT.x, MKT.y + MKT.d], MKT_H, "left", windowSvg(5, 8, 22, 7, "000074", 4.6, "candles")));
  out.push(D([at([MKT.x + 33, MKT.y + MKT.d, MKT_H - 11.5])], { size: 1, tone: "hi" }));
  return out.join("");
}

function feedCable() {
  const from = [JACK.x + 7, JACK.y + 6, 9.4];
  const to = [MKT.x + 10, MKT.y + MKT.d, 8];
  const mid = [JACK.x + 6, JACK.y - 4, 22];
  const pts = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return at([0, 1, 2].map((j) => (1 - t) ** 2 * from[j] + 2 * (1 - t) * t * mid[j] + t ** 2 * to[j]));
  });
  return (
    halo(JACK, 0, 3) +
    box(JACK, 0, 8, "mid", 3, 0.5) +
    S(k.cylinder(from[0], from[1], 2, 8, 1.4, P, 16), { tone: "mid" }) +
    `<g class="iso-wire" data-tone="mid"><path class="iso-line" data-tone="mid" d="${k.pathOf(pts)}" style="stroke-width:1.4"/><circle class="iso-wire-end" cx="${pts[0][0].toFixed(1)}" cy="${pts[0][1].toFixed(1)}" r="1"/><circle class="iso-wire-end" cx="${pts[24][0].toFixed(1)}" cy="${pts[24][1].toFixed(1)}" r="1"/></g>`
  );
}

// ---- belt ----
function beltBack() {
  const out = [];
  for (const x of [-135, -60, 15, 90, 165]) out.push(box({ x: x - 3, y: -11, w: 6, d: 22, r: 1 }, 0, 3, "lo", 3, 0.3));
  out.push(box({ x: BELT.x, y: -11, w: BELT.w, d: 2.5, r: 0.8 }, 3, BELT_TOP + 1.5 - 3, "mid", 3, 0.3));
  out.push(box(BELT, 3, BELT_TOP - 3, "lo", 3, 0));
  const slats = [];
  for (let x = BELT.x + 4; x < BELT.x + BELT.w - 2; x += 8) slats.push(k.lineOnTop([x, BELT.y], [x, BELT.y + BELT.d], BELT_TOP, P));
  out.push(`<path data-part="slats" class="iso-line" data-tone="faint" d="${slats.join("")}"/>`);
  return out.join("");
}
function beltFront() {
  const out = [];
  out.push(box({ x: BELT.x, y: 8.5, w: BELT.w, d: 2.5, r: 0.8 }, 3, BELT_TOP + 1.5 - 3, "mid", 3, 0.3, { inner: L(k.sideSeam({ x: BELT.x, y: 8.5, w: BELT.w, d: 2.5, r: 0.8 }, 6, P, 3), { tone: "faint" }) }));
  for (const x of [BELT.x + 4, BELT.x + BELT.w - 4]) {
    out.push(L(k.sideRing([x, 11, 5.6], 2, "y", P, 16), { tone: "lo" }));
    out.push(D([at([x, 11, 5.6])], { size: 0.5 }));
  }
  // price tap that tells the allocation tray a new price passed
  out.push(box({ x: 64, y: 11, w: 12, d: 6, r: 0.8 }, 3, 9, "mid", 3, 0.4));
  out.push(L(k.segment([70, 11, 11], [70, 6, 11], P), { tone: "mid" }));
  out.push(D([at([70, 6, 11])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

// tile = one daily candle for one stock; its height is the price
function tile(cx, h, lit = false) {
  const plan = { x: cx - TILE / 2, y: -TILE / 2, w: TILE, d: TILE, r: 1 };
  const top = BELT_TOP + h;
  const body = Math.max(1.6, h * 0.35);
  return (
    S(k.slabOf(plan, BELT_TOP, h, P, 2, 0.4), { tone: "hi", crease: "lo", lit }) +
    L(k.lineOnTop([cx, -4.6], [cx, 4.6], top, P), { tone: "lo" }) +
    S(k.slabOf({ x: cx - 1.6, y: -body / 2, w: 3.2, d: body, r: 0.4 }, top, 0.5, P, 2), { tone: "mid", crease: "none" })
  );
}
const SAMPLE = [10, 7, 9, 12, 8, 11, 13, 9, 6, 10, 12, 8];
function tiles() {
  return SAMPLE.map((h, i) => `<g class="toy ${i && h < SAMPLE[i - 1] ? "toy-down" : "toy-up"}">${tile(-120 + i * 25, h)}</g>`).join("");
}

// ---- AI analysis: reader gantry ----
function anaBack() {
  return box({ x: ANA_X - 4, y: -25, w: 8, d: 6, r: 1 }, 0, ANA_BAR_Z, "mid", 3, 0.5) + halo({ x: ANA_X - 6, y: -27, w: 12, d: 10, r: 2 }, 0, 3);
}
function anaFront(tileTop) {
  const out = [];
  out.push(halo({ x: ANA_X - 6, y: 17, w: 12, d: 10, r: 2 }, 0, 3));
  out.push(box({ x: ANA_X - 4, y: 19, w: 8, d: 6, r: 1 }, 0, ANA_BAR_Z, "mid", 3, 0.5, { inner: L([12, 30].map((z) => k.sideSeam({ x: ANA_X - 4, y: 19, w: 8, d: 6, r: 1 }, z, P, 3)).join(""), { tone: "faint" }) }));
  out.push(box({ x: ANA_X - 5, y: -6, w: 10, d: 12, r: 1 }, ANA_HEAD_Z, ANA_BAR_Z - ANA_HEAD_Z, "mid", 3, 0.4));
  out.push(`<g data-part="ana-rod">${S(k.slabOf({ x: ANA_X - 1, y: -1, w: 2, d: 2, r: 0.4 }, tileTop + 1.2, ANA_HEAD_Z - tileTop - 1.2, P, 2), { tone: "hi", crease: "none" })}${S(k.cylinder(ANA_X, 0, 2.6, tileTop, 1.2, P, 20), { tone: "hi" })}</g>`);
  out.push(box(ANA_BAR, ANA_BAR_Z, 8, "mid", 4, 0.6));
  for (const y of [-21, 21]) out.push(screw(ANA_X, y, ANA_BAR_Z + 8, 1));
  out.push(face([ANA_BAR.x + ANA_BAR.w, ANA_BAR.y + ANA_BAR.d], ANA_BAR_Z + 8, "right", windowSvg(4, 1.4, 13, 5.2, "074", 3.8, "n") + windowSvg(20, 1.4, 13, 5.2, "--", 3.8, "conf")));
  // the call: a dial gauge on the bar
  const dz = ANA_BAR_Z + 8;
  out.push(S(k.cylinder(ANA_X, -4, 3, dz, 2, P, 20), { tone: "mid" }));
  out.push('<g class="toy toy-white">');
  out.push(S(k.cylinder(ANA_X, -4, DIAL_R, dz + 2, 4, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  const top = dz + 6;
  out.push(L(k.knurl(ANA_X, -4, DIAL_R, top - 2, top, 60, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(ANA_X, -4, DIAL_R - 1.8, top, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(ANA_X, -4, DIAL_R - 2.4, 10, 5, top, [1, 2.2], P, -Math.PI / 2, Math.PI);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const a = 0.6;
  out.push(`<path data-part="ana-needle" class="iso-line" data-tone="lit" data-free="end" style="stroke-width:1" d="${k.lineOnTop([ANA_X, -4], [ANA_X + Math.sin(a) * (DIAL_R - 3), -4 - Math.cos(a) * (DIAL_R - 3)], top + 0.1, P)}"/>`);
  out.push(L(k.ring(ANA_X, -4, 1.2, top, P, 12), { tone: "mid" }), "</g>");
  return out.join("");
}

// ---- alerts: feeler, bell and lamp ----
function alrBack() {
  const [x] = ALR;
  return halo({ x: x - 7, y: -30, w: 14, d: 12, r: 2 }, 0, 3) + box({ x: x - 5, y: -30, w: 10, d: 8, r: 1 }, 0, 2, "lo", 3, 0.3) + box({ x: x - 4, y: -29, w: 8, d: 6, r: 1 }, 2, ALR_ARM_Z - 2, "mid", 3, 0.5, { inner: L(k.sideSeam({ x: x - 4, y: -29, w: 8, d: 6, r: 1 }, 20, P, 3), { tone: "faint" }) });
}
function alrFront(tileTop) {
  const [x, y] = ALR;
  const out = [];
  out.push(box({ x: x - 4, y: -5, w: 8, d: 10, r: 1 }, 30, ALR_ARM_Z - 30, "mid", 3, 0.4));
  out.push(`<g data-part="alr-rod">${S(k.slabOf({ x: x - 0.9, y: y - 0.9, w: 1.8, d: 1.8, r: 0.4 }, tileTop + 1, 30 - tileTop - 1, P, 2), { tone: "hi", crease: "none" })}${S(k.cylinder(x, y, 2.2, tileTop, 1, P, 20), { tone: "hi" })}</g>`);
  out.push(box(ALR_ARM, ALR_ARM_Z, 6, "mid", 3, 0.5));
  out.push(D([at([x, -24, ALR_ARM_Z + 6]), at([x, -16, ALR_ARM_Z + 6])], { size: 0.42 }));
  // lamp on the arm: lights in the app
  out.push(S(k.cylinder(x, -21, 2.6, ALR_ARM_Z + 6, 1.4, P, 20), { tone: "mid" }));
  out.push(`<g data-part="lamp" class="toy toy-gold">${S(G.sphereOf([x, -21, ALR_ARM_Z + 9.2], 2.4, P), { tone: "hi" })}</g>`);
  // bell bracket and bell over the feeler rod
  out.push(S(k.cylinder(x, -9, 1, ALR_ARM_Z + 6, BELL_Z + 11 - ALR_ARM_Z - 6, P, 12), { tone: "mid", crease: "none" }));
  out.push(box({ x: x - 1, y: -9.5, w: 2, d: 9.5, r: 0.4 }, BELL_Z + 9, 2, "mid", 2, 0));
  const F = G.frameOf([x, y, BELL_Z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const bell = G.solidOf([[0, 6.4], [0.8, 6.4, 1], [2.4, 5.6, 1], [4.6, 4.6, 1], [7, 3.4, 1], [8.6, 1.8, 1], [9, 0]], F, P);
  out.push(`<g data-part="bell" class="toy toy-warn">${S(bell, { tone: "hi", crease: "lo", inner: L(G.arcOf(F, 1.2, 6.3, P, { slope: -0.4 }), { tone: "faint" }) })}</g>`);
  // envelope slot: the alert also leaves by email
  out.push(box({ x: x - 8, y: -31.5, w: 3, d: 10, r: 0.6 }, 26, 6, "mid", 3, 0.3));
  return out.join("");
}

// ---- capital allocation: coin stacks against a 30% rail ----
const WEIGHTS = [22, 18, 34.2, 14, 11.8];
function allocation() {
  const out = [halo(TRAY, 0), box(TRAY, 0, 3, "lo", 5, 0.6)];
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3), 3, P, 4), { tone: "faint" }));
  for (const px of [TRAY.x + 3, TRAY.x + TRAY.w - 7]) out.push(box({ x: px, y: TRAY.y + 2, w: 4, d: 4, r: 0.8 }, 3, RAIL_Z + 3 - 3, "mid", 3, 0.3));
  out.push(box({ x: TRAY.x + 3, y: TRAY.y + 2.8, w: TRAY.w - 6, d: 2.4, r: 0.6 }, RAIL_Z, 2, "mid", 3, 0.3));
  out.push(L(k.lineOnTop([TRAY.x + 10, TRAY.y + 4], [TRAY.x + TRAY.w - 10, TRAY.y + 4], RAIL_Z + 2, P), { tone: "lo" }).replace("<path", '<path data-free="true"'));
  STACKS.forEach((x, i) => {
    out.push(L(k.ring(x, STACK_Y, COIN_R + 1.2, 3, P, 40), { tone: "faint" }));
    const n = Math.round(WEIGHTS[i] / 2.5);
    out.push('<g class="toy toy-gold">');
    for (let c = 0; c < n; c++) out.push(S(k.cylinder(x, STACK_Y, COIN_R, 3 + c * COIN_H, COIN_H, P, 48, 0.4), { tone: "hi", crease: "lo" }));
    const top = 3 + n * COIN_H;
    out.push(L(k.ring(x, STACK_Y, COIN_R - 2, top, P, 36), { tone: "lo" }), "</g>");
    if (WEIGHTS[i] > 30) {
      out.push('<g class="toy toy-flag">');
      out.push(S(k.cylinder(x + 3, STACK_Y - 3, 0.5, top, 9, P, 8), { tone: "mid", crease: "none" }));
      out.push(S(k.slabOf({ x: x + 3.5, y: STACK_Y - 3.3, w: 6, d: 0.6, r: 0 }, top + 5, 4, P, 1), { tone: "hi" }), "</g>");
    }
  });
  out.push(D(STACKS.map((x) => at([x, TRAY.y + TRAY.d - 2, 3])), { size: 0.42 }));
  return out.join("");
}

function catchTray() {
  return halo(CATCH, 0, 3) + box(CATCH, 0, 1.2, "lo", 4, 0) + box({ x: CATCH.x, y: CATCH.y, w: CATCH.w, d: 1.4, r: 0.5 }, 0, 9, "mid", 3, 0.3) + box({ x: CATCH.x, y: CATCH.y + 1.4, w: 1.4, d: CATCH.d - 2.8, r: 0.5 }, 0, 9, "mid", 3, 0.3) + box({ x: CATCH.x + CATCH.w - 1.4, y: CATCH.y + 1.4, w: 1.4, d: CATCH.d - 2.8, r: 0.5 }, 0, 9, "mid", 3, 0.3) + box({ x: CATCH.x, y: CATCH.y + CATCH.d - 1.4, w: CATCH.w, d: 1.4, r: 0.5 }, 0, 9, "mid", 3, 0.3);
}

const anaTile = BELT_TOP + SAMPLE[0];
const alrTile = BELT_TOP + SAMPLE[3];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "The UntoldMoney platform as one workbench. A printer feeds daily candles onto a belt as tiles whose height is the price. They pass an AI reader gantry with a dial, an alert feeler that rings a bell when a price passes the stop, and a price tap that restacks coins in an allocation tray against a 30 percent rail. A card cabinet keeps the trade journal. A reel-to-reel deck replays history for backtesting, a teleprinter answers questions as the AI analyst, and an order press sends tickets by pneumatic tube to the broker, with fills returning by duct to the journal.",
  body: [
    `<g class="toy toy-bench">${bench()}</g>`,
    `<g class="toy toy-teal" transform="${k.translateAlong(P, [-31, BACK_DY, 0])}">${backtest()}</g>`,
    `<g class="toy toy-pink" transform="${k.translateAlong(P, [-26, BACK_DY, 0])}">${analyst()}</g>`,
    `<g class="toy toy-indigo" transform="${k.translateAlong(P, [-6, BACK_DY, 0])}">${trading()}</g>`,
    `<g class="toy toy-orange" transform="${k.translateAlong(P, [-6, BACK_DY, 0])}">${journal()}</g>`,
    `<g class="toy toy-blue" transform="${k.translateAlong(P, [MKT_DX, 0, 0])}">${market()}</g>`,
    `<g class="toy toy-purple">${anaBack()}</g>`,
    `<g class="toy toy-red">${alrBack()}</g>`,
    `<g class="toy toy-slate">${beltBack()}</g>`,
    tiles(),
    `<g class="toy toy-yellow">${catchTray()}</g>`,
    `<g class="toy toy-slate">${beltFront()}</g>`,
    `<g class="toy toy-purple">${anaFront(anaTile)}</g>`,
    `<g class="toy toy-red">${alrFront(alrTile)}</g>`,
    `<g class="toy toy-mint">${allocation()}</g>`,
    `<g class="toy toy-blue" transform="${k.translateAlong(P, [MKT_DX, 0, 0])}">${feedCable()}</g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 2",
  title: "The workbench",
  hint: "Preview: static layout",
  readout: "8 stations · all live",
  keys: [
    { mark: "raised", label: "Candle tiles: height is the price" },
    { mark: "lit", label: "Over-limit flag" },
    { mark: "flat", label: "Back row: backtest deck, AI analyst teleprinter, broker order press" },
  ],
  caption:
    "Market data prints daily candles onto the belt. The AI gantry reads them (no call under 80 candles), the alert feeler rings the bell when a price passes its stop, and the price tap restacks the allocation coins (each coin 2.5% of the portfolio, rail at 30%). The card cabinet is the trade journal. The reel deck replays years of candles to draw a strategy's equity curve (backtesting), the teleprinter types plain-language answers to questions (AI analyst), and the order press stamps a ticket and sends it down the tube to your broker, with the fill coming back through the duct into the journal (broker trading).",
  body: `<style>${TOY_CSS}</style><div class="iso-stage">${svg}</div>`,
});

const name = theme === "light" ? "preview-light.html" : "preview.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Workbench preview", theme, body, width: 900 }));
console.log("wrote", name);
