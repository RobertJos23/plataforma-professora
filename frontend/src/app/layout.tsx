import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Plataforma da Professora | Inglês para o mundo",
    template: "%s | Plataforma da Professora",
  },
  description:
    "Aprenda inglês com aulas particulares, materiais exclusivos e suporte de IA 24/7. Do básico à fluência!",
  keywords: ["inglês", "aulas de inglês", "curso de inglês", "professora de inglês", "english"],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "Plataforma da Professora",
    description: "Aprenda inglês com aulas particulares e suporte de IA 24/7.",
    siteName: "Plataforma da Professora",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans">
        {children}
      </body>
    </html>
  );
}
