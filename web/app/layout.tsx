import type { Metadata } from "next";
import { Inter, Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const display = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hoodfundme.vercel.app"),
  title: "HoodFundMe — Onchain Giving on Robinhood Chain",
  description:
    "The charity launchpad on Robinhood Chain. Launch a coin, link it to a cause — creator fees flow 100% on-chain to charity, automatically.",
  openGraph: {
    title: "HoodFundMe — Onchain Giving on Robinhood Chain",
    description:
      "Launch a coin, link it to a cause. Creator fees flow 100% on-chain to charity, automatically.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "HoodFundMe",
    description: "The charity launchpad on Robinhood Chain — fees in, giving out.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
