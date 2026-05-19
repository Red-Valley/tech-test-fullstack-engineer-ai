import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import ChatDock from "@/components/chat/chat-dock";

export const metadata: Metadata = {
  title: "Indie Games Catalog",
  description: "Internal dashboard to manage indie games and chat with an AI about the catalog.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-sky-600 focus:shadow-md"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {children}
        </main>
        <ChatDock />
      </body>
    </html>
  );
}
