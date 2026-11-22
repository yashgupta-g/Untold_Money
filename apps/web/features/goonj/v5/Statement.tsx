import Image from "next/image";

import { cn } from "@/lib/utils";

import u from "../v4/ui.module.css";
import st from "./statement.module.css";

const FACES = [
  { src: "/goonj/portrait-meera.jpg", pos: "50% 22%" },
  { src: "/goonj/aarya-call.jpg", pos: "62% 30%" },
  { src: "/goonj/portrait-arjun.jpg", pos: "50% 25%" },
];

const MENTORS = [
  { src: "/goonj/aarya-call.jpg", pos: "62% 28%" },
  { src: "/goonj/abhimanyu.jpg", pos: "50% 22%" },
];

const STEPS = [
  { icon: "/goonj/3d/bulb.png", label: "Focus on your needs" },
  { icon: "/goonj/3d/mic.png", label: "Practise in small steps" },
  { icon: "/goonj/3d/trophy.png", label: "Apply right away" },
];

function Emoji({ src }: { src: string }) {
  return <Image src={src} alt="" width={96} height={96} className={st.emoji} aria-hidden="true" />;
}

/** One big sentence with people and 3D props set into it, then three short facts. */
export function Statement() {
  return (
    <section className={cn(u.section, st.wrap)} aria-labelledby="statement">
      <div className={u.container}>
        <span className={st.quote} aria-hidden="true">
          &ldquo;
        </span>
        <p id="statement" className={st.big} data-reveal>
          Goonj helps{" "}
          <span className={st.faces} aria-hidden="true">
            {FACES.map((f) => (
              <span key={f.src}>
                <Image src={f.src} alt="" fill sizes="80px" style={{ objectFit: "cover", objectPosition: f.pos }} />
              </span>
            ))}
          </span>{" "}
          working professionals master <Emoji src="/goonj/3d/sparkles.png" /> the moments that matter <Emoji src="/goonj/3d/mic.png" /> and grow{" "}
          <Emoji src="/goonj/3d/rocket.png" /> at work.
        </p>

        <div className={st.row}>
          {/* 1 · who you practise with */}
          <article className={cn(st.card, st.cardMentors)} data-reveal>
            <div className={st.mentorFaces} aria-hidden="true">
              {MENTORS.map((m) => (
                <span key={m.src}>
                  <Image src={m.src} alt="" fill sizes="96px" style={{ objectFit: "cover", objectPosition: m.pos }} />
                </span>
              ))}
            </div>
            <p className={st.statLine}>
              <b>2</b> AI mentors
            </p>
            <p className={st.cardText}>Aarya and Abhimanyu, ready whenever you are.</p>
          </article>

          {/* 2 · how it works, in three steps */}
          <article className={cn(st.card, st.cardSteps)} data-reveal>
            <ol className={st.steps}>
              {STEPS.map((s) => (
                <li key={s.label}>
                  <span className={st.stepIcon}>
                    <Image src={s.icon} alt="" width={64} height={64} />
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>
          </article>

          {/* 3 · language and mode */}
          <article className={cn(st.card, st.cardLang)} data-reveal>
            <span className={st.tile} aria-hidden="true">
              <Image src="/goonj/3d/woman-tech.png" alt="" width={160} height={160} />
            </span>
            <div>
              <p className={st.cardTitle}>Hindi + English</p>
              <p className={st.cardText}>Speak the way you think, by voice or video.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
