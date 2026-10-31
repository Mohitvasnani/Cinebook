import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Lora } from "next/font/google";

import "@/css/globals.css";

/* Self-hosted at build time, so no render-blocking request to Google and no
   flash of fallback type. Each .variable is a class defining the CSS variable
   that css/tokens.css reads, which is why all three go on <html>. */
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "CineBook",
  description: "Cinema seat booking: two people claim the same seat, exactly one wins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${lora.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}