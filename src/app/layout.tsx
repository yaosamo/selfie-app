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
  themeColor: "#f4f4f4",
};

const SITE_URL = "https://selfie.yaosamo.com";
const TITLE = "Quick Selfie – Free Online Selfie Camera with Filters";
const DESCRIPTION =
  "Take a selfie online with your webcam or phone camera. Free selfie camera with 10 filters and instant download. No signup, photos stay on your device.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Quick Selfie",
  keywords: [
    "selfie",
    "online selfie camera",
    "take a selfie online",
    "webcam photo",
    "selfie filters",
    "camera",
    "photo",
  ],
  authors: [{ name: "Yaroslav Samoylov", url: "https://yaosamo.com" }],
  creator: "Yaroslav Samoylov",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Quick Selfie",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Quick Selfie, a free online selfie camera with filters",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@yaosamo",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Quick Selfie",
  url: `${SITE_URL}/`,
  description: DESCRIPTION,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and camera access in a modern browser.",
  image: `${SITE_URL}/og.png`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "Yaroslav Samoylov", url: "https://yaosamo.com" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-[#f4f4f4]`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
