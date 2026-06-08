'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import clsx from 'clsx'

const navIcons: Record<string, React.ReactNode> = {
  '/client/dashboard': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  '/client/calendar': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  '/client/nutrition': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2a9 9 0 00-9 9c0 4 2.6 7.4 6.3 8.6L12 22l2.7-2.4C18.4 18.4 21 15 21 11a9 9 0 00-9-9z"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  ),
  '/client/checkins': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/>
    </svg>
  ),
  '/client/stats': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  '/client/photos': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  '/client/messages': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
}

const navItems = [
  { href: '/client/dashboard', label: 'Dashboard' },
  { href: '/client/calendar', label: 'My Training' },
  { href: '/client/nutrition', label: 'My Nutrition' },
  { href: '/client/checkins', label: 'Check-in' },
  { href: '/client/stats', label: 'My Stats' },
  { href: '/client/photos', label: 'Photos' },
  { href: '/client/messages', label: 'Messages' },
  { href: '/client/onboarding', label: 'My Profile' },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    const supabase = createClient()
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: clientRecord } = await supabase.from('clients').select('coach_id').eq('id', user.id).single()
      if (!clientRecord?.coach_id) return
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('id, read')
        .eq('recipient_id', user.id)
        .eq('sender_id', clientRecord.coach_id)
        .eq('read', false)
      setUnreadCount(msgs?.length ?? 0)
    }
    fetchUnread()

    // Subscribe filtered to this user's messages only
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const channel = supabase
        .channel('client-layout-unread-' + user.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, () => fetchUnread())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` }, () => fetchUnread())
        .subscribe()
    })

    return () => {}
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
              <img src="/rtg-logo.png" alt="Revive Training Group" className="h-8" />
            </div>
          )}
          {collapsed && (
            <img src="/rtg-logo.png" alt="RTG" className="h-6 w-auto" />
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-slate-300 hover:text-slate-500 transition-colors ml-2 flex-shrink-0" title="Collapse sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}
        </div>

        {!collapsed && <span className="text-xs text-slate-400 font-medium px-4 pt-2 block">Client Portal</span>}

        <nav className={clsx('flex-1 space-y-0.5', collapsed ? 'p-1.5 pt-3' : 'p-3')}>
          {navItems.map(item => (
            collapsed ? (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={clsx(
                  'relative flex items-center justify-center w-full h-9 rounded-lg transition-colors',
                  pathname === item.href
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                )}
              >
                {navIcons[item.href]}
                {item.href === '/client/messages' && unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-sky-600"></span>
                )}
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('sidebar-link flex items-center justify-between', { active: pathname === item.href })}
              >
                <span>{item.label}</span>
                {item.href === '/client/messages' && unreadCount > 0 && (
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
    </div>
  )
}
