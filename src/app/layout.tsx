import type { Metadata, Viewport } from "next";
import { Rajdhani } from 'next/font/google';
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import QueryProvider from './QueryProvider';
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";
import I18nInitializer from "@/components/I18nInitializer";
import { Analytics } from "@vercel/analytics/react";
import { manifestConfig } from "@/config/manifest.config.js";
import { AuthProvider } from "@/context/AuthContext";

// Configure Rajdhani font
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '600'], // We'll use 600 for Semi-bold
  variable: '--font-rajdhani',
});

// Determine the current branch
const branch = process.env.VERCEL_GIT_COMMIT_REF || 'development';
const config = manifestConfig[branch] || manifestConfig.default;

export const metadata: Metadata = {
  title: config.appName,
  description: "Soccer Tactics and Timer App for Coaches",
  icons: {
    icon: config.iconPath,
    apple: config.iconPath,
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: config.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={rajdhani.variable}>
        <I18nInitializer>
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <QueryProvider>
            <AuthProvider>
              <ClientWrapper>{children}</ClientWrapper>
            </AuthProvider>
          </QueryProvider>
        </I18nInitializer>
        <Analytics />
      </body>
    </html>
  );}
