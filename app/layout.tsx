import type { Metadata, Viewport } from "next";
import { Montserrat, Manrope, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { RouteProgress } from "@/components/ui/RouteProgress";
import { InteractionLock } from "@/components/ui/InteractionLock";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const display = Montserrat({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "T.E.K Nurse — Equipment In-Out Inventory",
  description:
    "Equipment and consumables in-out inventory management system for the school nursing lab.",
  applicationName: "T.E.K Nurse",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "T.E.K Nurse",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#152849",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-full">
        {children}
        <RouteProgress />
        <InteractionLock />
        <ServiceWorkerRegister />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            className: "font-mono uppercase tracking-[0.04em]",
          }}
        />
      </body>
    </html>
  );
}
