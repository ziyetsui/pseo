"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { NavItem, NavKey } from "./nav";

/**
 * Smallest possible client leaf: the disclosure behaviour for the mobile
 * navigation panel. The links themselves are produced on the server.
 */
export interface MobileNavProps {
  items: readonly NavItem[];
  /** Marks the matching entry `aria-current="page"`, as in the desktop nav. */
  currentNav?: NavKey;
}

export function MobileNav({ items, currentNav }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    // Mirrors `SiteHeader`'s `xl` breakpoint: the horizontal nav only fits
    // from 1280 up, so this disclosure covers everything below it — including
    // tablet and small-laptop widths, where it is the only navigation.
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 min-w-11 items-center justify-center border-2 border-foreground bg-surface px-3 text-sm font-bold tracking-widest uppercase shadow-hard-sm"
      >
        {open ? "关闭" : "菜单"}
      </button>

      <nav
        id={panelId}
        hidden={!open}
        aria-label="移动端主导航"
        className="absolute inset-x-0 top-full z-20 border-b-4 border-foreground bg-surface"
      >
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.key} className="border-t-2 border-foreground first:border-t-0">
              {item.href === null ? (
                <span className="flex min-h-11 items-center px-4 py-3 text-base font-bold text-foreground/60">
                  {item.label}
                  {item.note === undefined ? null : (
                    <span className="ml-1 text-xs font-medium">{item.note}</span>
                  )}
                </span>
              ) : (
                <Link
                  href={item.href}
                  aria-current={item.key === currentNav ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center px-4 py-3 text-base font-bold"
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
