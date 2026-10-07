/**
 * Build SVG path strings for the small illustrative charts on the landing page.
 * `line` traces the values; `area` closes the same trace down to the baseline.
 */
export function seriesPaths(
  values: number[],
  width: number,
  height: number,
  pad = 4,
  domain: [number, number] = [Math.min(...values), Math.max(...values)],
): { line: string; area: string; last: { x: number; y: number } } {
  const [min, max] = domain;
  const span = max - min || 1;
  const step = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => ({
    x: pad + i * step,
    y: pad + (1 - (v - min) / span) * (height - pad * 2),
  }));

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L${last.x.toFixed(1)} ${height} L${first.x.toFixed(1)} ${height} Z`;

  return { line, area, last };
}

/** Arc segments for a donut, with a fixed gap (in degrees) between slices. */
export function donutSegments(
  shares: number[],
  radius: number,
  gapDeg = 3,
): { dashArray: string; dashOffset: number }[] {
  const circumference = 2 * Math.PI * radius;
  const total = shares.reduce((a, b) => a + b, 0);
  const gap = (gapDeg / 360) * circumference;
  let offset = 0;

  return shares.map((share) => {
    const length = (share / total) * circumference;
    const segment = {
      dashArray: `${Math.max(length - gap, 0).toFixed(2)} ${circumference.toFixed(2)}`,
      dashOffset: -offset,
    };
    offset += length;
    return segment;
  });
}
