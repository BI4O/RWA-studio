import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RWA Studio",
  description:
    "AI-assisted workbench for onboarding real-world assets to blockchain networks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 overflow-y-auto bg-muted/10">
              <MobileNav />
              <main className="p-6 lg:p-10">
                <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
