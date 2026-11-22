import type { Points as PointsT } from "../../schema";
import { pickKinds } from "./graphics";
import { PointsHead } from "./Head";
import { Reel } from "./Reel";
import sh from "./shared.module.css";

/** "Why join early": the heading row, then the drifting reel of cards. */
export function Points({ points }: { points: PointsT }) {
  const kinds = pickKinds(points.items);
  const items = points.items.map((it, i) => ({ ...it, kind: kinds[i] }));
  return (
    <section id="points" className={sh.section} aria-labelledby="points-title">
      <PointsHead points={points} />
      <Reel items={items} />
    </section>
  );
}
