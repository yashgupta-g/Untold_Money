/**
 * Which piece of generative art each "Why join early" card gets
 * (see patterns.tsx). It's picked from the point's words, so campaign
 * editors can reword or reorder points freely.
 */
export const KINDS = ["invite", "focus", "early", "feedback", "team", "next"] as const;
export type Kind = (typeof KINDS)[number];

const MATCH: [Kind, RegExp][] = [
  ["feedback", /feedback|reaction|opinion|honest|review/i],
  ["team", /team|closer|builder|people building/i],
  ["early", /early|discover|first look|before/i],
  ["invite", /\bfew\b|invite|exclusive|limited|select/i],
  ["focus", /reason|perspective|special|chosen|unique/i],
  ["next", /next|future|grow|shape|part of/i],
];

/** A distinct look for each point: by its title, then its body, then whatever's left. */
export function pickKinds(items: { title: string; body: string }[]): Kind[] {
  const used = new Set<Kind>();
  const out: (Kind | null)[] = items.map(({ title, body }) => {
    for (const text of [title, body]) {
      const hit = MATCH.find(([k, re]) => !used.has(k) && re.test(text));
      if (hit) {
        used.add(hit[0]);
        return hit[0];
      }
    }
    return null;
  });
  const rest = KINDS.filter((k) => !used.has(k));
  let n = 0;
  return out.map((k, i) => k ?? rest[n++] ?? KINDS[i % KINDS.length]);
}
