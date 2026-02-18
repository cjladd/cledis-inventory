import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Kitchen-Up Inventory",
  description: "Real-time operational inventory management for restaurants",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "default",
    title:           "KUI",
  },
};

export const viewport: Viewport = {
  width:          "device-width",
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
  themeColor:     "#10b981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
