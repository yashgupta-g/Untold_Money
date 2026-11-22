import Image from "next/image";

import { cn } from "@/lib/utils";

import hp from "./hdPhone.module.css";

/**
 * A photo-real iPhone, drawn as one flat layer so it never z-fights when a
 * 3D parent turns it: a polished titanium band with side buttons, black
 * bezel, Dynamic Island and a glass reflection. The screen is served
 * as-is (no re-encode) so app text stays crisp. Size it with `--pw`.
 * `--rel` (distance from the wheel's top slot) slides the glass reflection.
 */
export function HdPhone({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn(hp.phone, className)}>
      <span className={hp.shadow} aria-hidden="true" />
      <span className={cn(hp.btn, hp.btnAction)} aria-hidden="true" />
      <span className={cn(hp.btn, hp.btnUp)} aria-hidden="true" />
      <span className={cn(hp.btn, hp.btnDown)} aria-hidden="true" />
      <span className={cn(hp.btn, hp.btnPower)} aria-hidden="true" />

      <div className={hp.front}>
        <div className={hp.bezel}>
          <div className={hp.screen}>
            <Image src={src} alt={alt} fill unoptimized sizes="360px" className={hp.img} />
            <span className={hp.island} aria-hidden="true" />
            <span className={hp.glass} aria-hidden="true" />
            <span className={hp.sheen} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}
