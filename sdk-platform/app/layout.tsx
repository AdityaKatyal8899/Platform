import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoWatch SDK — Own Your Video Infrastructure',
  description: 'A private, high-performance HLS video pipeline for your S3 and Cloudflare accounts.',
  generator: 'CoWatch SDK',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f8f9fa',
  width: 'device-width',
  initialScale: 1,
}

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme') || 'light';
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          })()
        ` }} />
      </head>
      <body className="antialiased">
        <Navbar />
        {children}
        <Footer />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
