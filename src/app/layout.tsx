import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/header'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'OpportunityRadar - Find Startup Ideas That Matter',
  description:
    'Discover startup opportunities that are painful, trending, AND underserved. Data-driven idea discovery for builders.',
  keywords: ['startup ideas', 'saas ideas', 'market research', 'opportunity discovery', 'pain points'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-white`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}
