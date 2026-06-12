import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'News Intelligence Hub',
  description: 'AI-powered news aggregation and analysis',
};

const themeScript = `(function(){try{var t=localStorage.getItem('nih_theme');if(t==='light'){document.documentElement.classList.add('light');document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
