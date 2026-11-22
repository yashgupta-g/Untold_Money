import type { Icon } from "@phosphor-icons/react";

import m from "./metal.module.css";

/**
 * Turns a solid (fill) icon into a polished, extruded orange-metal object:
 * a copper-orange face, bevelled edges that catch a slowly moving light, and
 * a darker extruded side with a soft shadow. Pure SVG filters, so any icon
 * from the set works and it stays crisp at any size.
 * Render <MetalDefs /> once on the page; every MetalIcon uses it.
 */
export function MetalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="goonj-metal-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd7b0" />
          <stop offset="28%" stopColor="#ffa15c" />
          <stop offset="58%" stopColor="#f47220" />
          <stop offset="100%" stopColor="#a8420c" />
        </linearGradient>

        <filter id="goonj-metal" x="-25%" y="-25%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          {/* extruded side: the shape stepped down-right, in dark ember */}
          <feOffset in="SourceAlpha" dx="2" dy="3" result="o1" />
          <feOffset in="SourceAlpha" dx="4" dy="6" result="o2" />
          <feOffset in="SourceAlpha" dx="6" dy="9" result="o3" />
          <feOffset in="SourceAlpha" dx="8" dy="12" result="o4" />
          <feMerge result="depth">
            <feMergeNode in="o1" />
            <feMergeNode in="o2" />
            <feMergeNode in="o3" />
            <feMergeNode in="o4" />
          </feMerge>
          <feFlood floodColor="#5a1f06" result="sideColor" />
          <feComposite in="sideColor" in2="depth" operator="in" result="side" />
          <feGaussianBlur in="depth" stdDeviation="1.2" result="sideSoft" />
          <feSpecularLighting
            in="sideSoft"
            surfaceScale="3"
            specularConstant="0.7"
            specularExponent="16"
            lightingColor="#ff9a52"
            result="sideSpec"
          >
            <feDistantLight azimuth="45" elevation="35" />
          </feSpecularLighting>
          <feComposite in="sideSpec" in2="depth" operator="in" result="sideSpecIn" />
          <feComposite in="side" in2="sideSpecIn" operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0" result="sideLit" />

          {/* bevelled face: shade it, then add a moving specular highlight */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="6" diffuseConstant="1.15" lightingColor="#ffffff" result="diffuse">
            <feDistantLight azimuth="225" elevation="48" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="diffuse" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="shaded" />
          <feSpecularLighting
            in="bump"
            surfaceScale="6"
            specularConstant="1.25"
            specularExponent="26"
            lightingColor="#fff1e2"
            result="spec"
          >
            <feDistantLight azimuth="225" elevation="40">
              <animate attributeName="azimuth" values="200;260;200" dur="7s" repeatCount="indefinite" />
            </feDistantLight>
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.9" k4="0" result="face" />

          {/* soft contact shadow under the whole object */}
          <feOffset in="depth" dx="2" dy="6" result="shOff" />
          <feGaussianBlur in="shOff" stdDeviation="7" result="shBlur" />
          <feFlood floodColor="#000000" floodOpacity="0.7" result="shColor" />
          <feComposite in="shColor" in2="shBlur" operator="in" result="shadow" />

          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="sideLit" />
            <feMergeNode in="face" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

/** The metal glyph alone, sized by its container (for large showcase pieces). */
export function MetalGlyph({ icon: Glyph, className }: { icon: Icon; className?: string }) {
  return (
    <svg className={className} viewBox="-24 -24 304 304" aria-hidden focusable="false">
      <g filter="url(#goonj-metal)">
        <Glyph weight="fill" size={256} color="url(#goonj-metal-face)" />
      </g>
    </svg>
  );
}

/** A metal icon on a small black tile. */
export function MetalIcon({ icon, className }: { icon: Icon; className?: string }) {
  return (
    <span className={`${m.tile} ${className ?? ""}`} aria-hidden>
      <MetalGlyph icon={icon} className={m.svg} />
    </span>
  );
}
