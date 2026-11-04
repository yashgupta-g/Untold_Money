import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/yashgupta/.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/yashgupta/.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 400;

// The model: a bucket of B tokens, refilled with one token every 1/r seconds.
const B = 8;
const RATES = [0.5, 1, 1.5, 2, 3, 4];
const RATE_START = 1;

// World, about 1 unit = 1 mm. x, y on the floor, z up.
const PLATE = { x: -74, y: -78, w: 154, d: 156, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;

const TOKEN_R = 12;
const T = 4;
const SEAT = 14;
const PED = { x: -24, y: -26, w: 48, d: 42, r: 2.5 };
const PED_FLANGE = { x: -29, y: -30, w: 58, d: 50, r: 3.5 };
const CHEEK_TOP = 18.6;
const CHEEK_L = { x: -21, y: -16, w: 8.5, d: 32, r: 1 };
const CHEEK_R = { x: 12.5, y: -16, w: 8.5, d: 32, r: 1 };
const BRIDGE_TOP = 21.4;
const BRIDGE_F = { x: -21, y: 12.6, w: 42, d: 3.4, r: 0.8 };
const BRIDGE_B = { x: -21, y: -16, w: 42, d: 3.4, r: 0.8 };
const POST_R = 1.4;
const POSTS = { back: [[0, -14.3], [-13.9, 0]], front: [[13.9, 0], [0, 14.3]] };
const CAP_Z = 56;
const CAP = { x: -20, y: -20, w: 40, d: 40, r: 4 };
const CAP_TOP = 59.5;

const FEED = { x: -62, y: -26, w: 80, d: 40, r: 3 };
const FEED_TOP = 71.5;
const LID = k.insetPlan(FEED, 2);
const LID_TOP = 72.7;
const WHEEL = [-1, -6];
const WHEEL_R = 9.5;
const WHEEL_TOP = LID_TOP + 2.4;
const NOTCHES = 6;
const MOTOR = [-32, -6];
const MOTOR_R = 7;
const MOTOR_TOP = LID_TOP + 9;
const KNOB_R = 4.2;
const KNOB_TOP = MOTOR_TOP + 2.8;
const DIAL_FROM = -0.75 * Math.PI;
const DIAL_SPAN = 1.5 * Math.PI;

const SPILL = [-49, -5];
const SPOUT_Z = 54.5;
const PILLAR = [-49, -23.2];
const BIN = { x: -63, y: -20, w: 28, d: 30, r: 2.5 };
const CUP = { x: -17, y: 28.5, w: 34, d: 32, r: 2.5 };
const WALL = 1.5;
const BIN_H = 12;
const FLOOR = 1.2;
const LAND = 44;

const SOL = { x: -11, y: -66, w: 22, d: 34, r: 1.5 };
const SOL_FLANGE = { x: -15, y: -70, w: 30, d: 36, r: 2 };
const SOL_H = 24;
const GLAND_Y = -30.4;
const ROD_Z = 16;
const BLADE = { x: -9, y: -26, w: 18, d: 13.5, r: 0.8 };
const BLADE_Z = 14.2;
const BLADE_H = 3.6;
const STROKE = 28.5;

const BTN_BOX = { x: 40, y: -26, w: 22, d: 20, r: 2 };
const BTN = [51, -15];
const BTN_Z = 10;
const COUNTER = { x: 38, y: 22, w: 38, d: 22, r: 2 };
const COUNTER_H = 15;
const STRIP = { x: -52, y: PLATE.y + PLATE.d - 13, w: 124, d: 7, r: 1 };
const LABEL = { x: 42, y: -64, w: 22, d: 11, r: 1.2 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(FEED, LID_TOP, LID_TOP), [MOTOR[0], MOTOR[1], KNOB_TOP], [MOTOR[0] - MOTOR_R, MOTOR[1], KNOB_TOP]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const halo = (plan, z, h, blur = 6) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}" style="filter:blur(${blur}px)"/>`;
const screw = (x, y, z, r = 1.6) => L(k.ring(x, y, r, z, P, 16), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });
const box = (plan, z, h, tone = "mid", steps = 4, bevel = 0.6, extra = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...extra });
const faceGroup = (origin, z, face, inner) => `<g transform="${k.sideMatrix(origin, z, P, face)}">${inner}</g>`;

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "lo", inner: L(k.sideSeam(PLATE, -3.4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  for (const [x, y] of k.corners(PLATE, 10)) out.push(screw(x, y, 0, 2.2));
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(STRIP.x + 4, STRIP.x + STRIP.w - 4, 4, 5, STRIP.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([STRIP.x + 2, STRIP.y + 3.5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3.5, 0.6])], { size: 0.45 }));
  out.push(S(k.slabOf(LABEL, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 4), { tone: "faint" }));
  [[15, 3.6], [11, 6], [13, 8.4]].forEach(([w, dy]) => out.push(L(k.lineOnTop([LABEL.x + 5, LABEL.y + dy], [LABEL.x + 5 + w, LABEL.y + dy], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([LABEL.x + 2.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 2.6, LABEL.y + LABEL.d / 2, 0.8])], { size: 0.42 }));
  return out.join("");
}

