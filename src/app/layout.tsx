import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpportunityRadar v2',
  description: 'Find software business opportunities from community discussions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-gray-950 text-gray-100`}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              OpportunityRadar <span className="text-emerald-500">v2</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Find software business opportunities from community discussions
            </p>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
