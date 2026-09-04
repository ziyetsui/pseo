import type { Metadata } from "next";
import NotFound from "./not-found";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Page not found · Prompt Library",
  description: "This page is not in the library.",
  robots: { index: false, follow: false },
};

/** A global document is required because entry and locale routes have different root layouts. */
export default function GlobalNotFound() {
  return <html lang="en"><body><NotFound /></body></html>;
}
