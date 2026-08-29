import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "VIREON — Revenue Intelligence Infrastructure",
  description:
    "VIREON intelligently orchestrates revenue recovery across payments, subscriptions, checkout, and receivables.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#05080D] text-slate-100 min-h-screen flex antialiased selection:bg-blue-600 selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden bg-[#05080D]">
          <main className="flex-1 p-4 sm:p-5 lg:p-6 w-full max-w-[1680px] mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
