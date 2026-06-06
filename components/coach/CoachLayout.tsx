'use client'

import React from 'react'
import AskAI from './AskAI'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import clsx from 'clsx'

const navIcons: Record<string, React.ReactNode> = {
  '/coach': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  '/coach/clients': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  ),
  '/coach/checkins': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/>
    </svg>
  ),
  '/coach/messages': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
    const channel = supabase.channel('coach-layout-unread').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className={clsx(
        'bg-white border-r border-slate-200 flex flex-col fixed h-full transition-all duration-200 z-20',
        collapsed ? 'w-14' : 'w-56'
      )}>
        <div className={clsx('border-b border-slate-100 flex items-center', collapsed ? 'px-2 py-4 justify-center' : 'px-4 py-5 justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="7" fill="#0c1a2e"/>
                <text x="16" y="23" fontFamily="system-ui, sans-serif" fontSize="19" fontWeight="900" fill="#0ea5e9" textAnchor="middle">R</text>
              </svg>
              <div>
                <p className="font-bold text-slate-900 leading-none tracking-wide text-sm">REVIVE</p>
                <p className="text-[9px] text-slate-400 tracking-widest font-medium mt-0.5">TRAINING GROUP</p>
              </div>
            </div>
          )}
          {collapsed && (
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="7" fill="#0c1a2e"/>
              <text x="16" y="23" fontFamily="system-ui, sans-serif" fontSize="19" fontWeight="900" fill="#0ea5e9" textAnchor="middle">R</text>
            </svg>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-slate-300 hover:text-slate-500 transition-colors ml-2 flex-shrink-0" title="Collapse sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
        </div>

        {!collapsed && <span className="text-xs text-sky-600 font-medium px-4 pt-2 block">Coach Portal</span>}

        <nav className={clsx('flex-1 space-y-0.5', collapsed ? 'p-1.5 pt-3' : 'p-3')}>
          {navItems.map(item => (
            collapsed ? (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={clsx(
                  'relative flex items-center justify-center w-full h-9 rounded-lg transition-colors',
                  (item.href === '/coach' ? pathname === '/coach' : pathname === item.href || pathname.startsWith(item.href + '/'))
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                )}
              >
                {navIcons[item.href]}
                {item.href === '/coach/messages' && unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-sky-600"></span>
                )}
              </Link>
            ) : (
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
            )
          ))}
        </nav>

        <div className={clsx('border-t border-slate-100', collapsed ? 'p-1.5' : 'p-3')}>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center w-full h-9 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Expand sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ) : (
            <button onClick={signOut} className="sidebar-link w-full text-left text-red-400 hover:bg-red-50 hover:text-red-600">
              Sign out
            </button>
          )}
        </div>
      </aside>

      <main className={clsx('flex-1 p-8 transition-all duration-200', collapsed ? 'ml-14' : 'ml-56')}>
        {children}
      </main>
      <AskAI />
    </div>
  )
}
