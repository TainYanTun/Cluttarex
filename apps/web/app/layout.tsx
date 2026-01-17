import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cluttarex",
  description: "Distraction-free reading for the web.",
  manifest: "/manifest.json",
  themeColor: "#ffffff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
