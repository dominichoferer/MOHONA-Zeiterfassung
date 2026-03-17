import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOHONA Zeiterfassung",
  description: "Zeiterfassungstool für MOHONA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