function buttonBox() {
  const out = [halo(BTN_BOX, 0, 0.1, 4)];
  out.push(box(BTN_BOX, 0, BTN_Z, "mid", 4, 0.6, { inner: L(k.sideSeam(BTN_BOX, 2.2, P, 4), { tone: "faint" }) }));
  for (const [x, y] of [[BTN_BOX.x + 3, BTN_BOX.y + 3], [BTN_BOX.x + BTN_BOX.w - 3, BTN_BOX.y + BTN_BOX.d - 3], [BTN_BOX.x + 3, BTN_BOX.y + BTN_BOX.d - 3]]) out.push(screw(x, y, BTN_Z, 1.1));
  out.push(S(k.cylinder(BTN[0], BTN[1], 6.2, BTN_Z, 1.2, P, 36, 0.4), { tone: "mid" }));
  out.push(L(k.ring(BTN[0], BTN[1], 5, BTN_Z + 1.2, P, 32), { tone: "faint" }));
  // terminal post the cable lands on
  out.push(S(k.cylinder(BTN_BOX.x + BTN_BOX.w - 3.5, BTN_BOX.y + 3.5, 1.6, BTN_Z, 1.6, P, 6), { tone: "mid" }));
  return out.join("");
}

function buttonCap() {
  return S(k.cylinder(BTN[0], BTN[1], 4.4, BTN_Z + 1.2, 2.6, P, 32, 0.4), { tone: "hi", lit: true }) + L(k.ring(BTN[0], BTN[1], 2.4, BTN_Z + 3.8, P, 20), { tone: "lo" });
}

function solenoid() {
  const out = [halo(SOL_FLANGE, 0, 0.1, 5)];
  out.push(box(SOL_FLANGE, 0, 1.6, "lo", 4, 0.4));
  for (const [x, y] of k.corners(SOL_FLANGE, 2.4)) out.push(screw(x, y, 1.6, 1.1));
  const seams = [5, SOL_H - 5].map((z) => k.sideSeam(SOL, z, P, 3)).join("");
  out.push(box(SOL, 1.6, SOL_H - 1.6, "mid", 3, 0.6, { inner: L(seams, { tone: "faint" }) }));
  // coil window on the +x face, with winding lines edge to edge inside it
  const win = (y0, y1, z0, z1) => k.pathOf([at([SOL.x + SOL.w, y0, z0]), at([SOL.x + SOL.w, y1, z0]), at([SOL.x + SOL.w, y1, z1]), at([SOL.x + SOL.w, y0, z1])], true);
  out.push(`<path class="iso-shade" data-shade="0" d="${win(-60, -38, 7.5, SOL_H - 7.5)}"/>`);
  const windings = [];
  for (let z = 8.5; z < SOL_H - 7.6; z += 1.1) windings.push(k.segment([SOL.x + SOL.w, -60, z], [SOL.x + SOL.w, -38, z], P));
  out.push(L(windings.join(""), { tone: "faint" }));
  out.push(L(win(-60, -38, 7.5, SOL_H - 7.5), { tone: "lo" }));
  // screws on the front face
  out.push(D([[-7.5, 4.2], [7.5, 4.2], [-7.5, SOL_H - 3], [7.5, SOL_H - 3]].map(([x, z]) => at([x, SOL.y + SOL.d, z])), { size: 0.45 }));
  // terminal block
  const block = { x: -7, y: -61, w: 14, d: 8, r: 1 };
  out.push(box(block, SOL_H, 3.2, "lo", 3, 0.4));
  for (const x of [-3.5, 3.5]) {
    out.push(S(k.cylinder(x, -57, 1.5, SOL_H + 3.2, 1, P, 6), { tone: "mid" }));
    out.push(D([at([x, -57, SOL_H + 4.2])], { size: 0.4 }));
  }
  // gland boss where the rod leaves
  out.push(box({ x: -4, y: SOL.y + SOL.d, w: 8, d: 1.6, r: 0.6 }, ROD_Z - 4, 8, "mid", 3, 0.3));
  out.push(L(k.sideRing([0, GLAND_Y, ROD_Z], 2.2, "y", P, 20), { tone: "lo" }));
  return out.join("");
}

