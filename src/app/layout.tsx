import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BC Muslim Counsellors",
  description:
    "A discovery and referral resource for qualified Muslim counselling professionals in British Columbia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
