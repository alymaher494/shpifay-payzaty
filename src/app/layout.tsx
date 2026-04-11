import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Payzaty Payment | Secure Gateway',
  description: 'بوابة الدفع الآمنة',
  robots: 'noindex, nofollow', // منع محركات البحث من فهرسة الصفحة
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* منع التخزين المؤقت لصفحات الدفع */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* حماية من Clickjacking */}
        <meta httpEquiv="X-Frame-Options" content="DENY" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
