import { ArrowUpRight } from "@phosphor-icons/react/ssr";

import s from "../campaign.module.css";
import c from "./cta-banner.module.css";
import { PhoneSplash } from "./PhoneSplash";

/**
 * The closing call to action: a wide rounded banner with a slow orange
 * aurora and fine dust, the closing promise on the left, and on the right a
 * tilted phone playing Goonj's own launch splash (branding, no app screens).
 */
export function CtaBanner({ cta }: { cta: string }) {
  return (
    <section className={c.banner} aria-labelledby="cta-title">
      <div className={c.sky} aria-hidden>
        <i className={c.aurora} />
        <i className={c.aurora2} />
        <i className={c.dust} />
        <i className={c.dust2} />
      </div>

      <div className={c.copy}>
        <h2 id="cta-title" className={c.title}>
          Your next big moment at work <span className={s.accent}>starts with a conversation.</span>
        </h2>
        <p className={c.sub}>
          Practise it with Goonj before it happens, and walk in ready. Become more valuable at work, one
          conversation at a time.
        </p>
        <a href="#signup" className={s.btn}>
          <span>{cta}</span>
          <span className={s.btnArrow} aria-hidden>
            <ArrowUpRight weight="bold" />
          </span>
        </a>
      </div>

      <PhoneSplash />
    </section>
  );
}
