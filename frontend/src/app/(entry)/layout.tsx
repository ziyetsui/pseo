import type { ReactNode } from "react";
import type { Metadata } from "next";
import "@/styles/globals.css";
import { siteIcons } from '@/site/icons';

export const metadata: Metadata = { title: "Prompt Library", description: "Original prompts, their results, and the people who wrote them.", icons: siteIcons };

export default function EntryLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
