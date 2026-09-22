import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

/**
 * Archivo: a grotesque with signage lineage, which is what this is - labels
 * read at a glance across a kitchen. Its heavy weights hold up at the size the
 * quantities are set in, and it carries real tabular figures.
 */
const archivo = Archivo({
  subsets:  ["latin"],
  variable: "--font-archivo",
  weight:   ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title:       "Kitchen-Up Inventory",
  description: "Prep, waste and stock for the Cledis kitchens",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "default",
    title:          "Kitchen-Up",
  },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  themeColor:   "#17191c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="font-sans antialiased">
        <SessionProvider>
          <AuthGuard>{children}</AuthGuard>
        </SessionProvider>
      </body>
    </html>
  );
}
