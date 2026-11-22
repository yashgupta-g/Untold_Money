"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";

import { BrandLogo } from "../components/BrandLogo";
import { GOONJ, USP } from "../content";
import f from "./glassFooter.module.css";

const PRODUCT = [
  ["How it works", "#how"],
  ["Mentors", "#mentors"],
  ["Plans", "#plans"],
  ["Stories", "#stories"],
  ["FAQ", "#faq"],
] as const;

const COMPANY = [
  ["Contact", GOONJ.contact],
  ["LinkedIn", GOONJ.linkedin],
  ["Privacy", GOONJ.privacy],
  ["Terms", GOONJ.terms],
] as const;

/* the script logo's letter shapes (public/goonj/goonj-logo-script.svg, 233 x 200) */
const LOGO_PATHS = [
  "M211.481 20.5368C203.163 14.0001 208.513 1.19434 217.314 0.117499C225.084 -1.06994 231.784 6.92199 228.111 15.985C225.02 22.8826 216.766 25.2167 211.481 20.5426V20.5368ZM213.74 16.5205C216.411 18.4006 219.968 17.7545 222.052 15.1409C224.217 12.5914 223.466 9.83239 221.603 8.26077C219.374 6.38648 215.975 6.41559 213.839 8.51689C211.487 10.6648 211.26 14.361 213.734 16.5205H213.74Z",
  "M65.1121 53.4145C65.9794 51.546 66.5673 49.5612 67.1145 47.5704C68.6279 42.0523 68.6744 35.9114 66.0143 30.8473C56.3868 12.5235 34.7451 28.6587 25.5308 40.3818C17.0441 51.1793 10.6354 63.8337 6.6249 77.7803C3.59809 88.2694 1.96827 99.1077 2.92288 110.167C3.3769 115.458 4.49449 120.336 6.9625 124.847C10.7169 131.71 17.5039 135.074 24.3492 133.38C33.255 131.18 39.914 122.845 45.0886 114.207L43.4995 125.097C32.4575 136.221 20.4143 146.5 11.1709 159.265C7.03235 164.981 3.36526 171.268 1.47932 178.113C-0.0806464 183.777 -1.43107 191.873 3.06258 196.635C5.0591 198.748 8.02188 199.714 10.9206 199.941C16.3107 200.36 21.8753 198.538 26.3632 195.61C31.3108 192.386 35.0943 187.659 37.9931 182.572C41.0024 177.298 43.1561 171.559 44.8383 165.738C44.9548 165.342 45.0653 164.947 45.1759 164.551C47.1026 157.589 48.8197 149.975 50.0538 142.921C51.1481 136.675 52.4694 130.447 53.3018 124.154C57.6615 119.661 61.5964 114.981 65.5661 109.987C64.9317 117.443 66.4451 127.694 73.0226 130.313C80.3335 133.223 87.9587 127.583 92.6968 121.203C98.0636 113.986 101.457 105.359 103.279 95.8771C105.782 94.614 108.052 92.8328 110.299 90.813L110.008 96.2322C109.804 99.9342 110.095 104.079 111.166 107.525C112.941 113.229 117.179 116.477 122.424 115.976C136.417 114.649 145.893 94.0669 148.186 79.4916C151.033 78.0131 153.483 75.906 155.625 73.2634C156.138 72.6289 156.626 71.9712 157.104 71.296C157.278 71.0398 158.076 69.9863 158.233 69.7651C158.326 70.1318 158.413 70.8128 158.454 71.2669C158.507 71.8082 158.495 72.3437 158.477 72.8909C158.431 74.1481 158.326 75.388 158.186 76.6336C157.913 79.0783 157.488 81.4998 157.086 83.9154C156.172 89.4568 155.008 94.94 153.611 100.342C153.192 101.954 153.053 103.66 153.274 105.324C153.355 105.947 153.501 106.593 153.862 107.059C154.345 107.687 155.136 107.874 155.846 107.734C158.053 107.315 159.391 104.981 160.567 102.967C161.993 100.516 163.111 97.8329 164.095 95.0971C165.608 90.8771 166.807 86.4998 168.443 82.3438C168.821 81.395 169.217 80.4637 169.63 79.5382C171.435 75.5218 173.6 71.75 175.905 68.112C177.704 65.2831 179.496 62.2563 181.592 59.6602C182.139 58.985 183.105 59.4972 183.059 60.446C182.756 66.6859 181.4 72.7977 180.125 78.8397C179.124 83.572 178.14 88.7001 179.089 93.5604C179.287 94.5442 179.619 95.5512 180.311 96.1449C181.05 96.7852 182.052 96.8143 182.948 96.7153C184.886 96.5116 186.749 95.7432 188.42 94.5733C192.349 91.8259 195.765 87.7164 198.938 83.8339C200.358 82.0993 201.656 80.2541 203.041 78.4904C203.641 77.7221 204.281 76.9712 204.887 76.1971C205.067 75.9584 205.742 75.3589 205.795 75.0329L204.316 85.26C203.35 86.3951 202.407 87.5418 201.481 88.7117C195.632 96.2089 189.537 103.345 183.647 110.819C178.268 117.647 173.076 124.684 169.712 132.781C166.918 139.498 162.145 157.193 171.621 161.245C175.043 162.706 179.857 162.775 183.914 161.908C189.491 160.715 194.304 156.85 197.488 152.158C207.634 137.216 209.468 116.896 212.052 99.5151L214.52 83.7C221.214 75.842 227.122 67.1981 231.802 57.5414C233.013 55.0501 233.152 52.1805 232.204 49.5844C232.011 49.0606 231.424 48.9558 231.127 49.404C230.597 50.1956 230.219 50.9698 229.765 51.9186C226.074 59.6893 221.196 68.5893 215.684 74.5672C215.777 74.4683 215.783 73.9095 215.806 73.7698C216.569 68.7057 217.331 60.6265 218.094 55.5682C218.175 55.021 218.257 54.4739 218.333 53.9267C218.571 52.3609 218.792 50.801 219.025 49.2352C219.06 48.9674 219.101 48.7055 219.142 48.4377C219.602 45.3003 220.096 42.1688 220.597 39.043C221.074 36.0686 221.557 33.1058 222.052 30.1314C222.116 29.7472 222.18 29.3106 222.075 28.9265C221.971 28.5481 221.662 28.4725 221.354 28.5074C220.405 28.6122 219.532 29.1477 218.635 29.4911C217.669 29.8636 216.679 30.1663 215.69 30.4457C213.955 30.9405 211.807 31.994 211.435 34.3223C211.383 34.6541 211.324 34.9859 211.272 35.3177C210.434 40.4749 209.823 45.8009 208.618 50.8534C207.04 57.4541 204.724 63.8104 201.825 69.7593C200.102 73.3041 198.46 76.9479 196.185 80.0562C195.044 81.6104 193.734 83.0423 192.191 84.0202C191.208 84.643 189.956 85.3066 188.827 85.3357C188.117 85.3531 187.36 85.0214 186.993 84.2996C186.697 83.7117 186.708 82.9725 186.743 82.2972C186.778 81.5755 186.842 80.8595 186.947 80.1435C188.536 69.2994 190.858 58.6299 193.455 48.071C194.246 44.858 197.267 36.8136 192.774 35.3177C191.313 34.8288 189.485 36.1675 188.315 37.0698C186.947 38.1233 185.8 39.5319 184.735 40.9813C184.124 41.4353 183.571 42.4656 183.088 43.1059C182.506 43.8684 181.935 44.6426 181.371 45.4226C180.3 46.9011 179.263 48.4145 178.239 49.9453C176.091 53.17 174.013 56.4646 172.011 59.8232C170.771 61.9012 169.56 64.0025 168.384 66.1329C167.791 67.1981 167.203 68.2633 166.632 69.3402C166.464 69.6603 165.777 71.0864 165.561 71.5171C165.48 70.6382 165.468 69.8349 165.433 69.02C165.393 68.1178 165.34 67.2156 165.265 66.3134C165.072 63.8977 164.77 61.4938 164.351 59.1189C164.223 58.3564 164.048 57.5997 163.879 56.843C163.594 55.5682 163.315 54.1712 162.645 53.0478C161.667 51.4122 160.148 51.5577 158.699 52.1747C158.023 52.4657 157.383 52.9954 157.057 53.7521C156.446 55.1782 156.958 57.1223 157.057 58.6299C157.15 59.8872 157.273 61.1387 157.377 62.396C155.299 66.4822 152.668 71.4066 148.751 73.2925C149.222 65.999 147.686 57.3319 141.382 54.6951C138.891 53.6532 136.225 53.8744 133.594 54.6427C128.652 56.0804 124.566 59.6195 121.102 63.9792C117.732 68.2226 115.316 73.0189 113.32 78.31C111.422 83.345 108.331 87.5068 103.925 89.6023C104.036 85.6093 103.943 81.8141 102.947 78.1819C101.213 71.8198 96.2184 68.502 90.6246 69.6429C79.4138 71.9246 71.8875 84.1191 67.9294 95.912C65.7408 103.205 59.3554 110.819 54.4659 115.883C55.0771 108.124 56.3577 100.871 58.3251 93.5837L61.2588 82.7105C61.5964 81.4649 60.6185 80.2832 59.5591 80.6383L53.2377 82.7687C52.1143 83.1471 50.9385 84.5382 50.6242 85.8712L49.5124 90.5627C48.7674 93.6943 48.0863 96.6804 47.1143 99.8003C44.1922 109.114 36.7707 121.198 28.3539 123.939C24.2619 125.272 20.5366 123.374 18.2781 119.253C14.611 112.542 14.3083 102.536 15.1523 94.6548C15.4143 92.2217 15.7461 89.7653 16.1535 87.3089L17.7368 79.317C20.781 66.1446 25.9615 53.3214 33.2492 43.199C37.2655 37.6227 43.1154 31.0394 50.2167 29.7065C52.318 29.3106 54.594 29.5202 56.41 30.6494C58.3425 31.8485 59.5707 33.9673 60.1353 36.1734C60.9503 39.369 60.5137 42.7799 59.4601 45.9057C57.9176 50.4867 55.2634 54.6718 52.7313 58.758C48.7441 65.1841 44.1631 71.2319 39.2969 77.012C35.5658 81.4416 31.6543 85.7082 27.6146 89.8526C25.2689 92.2508 22.8823 94.614 20.4609 96.9307C19.1629 98.1763 17.8474 99.4045 16.5319 100.627C15.9265 101.186 12.3409 103.735 12.3525 104.428L12.5155 111.995C22.213 104.183 31.4564 95.6967 40.1933 86.82C49.7045 77.1517 59.5591 65.4228 65.1063 53.432L65.1121 53.4145ZM41.1712 139.347C38.5926 153.113 34.9546 167.42 29.0582 180.104C26.4388 185.738 20.0534 193.236 12.8706 192.566C11.2059 192.409 9.56439 191.629 8.58068 190.279C5.87401 186.565 8.34785 179.609 9.74483 175.802C11.4852 171.076 13.9474 167.193 16.8113 163.061C22.5215 154.824 29.6752 147.74 36.6369 140.581C37.6206 139.568 38.5926 138.543 39.5298 137.484C40.1002 136.844 41.8581 135.371 41.9803 134.521C41.7417 136.139 41.4739 137.746 41.1771 139.353L41.1712 139.347ZM94.833 103.968C92.8831 109.783 89.8563 116.669 84.8446 119.044C81.876 120.447 78.9539 118.683 77.9004 114.94C74.9783 104.649 79.5768 80.5685 89.4314 76.6394C92.4407 75.4462 95.258 77.0585 96.4047 80.7664C98.6166 87.9376 97.1905 96.954 94.8389 103.968H94.833ZM140.282 86.6977C138.419 93.0599 133.914 103.747 127.61 104.393C125.875 104.568 124.018 103.491 123.134 101.808C119.216 94.3579 122.389 79.2704 125.485 71.6219C127.307 67.1225 129.932 63.3389 133.553 61.4297C135.573 60.3645 137.942 60.51 139.554 62.2796C141.417 64.3285 141.981 67.4019 142.232 70.4519C142.686 76.0283 141.836 81.4067 140.282 86.6977ZM202.384 98.9971C200.358 113.246 198.367 128.357 192.29 141.553C190.695 145.016 188.711 148.427 185.899 151.052C184.165 152.676 181.959 154.207 179.619 154.754C178.07 155.115 176.312 154.941 175.078 153.934C173.431 152.589 173.117 150.202 173.233 148.084C173.425 144.486 174.479 140.988 175.707 137.606C178.437 130.097 182.273 123.287 186.743 116.663C191.312 109.888 197.5 104.428 202.494 98.0133C202.465 98.2345 202.419 98.7933 202.389 98.9971H202.384Z",
];

