import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Clay Clay | Pottery Painting Studio Singapore",
  description: "Singapore's premier pottery painting studio. Paint, create, and take home your own ceramic masterpieces. Book pottery painting, hand building, and wheel throwing workshops.",
  keywords: ["pottery", "painting", "Singapore", "workshop", "clay", "ceramic", "art"],
  openGraph: {
    title: "Clay Clay | Pottery Painting Studio Singapore",
    description: "Singapore's premier pottery painting studio",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
