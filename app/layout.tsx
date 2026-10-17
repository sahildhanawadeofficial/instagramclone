import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppSessionProvider from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insta — share what you love",
  description: "A modern Instagram-inspired social photo app.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <AppSessionProvider session={session}>
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
