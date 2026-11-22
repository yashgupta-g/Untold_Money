import {
  ChartBar,
  ChatsCircle,
  Clock,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react/ssr";

import s from "../../campaign.module.css";
import { MetalIcon } from "./MetalIcon";
import p from "./promises.module.css";

/** An icon picked from the line's words, since the copy is editable per campaign. */
function iconFor(text: string) {
  if (/conversation|talk|chat|voice/i.test(text)) return ChatsCircle;
  if (/moment|minute|time|commitment/i.test(text)) return Clock;
  if (/progress|grow|days|result/i.test(text)) return ChartBar;
  if (/fast|quick|instant/i.test(text)) return Lightning;
  return Sparkle;
}

/** "No complicated learning. Just conversations." → the old way and the Goonj way. */
function split(text: string) {
  const m = text.trim().match(/^(no\s.+?)[.,;:]\s*(just\s.+?)\.?$/i);
  if (!m) return null;
  const no = m[1].replace(/^no\s+/i, "");
  return { no: no.charAt(0).toUpperCase() + no.slice(1), just: m[2] };
}

/**
 * The hero's three promises as one glass strip. Each part shows the old
 * way struck through (it draws across on load) and the Goonj way beneath it.
 * Lines that don't follow "No …. Just …." are shown as written.
 */
export function Promises({ items }: { items: string[] }) {
  return (
    <>
      <ul className={p.strip}>
        {items.map((text, i) => {
          const icon = iconFor(text);
          const parts = split(text);
          return (
            <li key={text} className={p.item} style={{ ["--i" as string]: i }}>
              <MetalIcon icon={icon} className={p.icon} />
              {parts ? (
                <span className={p.text}>
                  <span className={p.no}>
                    <span className={s.srOnly}>No </span>
                    <s>{parts.no}</s>
                  </span>
                  <span className={p.just}>{parts.just}</span>
                </span>
              ) : (
                <span className={p.text}>
                  <span className={p.just}>{text}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
