import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted from design/prototype/fonts.
const anton = localFont({
  src: "./fonts/anton-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-anton",
  display: "swap",
});

const schibsted = localFont({
  src: [
    { path: "./fonts/schibsted-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/schibsted-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/schibsted-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/schibsted-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-schibsted",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Encore",
  description: "Higher or lower, played live. Guess how many times a band has played each song.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E3E1DC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${schibsted.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
