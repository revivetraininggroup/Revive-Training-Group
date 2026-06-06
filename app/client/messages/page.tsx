'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [newMsg, setNewMsg] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [coachId, setCoachId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Use refs so the realtime callback always has current values
  const clientIdRef = useRef<string>('')
  const coachIdRef = useRef<string>('')

  async function loadMessages(userId: string, coacId: string) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${coacId}),and(sender_id.eq.${coacId},recipient_id.eq.${userId})`)
      .order('sent_at')
    setMessages(msgs ?? [])

    // Mark as read
    await supabase.from('messages').update({ read: true }).eq('recipient_id', userId).eq('sender_id', coacId)
    setUnreadCount(0)
  }

  useEffect(() => {
    let channel: any = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setClientId(user.id)
      clientIdRef.current = user.id

      const { data: clientRecord } = await supabase.from('clients').select('coach_id').eq('id', user.id).single()
      if (!clientRecord?.coach_id) return

      const { data: coachProfile } = await supabase.from('profiles').select('*').eq('id', clientRecord.coach_id).single()
      setCoach(coachProfile)
      setCoachId(clientRecord.coach_id)
      coachIdRef.current = clientRecord.coach_id

      await loadMessages(user.id, clientRecord.coach_id)

      // Subscribe — filter to only messages where THIS client is the recipient
      channel = supabase.channel('client-messages-' + user.id)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            loadMessages(clientIdRef.current, coachIdRef.current)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim() || !coach) return
    setSending(true)
    const msgContent = newMsg
    setNewMsg('')
    const tempMsg = { id: 'temp-' + Date.now(), sender_id: clientId, recipient_id: coach.id, content: msgContent, sent_at: new Date().toISOString(), read: false }
    setMessages(prev => [...prev, tempMsg])
    await supabase.from('messages').insert({ sender_id: clientId, recipient_id: coach.id, content: msgContent })
    setSending(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="page-title">Messages</h1>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="card p-0 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
        {!coach ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <p className="text-3xl mb-2">💬</p>
              <p>No coach assigned yet</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                  {coach.full_name?.[0]?.toUpperCase()}
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-800">{coach.full_name}</p>
                <p className="text-xs text-slate-400">Your coach</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm mt-8">
                  <p>No messages yet. Say hi to your coach! 👋</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === clientId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${m.sender_id === clientId ? 'bg-sky-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="px-4 pb-4 flex gap-2">
              <input className="input flex-1" placeholder="Message your coach..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
              <button type="submit" className="btn-primary" disabled={sending || !newMsg.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
