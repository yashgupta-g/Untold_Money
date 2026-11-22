import { forwardRef } from "react";

import { BrandLogo } from "../../components/BrandLogo";
import p from "./success.module.css";

/**
 * After sign-up: an "access pass" in place of the form. The campaign's own
 * heading and message (from the dashboard), a check that draws itself inside
 * echo rings, and a tear-off strip with what we know: their name, that the
 * request is being reviewed, and which release it's for.
 */
export const SuccessPass = forwardRef<
  HTMLDivElement,
  { title: string; body?: string; firstName?: string; release?: string }
>(function SuccessPass({ title, body, firstName, release = "Limited release" }, ref) {
  return (
    <div ref={ref} className={p.wrap}>
      <div className={p.smoke} aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className={p.pass} role="status">
        <div className={p.top}>
          <BrandLogo className={p.logo} />
          <span className={p.chip}>
            <span className={p.dot} aria-hidden />
            On the list
          </span>
        </div>

        <div className={p.main}>
          <span className={p.badge} aria-hidden>
            <span className={p.ring} />
            <span className={p.ring} />
            <svg viewBox="0 0 24 24" className={p.check}>
              <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />
            </svg>
          </span>
          <h3 className={p.title}>{title}</h3>
          {body ? <p className={p.body}>{body}</p> : null}
        </div>

        <div className={p.tear} aria-hidden />

        <dl className={p.meta}>
          {firstName ? (
            <div>
              <dt>Name</dt>
              <dd>{firstName}</dd>
            </div>
          ) : null}
          <div>
            <dt>Status</dt>
            <dd>
              <span className={p.review} aria-hidden />
              Under review
            </dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>{release}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
});
