import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AskAlpha Usage — Allegiance Real Estate",
  description: "Internal AI product usage analytics for AskAlpha",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
