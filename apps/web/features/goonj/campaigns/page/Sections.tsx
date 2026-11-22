import { ArrowDown } from "@phosphor-icons/react/ssr";
import Image from "next/image";

import { BrandLogo } from "../../components/BrandLogo";
import s from "../campaign.module.css";
import { FOOTER, GETS_YOU, TESTIMONIALS } from "../static";
import { withAccent } from "./Media";
import w from "./stories.module.css";
import { CtaBanner } from "./CtaBanner";
import { EchoRings } from "./EchoRings";
import { StoryWall } from "./StoryWall";
import why from "./why/why.module.css";
import { WhyFilm } from "./why/WhyFilm";

/** Real early users' faces, linking down to their stories. No numbers. */
export function Proof() {
  const faces = TESTIMONIALS.people.slice(0, 5);
  return (
    <a href="#stories" className={s.proof}>
      <span className={s.faces} aria-hidden>
        {faces.map((p) => (
          <span key={p.name} className={s.face}>
            <Image src={p.photo} alt="" fill sizes="44px" />
          </span>
        ))}
      </span>
      <span className={s.proofText}>
        <span className={s.proofTitle}>Loved by early users</span>
        <span className={s.proofLink}>
          Read their stories
          <ArrowDown weight="bold" aria-hidden />
        </span>
      </span>
    </a>
  );
}

export function Stories() {
  return (
    <section id="stories" className={w.section} aria-labelledby="stories-title">
      <div className={s.container}>
        <div className={w.head} data-reveal>
          <h2 id="stories-title" className={s.h2}>
            {withAccent(TESTIMONIALS.title, TESTIMONIALS.accent, s.accent)}
          </h2>
        </div>
      </div>
      <StoryWall />
    </section>
  );
}

export function GetsYou() {
  return (
    <section id="why" className={why.section} aria-labelledby="gets-title">
      <div className={why.intro}>
        <div className={s.container}>
          <div className={why.introInner} data-reveal>
            <h2 id="gets-title" className={s.h2}>
              {withAccent(GETS_YOU.title, GETS_YOU.accent, s.accent)}
            </h2>
          </div>
        </div>
      </div>
      <WhyFilm items={GETS_YOU.items} />
    </section>
  );
}

export function Footer({ cta }: { cta: string }) {
  return (
    <footer className={s.footer}>
      <div className={s.footerGlow} aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className={s.container}>
        <CtaBanner cta={cta} />
        <div className={s.footerCols}>
          <div className={s.footerBrand}>
            <BrandLogo className={s.logo} />
            <span>{FOOTER.tagline}</span>
          </div>
          {FOOTER.columns.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <div className={s.colTitle}>{c.title}</div>
              <ul className={s.colLinks}>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-label="Follow">
            <div className={s.colTitle}>Follow</div>
            <ul className={s.colLinks}>
              <li>
                <a href={FOOTER.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <EchoRings />
        <div className={s.footerBase}>
          <span>{FOOTER.madeIn}</span>
          <span>{FOOTER.copyright}</span>
          <span>{FOOTER.place}</span>
        </div>
      </div>
    </footer>
  );
}
