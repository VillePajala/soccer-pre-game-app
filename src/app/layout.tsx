import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import QueryProvider from './QueryProvider';
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";
import I18nInitializer from "@/components/I18nInitializer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Soccer Pre-Game App",
  description: "Beta - Soccer Tactics and Timer App for Coaches",
  icons: {
    icon: '/pepo-logo.png',
    apple: '/pepo-logo.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>
        <I18nInitializer>
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <QueryProvider>
            <ClientWrapper>{children}</ClientWrapper>
          </QueryProvider>
        </I18nInitializer>
        <Analytics />
      </body>
    </html>
  );
}