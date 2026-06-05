'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

export default function MessagesPage() {
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [coachId, setCoachId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setCoachId(user!.id)
      const { data } = await supabase.from('clients').select('*, profile:profiles!id(full_name, email)').eq('coach_id', user!.id).eq('active', true)
      setClients(data ?? [])
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedClient || !coachId) return
    loadMessages()
    const channel = supabase.channel('messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedClient, coachId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(full_name)')
      .or(`and(sender_id.eq.${coachId},recipient_id.eq.${selectedClient.id}),and(sender_id.eq.${selectedClient.id},recipient_id.eq.${coachId})`)
      .order('sent_at')
    setMessages(data ?? [])
    // Mark as read
    await supabase.from('messages').update({ read: true }).eq('recipient_id', coachId).eq('sender_id', selectedClient.id)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim()) return
    setSending(true)
    await supabase.from('messages').insert({ sender_id: coachId, recipient_id: selectedClient.id, content: newMsg })
    setNewMsg('')
    setSending(false)
  }

  return (
    <div>
      <h1 className="page-title mb-6">Messages</h1>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-64 card p-0 overflow-y-auto flex-shrink-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 border-b border-slate-100">Clients</p>
          {clients.length === 0 ? (
            <p className="text-sm text-slate-400 p-4">No clients yet.</p>
          ) : clients.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${selectedClient?.id === c.id ? 'bg-sky-50' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm flex-shrink-0">
                {c.profile?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{c.profile?.full_name}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 card p-0 flex flex-col">
          {!selectedClient ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <p className="text-3xl mb-2">💬</p>
                <p>Select a client to message</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm">
                  {selectedClient.profile?.full_name?.[0]?.toUpperCase()}
                </div>
                <p className="font-medium text-slate-800">{selectedClient.profile?.full_name}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === coachId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${m.sender_id === coachId ? 'bg-sky-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMessage} className="px-4 pb-4 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={sending || !newMsg.trim()}>Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
