import type { Metadata } from "next";
import { Homemade_Apple, Inter, Newsreader } from "next/font/google";
import { I18nProvider } from "@/src/i18n/provider";
import "./globals.css";

const script = Homemade_Apple({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script-loaded",
});
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif-loaded" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans-loaded" });

export const metadata: Metadata = {
  title: "Himmel",
  description: "Stories that stay with us.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${script.variable} ${serif.variable} ${sans.variable}`}>
      <body>
        <I18nProvider initialLocale="en">{children}</I18nProvider>
      </body>
    </html>
  );
}
