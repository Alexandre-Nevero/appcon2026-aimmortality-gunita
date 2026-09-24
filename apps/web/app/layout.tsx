import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Himmel",
  description: "A consent-based family memory archive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
