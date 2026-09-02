"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { NavItem } from "./nav";

/**
 * Smallest possible client leaf: the disclosure behaviour for the mobile
 * navigation panel. The links themselves are produced on the server.
 */
export function MobileNav({ items }: { items: readonly NavItem[] }) {
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
    <div className="md:hidden">
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
            <li key={item.href} className="border-t-2 border-foreground first:border-t-0">
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center px-4 py-3 text-base font-bold"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
