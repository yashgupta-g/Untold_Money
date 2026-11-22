import { GETS_YOU } from "../static";
import r from "./echo-rings.module.css";

const W = 1200;
const CX = W / 2;
const CY = 600;
const INNER = 118; // radius of the dark core around the logo
const BAND = 60;
const GAP = 26;

/** An arc over the top, left to right, so text on it reads normally. */
const arc = (rad: number) => `M ${CX - rad} ${CY} A ${rad} ${rad} 0 0 1 ${CX + rad} ${CY}`;

/**
 * The footer's echo: the Goonj logo at the bottom centre, with rings
 * spreading out from it like sound. Each band carries one of the things
 * "Goonj gets you" promises, written along its curve, warmest at the centre
 * and fading as it travels out. A soft pulse runs outward through the bands.
 */
export function EchoRings() {
  const items = GETS_YOU.items.map((g) => g.title);
  return (
    <div className={r.wrap} aria-hidden>
      <svg className={r.svg} viewBox={`0 0 ${W} ${CY}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="echo-core" cx="50%" cy="100%" r="40%">
            <stop offset="0%" stopColor="#f47220" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f47220" stopOpacity="0" />
          </radialGradient>
          {items.map((_, i) => {
            const mid = INNER + i * (BAND + GAP) + BAND / 2;
            return <path key={i} id={`echo-arc-${i}`} d={arc(mid)} />;
          })}
        </defs>

        {items.map((label, i) => {
          const r0 = INNER + i * (BAND + GAP);
          const mid = r0 + BAND / 2;
          // warm at the centre, cooling and fading outward
          const t = i / (items.length - 1);
          return (
            <g key={label} className={r.ring} style={{ ["--i" as string]: i, ["--t" as string]: t }}>
              <path
                className={r.band}
                d={arc(mid)}
                fill="none"
                strokeWidth={BAND}
                style={{ ["--o" as string]: (0.42 - t * 0.33).toFixed(3) }}
              />
              <text className={r.label} dy="0.36em">
                <textPath href={`#echo-arc-${i}`} startOffset="50%" textAnchor="middle">
                  {label.toUpperCase()}
                </textPath>
              </text>
            </g>
          );
        })}

        <circle cx={CX} cy={CY} r={INNER + 40} fill="url(#echo-core)" />
        <image
          className={r.logo}
          href="/goonj/goonj-logo-script.svg"
          x={CX - 46}
          y={CY - 92}
          width={92}
          height={79}
        />
      </svg>
    </div>
  );
}
