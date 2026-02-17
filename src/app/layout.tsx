import type { Metadata } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";

const brandSans = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const brandMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "mdmm | suma3 consultores",
  description: "mdmm: plataforma de control horario y gestion laboral.",
  icons: {
    icon: "/brand/suma3-logo.jpeg",
    shortcut: "/brand/suma3-logo.jpeg",
    apple: "/brand/suma3-logo.jpeg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("mdmm-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${brandSans.variable} ${brandMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

