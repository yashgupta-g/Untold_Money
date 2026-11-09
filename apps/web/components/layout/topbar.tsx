"use client";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Bell, MagnifyingGlass, User, SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { baseApi } from "@/store/api/baseApi";
import { useGetMeQuery, useLogoutMutation } from "@/store/api/authApi";
import { logout } from "@/store/slices/authSlice";
import type { RootState } from "@/store";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "Aarav Sharma" -> "Aarav S." */
function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

export function Topbar() {
  const router = useRouter();
  const dispatch = useDispatch();
  // After a reload the user isn't in memory yet; /auth/me refreshes the session silently.
  const stored = useSelector((state: RootState) => state.auth.user);
  const { data: me } = useGetMeQuery(undefined, { skip: !!stored });
  const user = stored ?? me?.data ?? null;
  const [logoutRequest] = useLogoutMutation();

  const onLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Logged out locally either way; the server session expires on its own.
    }
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl backdrop-saturate-150 lg:px-8">
      {/* Search */}
      <div className="flex flex-1 items-center">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search</span>
          <MagnifyingGlass
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="global-search"
            type="search"
            placeholder="Search stocks, portfolios, trades"
            className="h-10 w-full rounded-full border border-input bg-card pl-11 pr-14 text-[14.5px] text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-ring focus:ring-4 focus:ring-accent"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground sm:block">
            ⌘K
          </kbd>
        </label>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Environment */}
        <span className="hidden h-7 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[12px] font-medium text-muted-foreground sm:inline-flex">
          <span className="size-1.5 rounded-full bg-primary-ink" />
          Local
        </span>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          id="notifications-btn"
          aria-label="Notifications, 3 unread"
        >
          <Bell size={19} className="text-foreground/80" />
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary-ink text-[10px] font-semibold text-white ring-2 ring-background">
            3
          </span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="h-10 gap-2 pl-1.5 pr-3" id="user-menu-btn" />}
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-foreground text-[11px] font-semibold text-background">
                {user ? initials(user.full_name) : ""}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-[14px] font-medium sm:block">
              {user ? shortName(user.full_name) : "Account"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onLogout}>
              <SignOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
