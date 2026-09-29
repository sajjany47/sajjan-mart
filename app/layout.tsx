// @ts-ignore CSS side-effect imports are handled by Next.js at build time.
import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { LocationProvider } from "@/components/providers/location-provider";
import { CartProvider } from "@/components/providers/cart-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Sajjan Mart - Food, Puja, Natural & General Shopping",
  description:
    "Multi-vendor ecommerce platform for fresh food, complete puja packages with pandit booking, organic natural products, and general shopping.",
  openGraph: {
    title: "Sajjan Mart",
    description:
      "Food, Puja Samagri, Natural Products & General Shopping - all in one place.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>
                {children}
                <Toaster richColors position="top-right" />
              </CartProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
