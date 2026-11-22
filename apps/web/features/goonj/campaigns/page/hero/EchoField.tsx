"use client";

import { useEffect, useRef } from "react";

import e from "./hero-fx.module.css";

/**
 * Goonj means "echo". Behind the headline, a field of fine horizontal lines
 * is lifted by a slow swell (two soft bumps drifting on their own paths) and
 * rippled by rings spreading from the centre, like a voice carrying through
 * still air. Lines only show inside the swell, warm orange at its heart and
 * deep teal at its edges. It leans gently toward the pointer.
 * Paused off screen and in background tabs; reduced motion draws one still frame.
 */
export function EchoField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const mask = document.createElement("canvas");
    const mctx = mask.getContext("2d");
    if (!mctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const size = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      for (const c of [cv, mask]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      draw(t0);
    };

    // pointer lean, eased
    let px = 0;
    let py = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (ev: PointerEvent) => {
      tx = (ev.clientX / window.innerWidth - 0.5) * 2;
      ty = (ev.clientY / window.innerHeight - 0.5) * 2;
    };

    const gauss = (dx: number, dy: number, rx: number, ry: number) =>
      Math.exp(-((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)));

    let t0 = 0;
    const draw = (t: number) => {
      if (!w || !h) return;
      const s = t / 1000;
      px += (tx - px) * 0.03;
      py += (ty - py) * 0.03;

      // the swell: two bumps on slow Lissajous paths, nudged by the pointer
      const b1x = w * (0.5 + 0.16 * Math.sin(s * 0.13) + 0.05 * px);
      const b1y = h * (0.46 + 0.08 * Math.sin(s * 0.17 + 1.2) + 0.04 * py);
      const b2x = w * (0.5 + 0.22 * Math.sin(s * 0.09 + 2.4));
      const b2y = h * (0.52 + 0.1 * Math.cos(s * 0.11));
      const r1x = w * 0.2;
      const r1y = h * 0.22;
      const r2x = w * 0.15;
      const r2y = h * 0.18;
      const cx = w * 0.5;
      const cy = h * 0.44;
      const amp = Math.min(h * 0.3, 240);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#0f5b57");
      grad.addColorStop(0.32, "#f47220");
      grad.addColorStop(0.5, "#ffb37a");
      grad.addColorStop(0.68, "#f47220");
      grad.addColorStop(1, "#0f5b57");
      ctx.strokeStyle = grad;
      ctx.lineWidth = w < 720 ? 1.1 : 1.4;
      ctx.lineJoin = "round";

      const gap = w < 720 ? 11 : 13;
      const step = w < 720 ? 7 : 8;
      for (let y0 = -amp; y0 < h + amp; y0 += gap) {
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const g1 = gauss(x - b1x, y0 - b1y, r1x, r1y);
          const g2 = gauss(x - b2x, y0 - b2y, r2x, r2y);
          const d = Math.hypot(x - cx, (y0 - cy) * 1.6);
          // echo rings spreading out from the centre, fading with distance
          const ring = Math.sin(d * 0.022 - s * 1.4) * Math.exp(-d / (w * 0.45));
          const y = y0 - amp * (g1 * 1.0 - g2 * 0.55) + ring * 14 * (g1 + g2 + 0.25);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // keep only the swell: a soft union of the two bumps
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.globalCompositeOperation = "source-over";
      mctx.clearRect(0, 0, w, h);
      mctx.globalCompositeOperation = "lighter";
      for (const [bx, by, rx, ry, a] of [
        [b1x, b1y, r1x * 1.35, r1y * 1.5, 0.95],
        [b2x, b2y, r2x * 1.35, r2y * 1.5, 0.7],
      ] as const) {
        mctx.save();
        mctx.translate(bx, by);
        mctx.scale(1, ry / rx);
        const rg = mctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, `rgba(0,0,0,${a})`);
        rg.addColorStop(0.55, `rgba(0,0,0,${a * 0.45})`);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        mctx.fillStyle = rg;
        mctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        mctx.restore();
      }
      // thin it out behind the headline and form, so thin type stays crisp
      mctx.globalCompositeOperation = "destination-out";
      mctx.save();
      mctx.translate(w * 0.5, h * 0.4);
      mctx.scale(1, 0.42);
      const hole = mctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.34);
      hole.addColorStop(0, "rgba(0,0,0,0.62)");
      hole.addColorStop(0.7, "rgba(0,0,0,0.4)");
      hole.addColorStop(1, "rgba(0,0,0,0)");
      mctx.fillStyle = hole;
      mctx.fillRect(-w * 0.34, -w * 0.34, w * 0.68, w * 0.68);
      mctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(mask, 0, 0);
    };

    let raf = 0;
    let visible = false;
    const loop = (t: number) => {
      t0 = t;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && visible && !document.hidden && !still) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) start();
      else stop();
    });
    const ro = new ResizeObserver(size);
    const onVis = () => (document.hidden ? stop() : start());

    // parallax: the field drifts down at a third of the scroll speed
    let pr = 0;
    const onScroll = () => {
      if (pr) return;
      pr = requestAnimationFrame(() => {
        pr = 0;
        const y = window.scrollY;
        if (y < window.innerHeight * 1.5) cv.style.transform = `translate3d(0, ${(y * 0.33).toFixed(1)}px, 0)`;
      });
    };
    if (!still) window.addEventListener("scroll", onScroll, { passive: true });

    size();
    ro.observe(cv);
    io.observe(cv);
    document.addEventListener("visibilitychange", onVis);
    if (!still) window.addEventListener("pointermove", onMove, { passive: true });
    if (still) draw(24000);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(pr);
    };
  }, []);

  return <canvas ref={ref} className={e.echo} aria-hidden />;
}
