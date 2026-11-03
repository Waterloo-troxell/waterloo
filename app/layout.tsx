import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-service-worker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/* The wordmark only, per the brief. Never body text. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Waterloo",
    template: "%s · Waterloo",
  },
  description: "The private workspace of Waterloo's two co-owners.",
  applicationName: "Waterloo",
  manifest: "/manifest.webmanifest",
  // A private workspace at a public address. Never index it.
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: {
    capable: true,
    title: "Waterloo",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable} bg-bg text-text font-sans antialiased`}
      >
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
