import type { Metadata } from "next";
import './globals.css';

export const metadata: Metadata = {
  title: "Games Dashboard",
  description: "A modern dashboard for indie game catalog management and AI chat",
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
