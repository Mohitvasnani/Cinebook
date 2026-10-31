import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MockProvider } from "@/components/MockProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CineBook",
  description:
    "Cinema seat booking: two people claim the same seat, exactly one wins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MockProvider>{children}</MockProvider>
      </body>
    </html>
  );
}
