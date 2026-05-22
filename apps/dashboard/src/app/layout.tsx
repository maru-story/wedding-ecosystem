import type { Metadata } from 'next';
import { Playfair_Display, Poppins } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';
import { cn } from '@/lib/utils';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wedding Digital SaaS - Dashboard',
  description: 'Platform manajemen undangan pernikahan digital',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={cn(playfairDisplay.variable, poppins.variable, 'font-sans')}
    >
      <body className="font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
