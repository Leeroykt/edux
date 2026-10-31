import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "../services/theme/themeContext";

export const metadata: Metadata = {
  title: "eduX | Lossless Document Engine & Academic Integrity",
  description:
    "Single-purpose web platform for .docx AI detection, Turnitin-style similarity reports, and lossless voice-preserving academic rewrites.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem('edux_theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || ((!saved || saved === 'system') && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
