'use client'

import React, { useState } from 'react'
import AskAI from './AskAI'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import clsx from 'clsx'

const navIcons: Record<string, React.ReactNode> = {
  '/coach': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  '/coach/clients': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  '/coach/checkins': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/>
    </svg>
  ),
  '/coach/messages': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
}

const navItems = [
  { href: '/coach', label: 'Dashboard' },
  { href: '/coach/clients', label: 'Clients' },
  { href: '/coach/checkins', label: 'Check-ins' },
  { href: '/coach/messages', label: 'Messages' },
]

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  React.useEffect(() => {
    const supabase = createClient()
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: clients } = await supabase.from('clients').select('id').eq('coach_id', user.id)
      if (!clients?.length) return
      const { data: msgs } = await supabase.from('messages').select('id').eq('recipient_id', user.id).eq('read', false).in('sender_id', clients.map(c => c.id))
      setUnreadCount(msgs?.length ?? 0)
    }
    fetchUnread()
    const supabase2 = createClient()
    const channel = supabase2.channel('coach-layout-unread').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread).subscribe()
    return () => { supabase2.removeChannel(channel) }
  }, [])

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
  const [userEmail, setUserEmail] = useState('')

  React.useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email ?? ''))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex min-h-screen">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex bg-white border-r border-slate-200 flex-col fixed h-full w-56 z-20">
        <div className="px-4 py-5 border-b border-slate-100">
          <img src="/rtg-logo-white.png" alt="Revive Training Group" className="h-20 w-auto" />
        </div>
        <span className="text-xs text-sky-600 font-medium px-4 pt-3 block">Coach Portal</span>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('sidebar-link flex items-center justify-between', {
                active: item.href === '/coach' ? pathname === '/coach' : pathname === item.href || pathname.startsWith(item.href + '/')
              })}
            >
              <span>{item.label}</span>
              {item.href === '/coach/messages' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold">{unreadCount}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-0.5">
          {userEmail === ADMIN_EMAIL && (
            <Link href="/coach/admin" className={clsx('sidebar-link', { active: pathname === '/coach/admin' })}>Admin</Link>
          )}
          <button onClick={signOut} className="sidebar-link w-full text-left text-red-400 hover:bg-red-50 hover:text-red-600">Sign out</button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3" style={{ backgroundColor: '#1a2e4a', height: '52px' }}>
        <img src="/rtg-logo-dark.png" alt="Revive Training Group" className="h-9 w-auto" />
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
          </svg>
        </button>
      </header>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-5 border-b border-slate-100" style={{ backgroundColor: '#1a2e4a' }}>
              <img src="/rtg-logo-dark.png" alt="Revive" className="h-9 w-auto" />
              <p className="text-xs text-sky-300 mt-1">Coach Portal</p>
            </div>
            <nav className="flex-1 p-3 space-y-0.5">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx('sidebar-link flex items-center justify-between', {
                    active: item.href === '/coach' ? pathname === '/coach' : pathname === item.href || pathname.startsWith(item.href + '/')
                  })}
                >
                  <span>{item.label}</span>
                  {item.href === '/coach/messages' && unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold">{unreadCount}</span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100 space-y-0.5">
              {userEmail === ADMIN_EMAIL && (
                <Link href="/coach/admin" onClick={() => setMobileMenuOpen(false)} className={clsx('sidebar-link', { active: pathname === '/coach/admin' })}>Admin</Link>
              )}
              <button onClick={signOut} className="sidebar-link w-full text-left text-red-400 hover:bg-red-50 hover:text-red-600">Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-20 md:pb-0 p-4 md:p-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex">
        {navItems.map(item => {
          const isActive = item.href === '/coach' ? pathname === '/coach' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx('flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative', isActive ? 'text-sky-600' : 'text-slate-400')}
            >
              {navIcons[item.href]}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.href === '/coach/messages' && unreadCount > 0 && (
                <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-sky-600" />
              )}
            </Link>
          )
        })}
      </nav>

      <AskAI />
    </div>
  )
}
