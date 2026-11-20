import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChatProvider } from "@/components/chat/chat-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indie Games Catalog",
  description:
    "Internal dashboard for an indie games catalog, with an AI chat that answers questions about it.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <SiteHeader />
        <ChatProvider>
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
        </ChatProvider>
      </body>
    </html>
  );
}
