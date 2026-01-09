import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Coach Alan - Your AI Coach',
  description: 'Real-time voice-to-voice coaching with Coach Alan Wozniak',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

