import type { ReactNode, SVGProps } from "react";

/*
 * A tiny isometric drawing kit. World units are grid squares: x runs down to
 * the right, y down to the left, z straight up. `project` turns a world point
 * into SVG coordinates; IsoBox draws the three visible faces of a block and
 * IsoTop maps a 24×24 drawing (an icon) onto a block's top face.
 */

const COS30 = Math.cos(Math.PI / 6);

/** Scale (px per grid unit) and where world origin lands in the SVG. */
export type IsoView = { s: number; ox: number; oy: number };

export const project = (v: IsoView, x: number, y: number, z = 0): [number, number] => [
  (x - y) * COS30 * v.s + v.ox,
  (x + y) * 0.5 * v.s - z * v.s + v.oy,
];

const poly = (v: IsoView, pts: [number, number, number][]) =>
  pts
    .map(([x, y, z]) => project(v, x, y, z))
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");

export type Box = { x: number; y: number; z?: number; w: number; d: number; h: number };

/** Top, left (front-left) and right (front-right) faces of a block. */
export function IsoBox({
  view,
  box,
  className,
  faceClass,
  ...rest
}: {
  view: IsoView;
  box: Box;
  className?: string;
  /** Classes for each face, so a theme can shade them. */
  faceClass: { top: string; left: string; right: string };
} & Omit<SVGProps<SVGGElement>, "className">) {
  const { x, y, w, d, h } = box;
  const z = box.z ?? 0;
  const z1 = z + h;
  return (
    <g className={className} {...rest}>
      <polygon
        className={faceClass.left}
        points={poly(view, [
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, z1],
          [x, y + d, z1],
        ])}
      />
      <polygon
        className={faceClass.right}
        points={poly(view, [
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z1],
          [x + w, y, z1],
        ])}
      />
      <polygon
        className={faceClass.top}
        points={poly(view, [
          [x, y, z1],
          [x + w, y, z1],
          [x + w, y + d, z1],
          [x, y + d, z1],
        ])}
      />
    </g>
  );
}

/**
 * Lays a 24×24 drawing flat on a block's top face, inset by `inset` grid
 * units on every side. Children use 0–24 coordinates (Phosphor icons fit).
 */
export function IsoTop({
  view,
  box,
  inset = 0.4,
  children,
}: {
  view: IsoView;
  box: Box;
  inset?: number;
  children: ReactNode;
}) {
  const z1 = (box.z ?? 0) + box.h;
  const w = box.w - inset * 2;
  const d = box.d - inset * 2;
  const [ex, ey] = project(view, box.x + inset, box.y + inset, z1);
  const a = (COS30 * view.s * w) / 24;
  const b = (0.5 * view.s * w) / 24;
  const c = (-COS30 * view.s * d) / 24;
  const dd = (0.5 * view.s * d) / 24;
  return (
    <g
      transform={`matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${dd.toFixed(4)} ${ex.toFixed(1)} ${ey.toFixed(1)})`}
    >
      {children}
    </g>
  );
}

/** SVG path through world points, for data lines laid on a surface. */
export const isoPath = (v: IsoView, pts: [number, number, number][]) =>
  pts
    .map(([x, y, z], i) => {
      const [px, py] = project(v, x, y, z);
      return `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");

/** Where to pin an HTML label: the top-centre of a block, in % of the SVG. */
export const labelAt = (v: IsoView, box: Box, width: number, height: number) => {
  const [px, py] = project(v, box.x + box.w / 2, box.y + box.d / 2, (box.z ?? 0) + box.h);
  return { left: `${(px / width) * 100}%`, top: `${(py / height) * 100}%` };
};
