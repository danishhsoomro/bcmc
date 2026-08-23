import type { Metadata } from "next";
import "./globals.css";

const siteDescription =
  "Connecting Muslim communities and mental-health professionals across BC to make support easier to understand, navigate and access.";

export const metadata: Metadata = {
  title: "BC Muslim Counsellors",
  description: siteDescription,
  icons: {
    icon: "/brand/favicon.png",
  },
  openGraph: {
    title: "BC Muslim Counsellors",
    description: siteDescription,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BC Muslim Counsellors",
    description: siteDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
