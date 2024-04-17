import { Inter } from 'next/font/google'
import Link from 'next/link'

import Footer from '~/components/Footer'
import '~/styles/globals.css'

import Header from '../../components/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  title: 'Resume',
  description: 'The resume for the author',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-neutral-300 text-black">
      <body className={`font-sans ${inter.variable}`}>
        <div className="flex min-h-screen flex-col">
          <Header dark />

          <main className="flex-1">{children}</main>
        </div>

        <Footer addAttribution={false} />
      </body>
    </html>
  )
}