/* the wordmark's coordinate space (SVG user units): the logo scaled to 1000 wide, cut just under its baseline like the page edge cuts it */
const K = 1000 / 233;
const W = 1000;
const H = Math.round(126 * K);

/**
 * The script Goonj logo, huge and cut off by the page edge, in a warm-to-teal
 * gradient, lit like a slab of glass: a specular light glides across it on
 * its own and follows the pointer when you hover.
 */
function Wordmark() {
  const id = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const light = useRef<SVGFEPointLightElement>(null);

  useEffect(() => {
    const el = svg.current;
    const pl = light.current;
    if (!el || !pl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let visible = false;
    let hovering = false;
    let tx = 300;
    let ty = -40;
    let x = tx;
    let y = ty;
    const t0 = performance.now();

    const tick = (now: number) => {
      if (!hovering) {
        // drift slowly from end to end when nobody is pointing
        const s = (now - t0) / 1000;
        tx = W / 2 + Math.sin(s * 0.45) * (W * 0.46);
        ty = -30 + Math.cos(s * 0.7) * 26;
      }
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      pl.setAttribute("x", x.toFixed(1));
      pl.setAttribute("y", y.toFixed(1));
      raf = visible ? requestAnimationFrame(tick) : 0;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(el);

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * W;
      ty = ((e.clientY - r.top) / r.height) * H - 60;
      hovering = true;
    };
    const leave = () => {
      hovering = false;
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <svg ref={svg} className={f.wordmark} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMidYMin meet">
      <defs>
        {/* the logo's own direction: warm on the left, teal on the right */}
        <linearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="233" y2="0">
          <stop offset="0" stopColor="#8e2a3e" />
          <stop offset="0.2" stopColor="#e0442f" />
          <stop offset="0.38" stopColor="#f08a3c" />
          <stop offset="0.56" stopColor="#7a4a3e" />
          <stop offset="0.76" stopColor="#1f4f5a" />
          <stop offset="1" stopColor="#3db3c6" />
        </linearGradient>

        {/* fades into the page toward the bottom edge, like the reference */}
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.25" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width={W} height={H} fill={`url(#${id}-fade)`} />
        </mask>

        {/* glass: a bevel from the letter shapes, lit by a moving point light */}
        <filter id={`${id}-glass`} x="-2%" y="-10%" width="104%" height="130%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="bevel" />
          <feSpecularLighting
            in="bevel"
            surfaceScale="4"
            specularConstant="0.85"
            specularExponent="34"
            lightingColor="#ffffff"
            result="spec"
          >
            <fePointLight ref={light} x="300" y="-40" z="240" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="shine" />
          {/* a crisp inner rim along the top edges */}
          <feOffset in="SourceAlpha" dy="3" result="down" />
          <feComposite in="SourceAlpha" in2="down" operator="out" result="rim" />
          <feFlood floodColor="#ffffff" floodOpacity="0.45" />
          <feComposite in2="rim" operator="in" result="rimLit" />
          <feComposite in="SourceGraphic" in2="shine" operator="arithmetic" k1="0" k2="1" k3="0.6" k4="0" result="lit" />
          <feMerge>
            <feMergeNode in="lit" />
            <feMergeNode in="rimLit" />
          </feMerge>
        </filter>
      </defs>

      <g mask={`url(#${id}-mask)`}>
        <g filter={`url(#${id}-glass)`}>
          <g transform={`scale(${K})`} fill={`url(#${id}-fill)`}>
            {LOGO_PATHS.map((d) => (
              <path key={d.slice(0, 16)} d={d} />
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

/** The footer for the new-hero page: brand and links up top, a glass wordmark below. */
export function GlassFooter() {
  return (
    <footer className={f.footer}>
      <div className={f.inner}>
        <div className={f.top}>
          <div className={f.brand}>
            <BrandLogo className={f.logo} />
            <p>{USP.sub}</p>
            <a href={GOONJ.cta} className={f.cta}>
              Get early access <ArrowUpRight size={16} weight="bold" />
            </a>
          </div>

          <nav aria-label="Footer" className={f.cols}>
            <div>
              <p className={f.colTitle}>Product</p>
              <ul>
                {PRODUCT.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className={f.colTitle}>Company</p>
              <ul>
                {COMPANY.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} {...(label === "LinkedIn" ? { target: "_blank", rel: "noreferrer" } : {})}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className={f.bottom}>
          <span>© 2026 Goonj · Made in India, Lucknow</span>
          <span>Private by design.</span>
        </div>
        <p className={f.credits}>
          Photography: RDNE Stock, Yan Krukov, Kampus and other Pexels contributors; Ratul Puri, Captian Jayu, Skytech Aviation (Unsplash).
          3D emoji: Microsoft Fluent Emoji (MIT).
        </p>
      </div>

      <Wordmark />
    </footer>
  );
}
