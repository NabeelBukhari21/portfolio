import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/content/profile";

export const metadata: Metadata = {
  title: `${site.name} — ${site.headline}`,
  description: site.tagline,
  // until the custom domain is set, share links resolve against the Vercel production URL
  metadataBase: new URL(
    !site.domain.includes("yourdomain")
      ? `https://${site.domain}`
      : process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000",
  ),
  openGraph: {
    title: `${site.name} — ${site.headline}`,
    description: site.tagline,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: `${site.name} — ${site.headline}`, description: site.tagline },
};

export const viewport: Viewport = {
  themeColor: "#06050c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+JP:wght@500;700&display=swap"
        />
      </head>
      <body className="scanlines antialiased">{children}</body>
    </html>
  );
}
