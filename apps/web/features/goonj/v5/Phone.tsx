import Image from "next/image";

import { cn } from "@/lib/utils";

import ph from "./phone.module.css";

/**
 * An iPhone frame around a real Goonj app screen (exported from the app's Figma).
 * Size it with the `--pw` custom property (phone width) on the element or a parent.
 */
export function Phone({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn(ph.device, className)}>
      <span className={cn(ph.hw, ph.hwAction)} aria-hidden="true" />
      <span className={cn(ph.hw, ph.hwVolUp)} aria-hidden="true" />
      <span className={cn(ph.hw, ph.hwVolDown)} aria-hidden="true" />
      <span className={cn(ph.hw, ph.hwPower)} aria-hidden="true" />
      <div className={ph.bezel}>
        <div className={ph.screen}>
          <Image src={src} alt={alt} fill sizes="(max-width: 760px) 70vw, 340px" priority={priority} style={{ objectFit: "cover", objectPosition: "50% 0%" }} />
          <span className={ph.island} aria-hidden="true" />
          <span className={ph.glare} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
