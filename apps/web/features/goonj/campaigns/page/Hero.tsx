import s from "../campaign.module.css";
import type { PageContent } from "../schema";
import h from "./hero.module.css";
import { EchoField } from "./hero/EchoField";
import e from "./hero/hero-fx.module.css";
import { HeroZoom } from "./hero/HeroZoom";
import { Promises } from "./hero/Promises";
import { Media } from "./Media";
import { Proof } from "./Sections";
import { SignupForm } from "./SignupForm";

/** The headline, split into words that rise out of their line masks on load. */
function RisingTitle({ title, accent }: { title: string; accent?: string }) {
  const at = accent ? title.indexOf(accent) : -1;
  const parts =
    accent && at >= 0
      ? [
          { text: title.slice(0, at), accent: false },
          { text: accent, accent: true },
          { text: title.slice(at + accent.length), accent: false },
        ]
      : [{ text: title, accent: false }];
  let n = 0;
  return (
    <>
      {parts.flatMap((p) =>
        p.text
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => {
            const i = n++;
            return (
              <span key={i}>
                {i ? " " : null}
                <span className={e.word}>
                  <span className={p.accent ? s.accent : undefined} style={{ ["--w" as string]: i }}>
                    {word}
                  </span>
                </span>
              </span>
            );
          }),
      )}
    </>
  );
}

/**
 * The hero: the promise over a rippling "echo" field, and a one-row sign-up
 * form (first name | email | Continue) in the middle of the screen. Below,
 * the campaign's photo or video as a wide card that swells to full screen as
 * you scroll, with the early users' faces riding its corner.
 */
export function Hero({ content, preview }: { content: PageContent; preview?: boolean }) {
  const { hero } = content;
  // Only influencer pages carry a badge ("Name × Goonj"); the default page has none.
  const badge = hero.creator ? `${hero.creator.name} × Goonj` : null;
  return (
    <section className={h.hero} aria-labelledby="hero-title">
      <EchoField />
      <div className={`${s.container} ${h.head}`}>
        {badge ? (
          <span className={s.badge}>{badge}</span>
        ) : null}
        <h1 id="hero-title" className={`${s.h1} ${h.title}`}>
          <RisingTitle title={hero.title} accent={hero.titleAccent} />
        </h1>
        {hero.subtitle ? <p className={`${s.lede} ${h.sub}`}>{hero.subtitle}</p> : null}
        <div id="signup" className={h.form}>
          <SignupForm
            slug={content.slug}
            form={content.form}
            trust={hero.trustLine}
            preview={preview}
            variant="bar"
          />
        </div>
        {hero.bullets.length ? <Promises items={hero.bullets} /> : null}
      </div>
      <HeroZoom
        overlay={
          <div className={e.overlay}>
            {hero.creator ? (
              <div className={s.creator}>
                <span className={s.creatorName}>{hero.creator.name}</span>
                {hero.creator.handle ? <span className={s.creatorHandle}>{hero.creator.handle}</span> : null}
              </div>
            ) : null}
            <div className={h.proof}>
              <Proof />
            </div>
          </div>
        }
      >
        <Media media={hero.media} sizes="100vw" priority />
      </HeroZoom>
    </section>
  );
}
