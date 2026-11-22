"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowsHorizontal } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

import u from "../../v4/ui.module.css";
import w from "./why.module.css";

/* Why Goonj: the same moment, before and after practice. Drag to compare. */
const SIDES = {
  before: {
    tag: "You know what to say",
    photo: "/goonj/story-call.jpg",
    pos: "50% 30%",
    reply: "Actually, umm, the thing is… I was only giving full context, and nobody told me before, so…",
    stats: [
      ["Pace", "182 wpm"],
      ["Fillers", "7"],
      ["Composure", "41%"],
    ],
  },
  after: {
    tag: "After three sessions with Goonj",
    photo: "/goonj/story-desk.jpg",
    pos: "72% 35%",
    reply: "Fair point. I'll keep them to three bullets from Monday. Would that work for you?",
    stats: [
      ["Pace", "138 wpm"],
      ["Fillers", "0"],
      ["Composure", "86%"],
    ],
  },
};

function Wave({ calm }: { calm?: boolean }) {
  return (
    <span className={cn(w.cmpWave, calm && w.cmpWaveCalm)} aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i % 7) * -0.12}s` }} />
      ))}
    </span>
  );
}

function Side({ which }: { which: "before" | "after" }) {
  const s = SIDES[which];
  return (
    <div className={cn(w.side, which === "after" && w.sideAfter)}>
      {/* each photo fills its own half, so the person stays visible beside the divider */}
      <span className={w.sidePhoto}>
        <Image src={s.photo} alt="" fill sizes="(max-width: 1023px) 100vw, 800px" style={{ objectFit: "cover", objectPosition: s.pos }} />
      </span>
      <span className={w.sideShade} />
      <span className={w.sideTag}>{s.tag}</span>
      <div className={w.sideCard}>
        <p className={w.sideReply}>&ldquo;{s.reply}&rdquo;</p>
        <Wave calm={which === "after"} />
        <dl className={w.sideStats}>
          {s.stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {which === "after" && (
          <span className={w.sideMarker}>
            <Image src="/goonj/3d/trophy.png" alt="" width={28} height={28} /> Marker earned · Calm under pressure
          </span>
        )}
      </div>
    </div>
  );
}

export function WhySlider() {
  const [pos, setPos] = useState(50);

  return (
    <section id="why-goonj" className={cn(u.section, w.section, w.options)} aria-labelledby="why-b">
      <div className={u.container}>
        <div className={u.head}>
          <span className={u.kicker}>Why Goonj</span>
          <h2 id="why-b" className={u.h2}>
            Knowing what to say <b>isn&apos;t the same</b> as saying it
          </h2>
        </div>

        <p className={w.prompt}>
          <span>Your manager, in front of the team:</span> &ldquo;Your updates are too long. Nobody reads them.&rdquo;
        </p>

        <div className={w.compareStage} style={{ "--pos": `${pos}%` } as CSSProperties}>
          <Side which="before" />
          <div className={w.afterClip}>
            <Side which="after" />
          </div>
          <span className={w.handle} aria-hidden="true">
            <span>
              <ArrowsHorizontal size={20} weight="bold" />
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(+e.target.value)}
            className={w.range}
            aria-label="Compare before and after practice"
          />
        </div>
        <p className={w.sample}>
          Sample session data<span className={w.dragHint}> · drag to compare</span>
        </p>
      </div>
    </section>
  );
}
