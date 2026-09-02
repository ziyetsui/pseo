import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";

import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { SITE_NAME, getSiteUrl } from "@/lib/seo/site";
import "@/styles/globals.css";

/**
 * `lang` has to be set on <html>, which only the root layout owns. With a single
 * published locale we set DEFAULT_LOCALE here. When a second locale ships, move
 * the html/body shell into `src/app/[locale]/layout.tsx` (making `[locale]` the
 * root segment) so `lang` can follow the route.
 */
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-outfit",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className={`${outfit.variable} ${jetBrainsMono.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
