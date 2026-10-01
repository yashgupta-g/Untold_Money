"use client";

import { IconContext } from "@phosphor-icons/react";
import { Provider } from "react-redux";
import { store } from "@/store";

// App-wide icon defaults: duotone weight, sized like the previous icon set
// (Tailwind size classes still override per icon).
const ICON_DEFAULTS = { weight: "duotone", size: 24 } as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <IconContext.Provider value={ICON_DEFAULTS}>{children}</IconContext.Provider>
    </Provider>
  );
}
