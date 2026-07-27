import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PulsaKilatLoadingScreen } from "@/components/shared/PulsaKilatLoadingScreen";

export const metadata: Metadata = {
  metadataBase: new URL("https://pulsakilat.local"),
  title: "PulsaKilat",
  description: "Pulsa, paket data, e-wallet, token listrik, game, dan PPOB dalam satu tempat.",
  applicationName: "PulsaKilat",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "PulsaKilat",
    description: "Pulsa, paket data, e-wallet, token listrik, game, dan PPOB dalam satu tempat.",
    url: "https://pulsakilat.local",
    siteName: "PulsaKilat",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PulsaKilat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PulsaKilat",
    description: "Pulsa, paket data, e-wallet, token listrik, game, dan PPOB dalam satu tempat.",
    images: ["/twitter-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Root layout harus netral. Jangan taruh Header/Footer di sini.
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PC162D40HT"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PC162D40HT');
          `}
        </Script>
        <PulsaKilatLoadingScreen />
        {children}
      </body>
    </html>
  );
}
