import { Inter } from 'next/font/google'
import Link from 'next/link'

import '~/styles/globals.css'

import Footer from '../../components/Footer'
import Header from '../../components/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  title: 'A Cursed Tale',
  description: 'The portfolio website for the author',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-[#121212] text-white">
      <body className={`font-sans ${inter.variable}`}>
        <div className="relative flex min-h-screen w-full items-center justify-center">
          <div className="circle1 absolute left-[5%] top-[5%] h-64 w-64 rounded-full"></div>
          <div className="circle2 absolute bottom-[50%] right-[10%] h-64 w-64 rounded-full"></div>

          <div className="absolute bottom-[25%] left-[20%] h-8 w-8 rounded-full bg-green-04f504"></div>
          <div className="absolute bottom-[10%] right-[40%] h-16 w-16 rounded-full bg-yellow-ffc404"></div>
          <div className="absolute right-[50%] top-[15%] h-24 w-24 rounded-full bg-blue-08e2ff"></div>

          <main className="bg-blur relative grid h-[86vh] w-3/4 grid-rows-[auto_1fr] rounded-lg border-2 border-white/70 bg-white/10 shadow-container">
            <Header />
            {children}
          </main>
        </div>

        <Footer />
      </body>
    </html>
  )
}
