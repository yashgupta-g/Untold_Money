import s from "../../campaign.module.css";
import type { Points as PointsT } from "../../schema";
import sh from "./shared.module.css";

/** The section's heading row. */
export function PointsHead({ points }: { points: PointsT }) {
  return (
    <div className={s.container}>
      <div className={sh.head} data-reveal>
        <div className={sh.titles}>
          <h2 id="points-title" className={s.h2}>
            {points.title}
          </h2>
        </div>
      </div>
    </div>
  );
}
