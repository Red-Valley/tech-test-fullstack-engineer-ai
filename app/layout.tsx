import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Indie Games Dashboard",
  description: "Catalog manager for indie games with AI assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 px-4 sm:px-6 py-4 flex flex-wrap items-center gap-4 sm:gap-6">
          <span className="font-bold text-lg text-white mr-auto sm:mr-0">🎮 Indie Games</span>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard
          </a>
          <a href="/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
            AI Chat
          </a>
        </nav>
        <main className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
