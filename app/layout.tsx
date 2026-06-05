import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revive Training Group',
  description: 'Revive Training Group',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
