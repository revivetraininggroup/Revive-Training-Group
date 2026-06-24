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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [uploadingImage, setUploadingImage] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function loadUnreadCounts(userId: string, clientIds: string[]) {
    if (clientIds.length === 0) return
    const { data } = await supabase.from('messages').select('sender_id').eq('recipient_id', userId).eq('read', false).in('sender_id', clientIds)
    const counts: Record<string, number> = {}
    for (const msg of data ?? []) counts[msg.sender_id] = (counts[msg.sender_id] ?? 0) + 1
    setUnreadCounts(counts)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setCoachId(user!.id)
      const { data: clientsData } = await supabase.from('clients').select('*').eq('coach_id', user!.id).eq('active', true)
      if (clientsData && clientsData.length > 0) {
        const ids = clientsData.map((c: any) => c.id)
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
        const merged = clientsData.map((c: any) => ({ ...c, profile: profilesData?.find((p: any) => p.id === c.id) ?? null }))
        setClients(merged)
        loadUnreadCounts(user!.id, ids)
      }
    }
    init()
    const channel = supabase.channel('coach-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) supabase.from('clients').select('id').eq('coach_id', user.id).then(({ data }) => {
            if (data) loadUnreadCounts(user.id, data.map(c => c.id))
          })
        })
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!selectedClient || !coachId) return
    loadMessages()
    const channel = supabase.channel('messages-' + selectedClient.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedClient, coachId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadMessages() {
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${coachId},recipient_id.eq.${selectedClient.id}),and(sender_id.eq.${selectedClient.id},recipient_id.eq.${coachId})`)
      .order('sent_at')
    setMessages(data ?? [])
    await supabase.from('messages').update({ read: true }).eq('recipient_id', coachId).eq('sender_id', selectedClient.id)
    setUnreadCounts(prev => ({ ...prev, [selectedClient.id]: 0 }))
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMsg.trim()) return
    setSending(true)
    const msgContent = newMsg
    setNewMsg('')
    const tempMsg = { id: 'temp-' + Date.now(), sender_id: coachId, recipient_id: selectedClient.id, content: msgContent, sent_at: new Date().toISOString(), read: false }
    setMessages(prev => [...prev, tempMsg])
    await supabase.from('messages').insert({ sender_id: coachId, recipient_id: selectedClient.id, content: msgContent })
    setSending(false)
  }

  async function sendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const path = `messages/${coachId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('message-images').upload(path, file)
    if (error) { setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('message-images').getPublicUrl(path)
    const tempMsg = { id: 'temp-' + Date.now(), sender_id: coachId, recipient_id: selectedClient.id, content: '', image_url: publicUrl, sent_at: new Date().toISOString(), read: false }
    setMessages(prev => [...prev, tempMsg])
    await supabase.from('messages').insert({ sender_id: coachId, recipient_id: selectedClient.id, content: '', image_url: publicUrl })
    setUploadingImage(false)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="page-title">Messages</h1>
        {totalUnread > 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">{totalUnread}</span>}
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-64 card p-0 overflow-y-auto flex-shrink-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-3 border-b border-slate-100">Clients</p>
          {clients.length === 0 ? <p className="text-sm text-slate-400 p-4">No clients yet.</p> : clients.map(c => (
            <button key={c.id} onClick={() => setSelectedClient(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${selectedClient?.id === c.id ? 'bg-sky-50' : ''}`}>
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm">{c.profile?.full_name?.[0]?.toUpperCase()}</div>
                {(unreadCounts[c.id] ?? 0) > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center">{unreadCounts[c.id]}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${(unreadCounts[c.id] ?? 0) > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>{c.profile?.full_name}</p>
                {(unreadCounts[c.id] ?? 0) > 0 && <p className="text-xs text-sky-600 font-medium">{unreadCounts[c.id]} new message{unreadCounts[c.id] > 1 ? 's' : ''}</p>}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 card p-0 flex flex-col">
          {!selectedClient ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center"><p className="text-3xl mb-2">💬</p><p>Select a client to message</p></div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm">{selectedClient.profile?.full_name?.[0]?.toUpperCase()}</div>
                <p className="font-medium text-slate-800">{selectedClient.profile?.full_name}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === coachId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl text-sm ${m.sender_id === coachId ? 'bg-sky-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'} ${m.image_url ? 'p-1' : 'px-3 py-2'}`}>
                      {m.image_url ? (
                        <img src={m.image_url} alt="shared image" className="rounded-xl max-w-full cursor-pointer" style={{ maxHeight: '280px', objectFit: 'contain' }} onClick={() => window.open(m.image_url, '_blank')} />
                      ) : m.content}
                    </div>
                  </div>
                ))}
                {uploadingImage && (
                  <div className="flex justify-end">
                    <div className="bg-sky-100 rounded-2xl px-3 py-2 text-sm text-sky-600 animate-pulse">Sending image...</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 pb-4 flex gap-2 items-end">
                <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={sendImage} />
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-sky-600 hover:border-sky-300 transition-colors flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                </button>
                <form onSubmit={sendMessage} className="flex gap-2 flex-1">
                  <input className="input flex-1" placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
                  <button type="submit" className="btn-primary" disabled={sending || !newMsg.trim()}>Send</button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
