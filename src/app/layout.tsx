import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Quick Selfie - Simple & Clean",
  description: "Take quick selfies with a beautiful, minimal interface",
  keywords: ["selfie", "camera", "photo", "minimal", "clean"],
  authors: [{ name: "Yaosamo" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-[#f4f4f4]`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
