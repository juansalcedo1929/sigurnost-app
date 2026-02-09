import './globals.css'
import { ReactNode } from 'react'

interface RootLayoutProps {
  children: ReactNode
}

export const metadata = {
  title: 'Sigurnost - Sistema de Asistencia',
  description: 'Sistema de gestión de disponibilidad de empleados',
    icons: {
    apple: '/apple-touch-icon.png',
  }
}

// Nueva forma de exportar viewport en Next.js 14
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#3E77B6" />
      </head>
      <body>
        {children}
        <div className="safe-area" />
      </body>
    </html>
  )
}