function cable() {
  const from = [3.5, -57, SOL_H + 4.2];
  const to = [BTN_BOX.x + BTN_BOX.w - 3.5, BTN_BOX.y + 3.5, BTN_Z + 1.6];
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const mid = [34, -50, 40];
    const p = [0, 1, 2].map((j) => (1 - t) ** 2 * from[j] + 2 * (1 - t) * t * mid[j] + t ** 2 * to[j]);
    pts.push(at(p));
  }
  return `<g class="iso-wire" data-tone="mid"><path class="iso-line" data-tone="mid" d="${k.pathOf(pts)}" style="stroke-width:1.3"/><circle class="iso-wire-end" cx="${pts[0][0].toFixed(1)}" cy="${pts[0][1].toFixed(1)}" r="0.9"/><circle class="iso-wire-end" cx="${pts[24][0].toFixed(1)}" cy="${pts[24][1].toFixed(1)}" r="0.9"/></g>`;
}

function pillar() {
  const [x, y] = PILLAR;
  const out = [];
  out.push(S(k.cylinder(x, y, 4, 0, 1.6, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 2.4, 1.6, CAP_TOP - 1.6 - 2, P, 24), { tone: "mid", crease: "none", inner: L([14, 30, 46].map((z) => k.sideArc(x, y, 2.4, z, P, 16)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 3.4, CAP_TOP - 2, 2, P, 24), { tone: "mid" }));
  return out.join("");
}

function pedestal() {
  const out = [halo(PED_FLANGE, 0, 0.1, 6)];
  out.push(box(PED_FLANGE, 0, 2.5, "lo", 5, 0.5));
  for (const [x, y] of k.corners(PED_FLANGE, 2.6)) out.push(screw(x, y, 2.5, 1.2));
  out.push(box(PED, 2.5, SEAT - 2.5, "mid", 5, 0.8, { inner: L(k.sideSeam(PED, 9.5, P, 5), { tone: "faint" }) }));
  // the blade runs in a shallow channel, edge to edge across the top
  out.push(L([-9.6, 9.6].map((x) => k.lineOnTop([x, PED.y], [x, PED.y + PED.d], SEAT, P)).join(""), { tone: "faint" }));
  out.push(L(k.ring(0, 0, TOKEN_R + 0.6, SEAT, P, 56), { tone: "faint" }));
  out.push(D([at([-19, -22.5, SEAT]), at([19, -22.5, SEAT])], { size: 0.45 }));
  out.push(k.faceTextSvg(k.sideMatrix([0, PED.y + PED.d], 5.6, P, "left"), `MAX ${B}`, { size: 3, tone: "lo", anchor: "middle" }));
  return out.join("");
}

function cupBack(plan, h) {
  const out = [halo(plan, 0, 0.1, 4)];
  out.push(box(plan, 0, FLOOR, "lo", 4, 0));
  out.push(L(k.planOutline(k.insetPlan(plan, WALL + 1.6), FLOOR, P, 3), { tone: "faint" }));
  out.push(box({ x: plan.x, y: plan.y, w: plan.w, d: WALL, r: 0.5 }, 0, h, "mid", 3, 0.4));
  out.push(box({ x: plan.x, y: plan.y + WALL, w: WALL, d: plan.d - WALL * 2, r: 0.5 }, 0, h, "mid", 3, 0.4));
  return out.join("");
}

function cupFront(plan, h) {
  const out = [];
  out.push(box({ x: plan.x + plan.w - WALL, y: plan.y + WALL, w: WALL, d: plan.d - WALL * 2, r: 0.5 }, 0, h, "mid", 3, 0.4));
  out.push(box({ x: plan.x, y: plan.y + plan.d - WALL, w: plan.w, d: WALL, r: 0.5 }, 0, h, "mid", 3, 0.4));
  out.push(D([at([plan.x + 3, plan.y + plan.d, h - 2.4]), at([plan.x + plan.w - 3, plan.y + plan.d, h - 2.4])], { size: 0.42 }));
  return out.join("");
}

function columnBack() {
  const out = [];
  out.push(box(CHEEK_L, SEAT, CHEEK_TOP - SEAT, "mid", 3, 0.4));
  return out.join("");
}

function bridgesBack() {
  const out = [];
  out.push(box(BRIDGE_B, CHEEK_TOP, BRIDGE_TOP - CHEEK_TOP, "mid", 3, 0.4));
  out.push(D([at([-17.5, -14.3, BRIDGE_TOP]), at([17.5, -14.3, BRIDGE_TOP])], { size: 0.42 }));
  for (const [x, y] of POSTS.back) out.push(post(x, y));
  return out.join("");
}

function post(x, y) {
  const z0 = y === 0 ? CHEEK_TOP : BRIDGE_TOP;
  return S(k.cylinder(x, y, POST_R, z0, CAP_Z - z0, P, 16), { tone: "mid", crease: "none", inner: L([30, 44].map((z) => k.sideArc(x, y, POST_R, z, P, 10)).join(""), { tone: "faint" }) });
}

function columnFront() {
  const out = [];
  out.push(box(CHEEK_R, SEAT, CHEEK_TOP - SEAT, "mid", 3, 0.4));
  out.push(box(BRIDGE_F, CHEEK_TOP, BRIDGE_TOP - CHEEK_TOP, "mid", 3, 0.4));
  out.push(D([at([-17.5, 14.3, BRIDGE_TOP]), at([17.5, 14.3, BRIDGE_TOP])], { size: 0.42 }));
  out.push(D([at([16.75, -12, CHEEK_TOP]), at([16.75, 8, CHEEK_TOP])], { size: 0.42 }));
  for (const [x, y] of POSTS.front) out.push(post(x, y));
  return out.join("");
}

function cap() {
  const out = [];
  out.push(box(CAP, CAP_Z, CAP_TOP - CAP_Z, "mid", 5, 0.6));
  out.push(screw(-15, 17, CAP_TOP, 1.2), screw(15, 17, CAP_TOP, 1.2));
  return out.join("");
}

function feeder() {
  const out = [];
  const [sx, sy] = SPILL;
  out.push(S(k.cylinder(sx, sy, TOKEN_R + 2.4, SPOUT_Z, 1.2, P, 56), { tone: "mid" }));
  out.push(S(k.cylinder(sx, sy, TOKEN_R + 1.6, SPOUT_Z + 1.2, CAP_TOP - SPOUT_Z - 1.2, P, 56), { tone: "mid", crease: "none" }));
  out.push(box(FEED, CAP_TOP, FEED_TOP - CAP_TOP, "mid", 5, 0, { inner: L(k.sideSeam(FEED, CAP_TOP + 2.2, P, 5), { tone: "faint" }) }));
  out.push(D([-56, -36, -16, 4].map((x) => at([x, FEED.y + FEED.d, CAP_TOP + 6.6])), { size: 0.45 }));
  out.push(D([-20, -6, 8].map((y) => at([FEED.x + FEED.w, y, CAP_TOP + 6.6])), { size: 0.45 }));
  out.push(box(LID, FEED_TOP, LID_TOP - FEED_TOP, "mid", 4, 0.6));
  for (const [x, y] of k.corners(LID, 3)) out.push(screw(x, y, LID_TOP, 1.1));
  for (let i = 0; i < 4; i++) out.push(L(k.planOutline({ x: -57 + i * 3.2, y: -20, w: 1.4, d: 22, r: 0.7 }, LID_TOP, P, 3), { tone: "lo" }));
  // star wheel seat and fixed index
  out.push(L(k.ring(WHEEL[0], WHEEL[1], WHEEL_R + 1.2, LID_TOP, P, 48), { tone: "faint" }));
  out.push(S(k.cylinder(WHEEL[0], WHEEL[1], WHEEL_R, LID_TOP, WHEEL_TOP - LID_TOP, P, 56, 0.5), { tone: "mid" }));
  out.push(box({ x: WHEEL[0] + WHEEL_R + 1.4, y: WHEEL[1] - 1, w: 3, d: 2, r: 0.4 }, LID_TOP, 1.2, "mid", 2, 0));
  // motor can with the rate knob
  out.push(S(k.cylinder(MOTOR[0], MOTOR[1], MOTOR_R + 1.4, LID_TOP, 1.2, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(MOTOR[0], MOTOR[1], MOTOR_R, LID_TOP + 1.2, MOTOR_TOP - LID_TOP - 1.2, P, 48, 0.5), { tone: "mid", inner: L([LID_TOP + 3.6, MOTOR_TOP - 2.2].map((z) => k.sideArc(MOTOR[0], MOTOR[1], MOTOR_R, z, P, 28)).join(""), { tone: "faint" }) }));
  const ticks = k.radialTicks(MOTOR[0], MOTOR[1], MOTOR_R - 0.5, RATES.length - 1, 1, MOTOR_TOP, [1.1, 1.1], P, DIAL_FROM, DIAL_SPAN);
  out.push(L(ticks.major, { tone: "mid" }));
  out.push(S(k.cylinder(MOTOR[0], MOTOR[1], KNOB_R, MOTOR_TOP, KNOB_TOP - MOTOR_TOP, P, 36), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(MOTOR[0], MOTOR[1], KNOB_R, MOTOR_TOP, KNOB_TOP, 30, P), { tone: "lo" }));
  return out.join("");
}

function counter() {
  const out = [halo(COUNTER, 0, 0.1, 4)];
  out.push(box(COUNTER, 0, COUNTER_H, "mid", 4, 0.6, { inner: L(k.sideSeam(COUNTER, 2.4, P, 4), { tone: "faint" }) }));
  for (const [x, y] of k.corners(COUNTER, 2.6)) out.push(screw(x, y, COUNTER_H, 1));
  for (const cx of [COUNTER.x + 10.5, COUNTER.x + 27.5]) {
    out.push(S(k.cylinder(cx, COUNTER.y + 8, 2.2, COUNTER_H, 1.4, P, 20), { tone: "mid" }));
    out.push(L(k.ring(cx, COUNTER.y + 8, 1.1, COUNTER_H + 1.4, P, 12), { tone: "lo" }));
  }
  const windows = [4, 21].map((u) => `<path class="iso-shade" data-shade="0" d="M${u} 4.2H${u + 13}V10.8H${u}Z"/><path class="iso-line" data-tone="lo" d="M${u} 4.2H${u + 13}V10.8H${u}Z"/>`).join("");
  const digits = [10.5, 27.5].map((u, i) => `<text class="iso-face-text" data-tone="hi" data-counter="${i}" x="${u}" y="9.3" font-size="5" text-anchor="middle">000</text>`).join("");
  out.push(faceGroup([COUNTER.x, COUNTER.y + COUNTER.d], COUNTER_H, "left", `<clipPath id="tb-win"><path d="M4 4.2H17V10.8H4ZM21 4.2H34V10.8H21Z"/></clipPath>${windows}<g clip-path="url(#tb-win)">${digits}</g>`));
  return out.join("");
}

function token(lit = false) {
  return (
    S(k.cylinder(0, 0, TOKEN_R, 0, T, P, 64, 0.5), { tone: "hi", crease: "lo", lit, inner: L(k.knurl(0, 0, TOKEN_R, 0, T, 40, P, 0.3), { tone: "faint" }) }) +
    L(k.ring(0, 0, TOKEN_R - 2.2, T, P, 48), { tone: "lo" }) +
    L(k.ring(0, 0, 3, T, P, 24), { tone: "faint" })
  );
}

const hide = (part, i, x, y, z) => `<g data-part="${part}" data-i="${i}" transform="${k.translateAlong(P, [x, y, z])}" style="display:none">${token()}</g>`;
const stackPool = Array.from({ length: B }, (_, i) => `<g data-part="stack" data-i="${i}" transform="${k.translateAlong(P, [0, 0, SEAT + T * i])}"${i < B ? "" : ' style="display:none"'}>${token()}</g>`);
const ejectPool = [0, 1, 2].map((i) => hide("eject", i, 0, 0, SEAT));
const spillPool = [0, 1].map((i) => hide("spill", i, SPILL[0], SPILL[1], SPOUT_Z + 0.5));

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A token bucket built as a coin magazine. A motor on top mints one token at a set rate and drops it into a column of guide posts that holds at most eight tokens; when the column is full the token falls out of a spout into a spill bin instead. A push button fires a solenoid whose pusher slides the bottom token out into a cup, admitting the request; if the column is empty the pusher strokes through nothing and the request is denied. Two counters tally admitted and denied requests.",
  body: [
    plate(),
    solenoid(),
    pillar(),
    cupBack(BIN, BIN_H),
    `<g data-layer="spill">${spillPool.join("")}</g>`,
    cupFront(BIN, BIN_H),
    pedestal(),
    buttonBox() + `<g data-part="button-cap">${buttonCap()}</g>`,
    cable(),
    cupBack(CUP, BIN_H),
    columnBack(),
    `<g data-part="spring-back"><path class="iso-line" data-tone="lo" d=""/></g>`,
    `<g data-part="rod"></g>`,
    `<g data-part="spring-front"><path class="iso-line" data-tone="mid" d=""/></g>`,
    `<g data-part="blade">${S(k.slabOf(BLADE, BLADE_Z, BLADE_H, P, 2, 0.4), { tone: "hi", lit: true })}</g>`,
    bridgesBack(),
    `<g data-layer="eject">${ejectPool.join("")}</g>`,
    `<g data-layer="stack">${stackPool.join("")}</g>`,
    columnFront(),
    cupFront(CUP, BIN_H),
    counter(),
    cap(),
    feeder(),
    `<path data-part="wheel" class="iso-line" data-tone="hi" d=""/>`,
    `<path data-part="knob" class="iso-line" data-tone="hi" data-free="end" d="" style="stroke-width:1"/>`,
    S(k.cylinder(WHEEL[0], WHEEL[1], 2.6, WHEEL_TOP, 1.4, P, 24), { tone: "hi", crease: "lo" }),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const B = ${B}, T = ${T}, SEAT = ${SEAT}, CAP_Z = ${CAP_Z}, SPOUT_Z = ${SPOUT_Z}, FLOOR = ${FLOOR}, LAND = ${LAND}, STROKE = ${STROKE};
const RATES = ${JSON.stringify(RATES)};
const WHEEL = ${JSON.stringify(WHEEL)}, WHEEL_R = ${WHEEL_R}, WHEEL_TOP = ${WHEEL_TOP}, NOTCHES = ${NOTCHES};
const MOTOR = ${JSON.stringify(MOTOR)}, KNOB_R = ${KNOB_R}, KNOB_TOP = ${KNOB_TOP}, DIAL_FROM = ${DIAL_FROM}, DIAL_SPAN = ${DIAL_SPAN};
const SPILL = ${JSON.stringify(SPILL)};
const BLADE = ${JSON.stringify(BLADE)}, GLAND_Y = ${GLAND_Y}, ROD_Z = ${ROD_Z};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const q = (sel) => svg.querySelector(sel);
const stackEls = [...svg.querySelectorAll('[data-part="stack"]')];
const ejectEls = [...svg.querySelectorAll('[data-part="eject"]')];
const spillEls = [...svg.querySelectorAll('[data-part="spill"]')];
const blade = q('[data-part="blade"]'), rod = q('[data-part="rod"]');
const springBack = q('[data-part="spring-back"] path'), springFront = q('[data-part="spring-front"] path');
const wheel = q('[data-part="wheel"]'), knob = q('[data-part="knob"]'), cap = q('[data-part="button-cap"]');
const counters = [...svg.querySelectorAll("[data-counter]")];
const readout = document.querySelector("[data-readout]");
const say = document.querySelector("[data-say]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const G = 1700;

// model
let rateIndex = ${RATE_START}, tokens = B, phase = 0, minted = 0, admitted = 0, denied = 0, spilled = 0, last = "full";
// picture
const stack = Array.from({ length: B }, (_, i) => ({ z: SEAT + T * i, v: 0 }));
const ejects = ejectEls.map(() => ({ on: false }));
const spills = spillEls.map(() => ({ on: false }));
let pending = 0, stroke = null, press = 0;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const OUT = 0.08, HOLD = 0.02, BACK = 0.1;
const strokeAt = (t) => (t < OUT ? ease(t / OUT) : t < OUT + HOLD ? 1 : t < OUT + HOLD + BACK ? 1 - ease((t - OUT - HOLD) / (OUT + HOLD + BACK - OUT - HOLD)) : 0) * STROKE;

function mint() {
  minted++;
  if (tokens < B) { tokens++; stack.push({ z: still.matches ? SEAT + T * (stack.length) : CAP_Z, v: 0 }); last = "token added"; }
  else {
    spilled++; last = "full: token spilled";
    const s = spills.find((x) => !x.on);
    if (s && !still.matches) Object.assign(s, { on: true, z: SPOUT_Z + 0.5, v: 0, a: 1 });
  }
}
function request() { if (pending < 3) pending++; kick(); }
function serve() {
  if (stroke || !pending) return;
  if (tokens > 0 && (stack[0].z > SEAT + 0.01)) return;
  pending--; press = 1;
  if (tokens > 0) {
    tokens--; admitted++; last = "admitted";
    stack.shift();
    const e = ejects.find((x) => !x.on) || ejects[0];
    Object.assign(e, { on: true, y: 0, z: SEAT, vy: 0, v: 0, a: 1, free: false });
    stroke = { t: 0, carry: e };
  } else { denied++; last = "denied: bucket empty"; stroke = { t: 0, carry: null }; }
  if (say) say.textContent = last + ", " + tokens + " of " + B + " tokens left";
  if (still.matches) { if (stroke.carry) stroke.carry.on = false; stroke = null; }
}

function drawStroke(s) {
  blade.setAttribute("transform", translateAlong(P, [0, s, 0]));
  const back = BLADE.y + s;
  rod.innerHTML = solidSvg(slabOf({ x: -1, y: GLAND_Y, w: 2, d: Math.max(0.1, back - GLAND_Y), r: 0.4 }, ROD_Z - 1, 2, P, 2), { tone: "hi", lit: true, crease: "none" });
  const c = coil(GLAND_Y + 0.3, back - 0.3, [0, ROD_Z], 1.7, 7, "y", P, 14);
  springBack.setAttribute("d", c.back);
  springFront.setAttribute("d", c.front);
}
function drawWheel() {
  const turn = (minted + phase) / NOTCHES * Math.PI * 2;
  let d = "";
  for (let i = 0; i < NOTCHES; i++) {
    const a = turn + (i / NOTCHES) * Math.PI * 2, sx = Math.sin(a), sy = -Math.cos(a);
    d += lineOnTop([WHEEL[0] + sx * 2.4, WHEEL[1] + sy * 2.4], [WHEEL[0] + sx * WHEEL_R, WHEEL[1] + sy * WHEEL_R], WHEEL_TOP, P);
  }
  wheel.setAttribute("d", d);
  const k = DIAL_FROM + (rateIndex / (RATES.length - 1)) * DIAL_SPAN;
  knob.setAttribute("d", lineOnTop([MOTOR[0], MOTOR[1]], [MOTOR[0] + Math.sin(k) * (KNOB_R - 0.6), MOTOR[1] - Math.cos(k) * (KNOB_R - 0.6)], KNOB_TOP, P));
}
const pad = (n) => String(n % 1000).padStart(3, "0");
let shown = "";
function draw() {
  const s = stroke ? strokeAt(stroke.t) : 0;
  drawStroke(s);
  stackEls.forEach((el, i) => {
    const item = stack[i];
    if (!item) { if (el.style.display !== "none") el.style.display = "none"; return; }
    el.style.display = "";
    el.setAttribute("transform", translateAlong(P, [0, 0, item.z]));
  });
  ejectEls.forEach((el, i) => {
    const e = ejects[i];
    el.style.display = e.on ? "" : "none";
    if (!e.on) return;
    el.setAttribute("transform", translateAlong(P, [0, e.y, e.z]));
    el.setAttribute("opacity", e.a.toFixed(3));
  });
  spillEls.forEach((el, i) => {
    const e = spills[i];
    el.style.display = e.on ? "" : "none";
    if (!e.on) return;
    el.setAttribute("transform", translateAlong(P, [SPILL[0], SPILL[1], e.z]));
    el.setAttribute("opacity", e.a.toFixed(3));
  });
  cap.setAttribute("transform", translateAlong(P, [0, 0, -1.4 * press]));
  drawWheel();
  counters[0].textContent = pad(admitted);
  counters[1].textContent = pad(denied);
  const text = tokens + " of " + B + " tokens · " + RATES[rateIndex] + "/s · " + last;
  if (text !== shown) { readout.textContent = text; shown = text; }
}

function fall(item, floor, dt) {
  if (item.z > floor) { item.v += G * dt; item.z -= item.v * dt; if (item.z <= floor) { item.z = floor; item.v = 0; } }
  else { item.z = floor; item.v = 0; }
}
function step(dt) {
  const calm = still.matches;
  phase += RATES[rateIndex] * dt;
  while (phase >= 1) { phase -= 1; mint(); }
  serve();
  if (stroke) {
    stroke.t += dt;
    const s = strokeAt(stroke.t), e = stroke.carry;
    if (e && !e.free) { e.y = s; if (stroke.t >= OUT) { e.free = true; e.vy = 60; } }
    if (stroke.t >= OUT + HOLD + BACK) stroke = null;
  }
  const s = stroke ? strokeAt(stroke.t) : 0;
  const base = s > 0.5 ? SEAT + 3.8 : SEAT;
  stack.forEach((item, i) => (calm ? (item.z = base + T * i, item.v = 0) : fall(item, base + T * i, dt)));
  for (const e of ejects) {
    if (!e.on || !e.free) continue;
    if (e.z > FLOOR) { e.y = Math.min(LAND, e.y + e.vy * dt); fall(e, FLOOR, dt); }
    else { e.a -= dt / 0.6; if (e.a <= 0) e.on = false; }
  }
  for (const e of spills) {
    if (!e.on) continue;
    if (e.z > FLOOR) fall(e, FLOOR, dt); else { e.a -= dt / 0.6; if (e.a <= 0) e.on = false; }
  }
  press = Math.max(0, press - dt / 0.25);
}

// idle tour: full bucket spilling, a burst that drains it, then a trickle below the refill rate
const TOUR = [];
for (let t = 3; t < 7.3; t += 0.28) TOUR.push(t);
for (let t = 9; t < 15.5; t += 1.4) TOUR.push(t);
const TOUR_LEN = 23;
let touring = !still.matches, clock = 0, next = 0, frame = 0, lastNow = 0, visible = false, idle = 0, hold = 0;
function tour(dt) {
  const before = clock;
  clock += dt;
  for (const t of TOUR) if (t > before && t <= clock) request();
  if (clock >= TOUR_LEN) { clock -= TOUR_LEN; }
}
function tick(now) {
  const dt = lastNow ? Math.min((now - lastNow) / 1000, 1 / 30) : 1 / 60;
  lastNow = now;
  if (touring) tour(dt);
  step(dt);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
function kick() { if (!frame && visible) { lastNow = 0; frame = requestAnimationFrame(tick); } }
function user() {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => { touring = !still.matches; clock = 0; }, 8000);
}
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  user(); request();
  clearInterval(hold);
  hold = setInterval(() => { user(); request(); }, 280);
});
const release = () => clearInterval(hold);
stage.addEventListener("pointerup", release);
stage.addEventListener("pointerleave", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); if (!event.repeat || pending < 2) { user(); request(); } return; }
  let to = null;
  if (event.key === "ArrowUp" || event.key === "ArrowRight") to = Math.min(RATES.length - 1, rateIndex + 1);
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") to = Math.max(0, rateIndex - 1);
  if (to === null) return;
  event.preventDefault(); user();
  rateIndex = to;
  if (say) say.textContent = "refill " + RATES[rateIndex] + " tokens per second";
  kick();
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Token bucket",
  hint: "Click to request · ↑↓ rate",
  readout: `${B} of ${B} tokens · ${RATES[RATE_START]}/s · full`,
  keys: [
    { mark: "lit", label: "The request: button, solenoid rod and pusher" },
    { mark: "raised", label: `Tokens: the column holds ${B}, the bucket's burst size` },
    { mark: "flat", label: "Star wheel: one notch per minted token; knob sets the rate r" },
    { mark: "dim", label: "Counters: admitted (left), denied (right)" },
  ],
  caption: `A token bucket holds at most ${B} tokens. The motor mints one token every 1/r seconds, and a token minted while the column is full falls through the spout into the spill bin and is lost. Each request fires the solenoid: if the column holds a token, the pusher slides the bottom one into the cup and the request is admitted; if it is empty, the stroke comes back empty and the request is denied. So a burst of up to ${B} gets through at once, and over any t seconds no more than ${B} + r·t requests are admitted.`,
  body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Token bucket. Space or Enter sends a request; arrow keys change the refill rate." style="cursor:pointer;touch-action:manipulation;user-select:none">${svg}<span data-say aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></span></div>`,
});

const name = theme === "light" ? "token-bucket-light.html" : "token-bucket.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Token bucket", theme, body, script: kitScript() + live }));
console.log("wrote", name);
