import Image from "next/image";

import type { Media as MediaT } from "../schema";

/**
 * An image or a muted looping video filling its (positioned) parent.
 * Local files go through next/image; uploaded files are served as-is from
 * Supabase Storage, which already sends cacheable files.
 */
export function Media({ media, sizes, priority }: { media: MediaT; sizes: string; priority?: boolean }) {
  if (!media.url) return null; // the editor's preview can hold an empty slot
  if (media.type === "video") {
    return (
      <video
        src={media.url}
        poster={media.poster || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={media.alt || undefined}
      />
    );
  }
  return (
    <Image
      src={media.url}
      alt={media.alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!media.url.startsWith("/")}
    />
  );
}

/** Splits a title so the accent words can be coloured. */
export function withAccent(title: string, accent: string | undefined, className: string) {
  const at = accent ? title.indexOf(accent) : -1;
  if (!accent || at < 0) return title;
  return (
    <>
      {title.slice(0, at)}
      <span className={className}>{accent}</span>
      {title.slice(at + accent.length)}
    </>
  );
}
