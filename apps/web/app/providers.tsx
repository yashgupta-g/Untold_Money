"use client";

import { useEffect } from "react";
import { IconContext } from "@phosphor-icons/react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { clearLegacyTokens } from "@/lib/auth";

// App-wide icon defaults: plain line icons with no tinted fill, sized like the
// previous icon set (Tailwind size classes still override per icon).
const ICON_DEFAULTS = { weight: "regular", size: 24 } as const;

export function Providers({ children }: { children: React.ReactNode }) {
  // Tokens now live in memory and an httpOnly cookie; drop any old copies.
  useEffect(clearLegacyTokens, []);

  return (
    <Provider store={store}>
      <IconContext.Provider value={ICON_DEFAULTS}>{children}</IconContext.Provider>
    </Provider>
  );
}
