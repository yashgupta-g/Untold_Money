import Image from "next/image";

/**
 * The Goonj script wordmark (orange #F47220), one file for light and dark
 * surfaces alike. It is nearly square (233 x 200), so size it with a CSS
 * height a little taller than a wide wordmark would need. `tone` is kept for
 * callers but no longer changes the art.
 */
export function BrandLogo({ className, priority }: { tone?: "black" | "white"; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/goonj/goonj-logo-script.svg"
      alt="Goonj"
      width={233}
      height={200}
      unoptimized
      priority={priority}
      className={className}
      style={{ width: "auto" }}
    />
  );
}
