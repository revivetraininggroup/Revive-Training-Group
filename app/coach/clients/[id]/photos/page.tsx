'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function CoachPhotosPage() {
  const { id } = useParams()
  const [client, setClient] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [compare, setCompare] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: clientData }, { data: profileData }, { data: photosData }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('progress_photos').select('*').eq('client_id', id).order('photo_date', { ascending: false }),
      ])
      const ADMIN_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
      if (clientData && user.email !== ADMIN_EMAIL && clientData.coach_id !== user.id) return
      const c = clientData ? { ...clientData, profile: profileData } : null
      setClient(c)
      setPhotos(photosData ?? [])
      if (photosData && photosData.length > 0) setExpanded(photosData[0].id)
    }
    load()
  }, [id])

  function toggleCompare(photoId: string) {
    setCompare(c => c.includes(photoId)
      ? c.filter(id => id !== photoId)
      : c.length < 2 ? [...c, photoId] : [c[1], photoId]
    )
  }

  const comparePhotos = photos.filter(p => compare.includes(p.id))

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/coach/clients/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">{client?.profile?.full_name}</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 text-sm font-medium">Progress Photos</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Progress Photos</h1>
        {photos.length > 1 && (
          <p className="text-xs text-slate-400">Select 2 check-ins to compare side by side</p>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-slate-600 font-semibold">No photos yet</p>
          <p className="text-slate-400 text-sm mt-1">{client?.profile?.full_name} hasn't uploaded any progress photos yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {compare.length === 2 && (
            <div className="card border-sky-200 bg-sky-50 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title text-sky-800">Side by side comparison</h2>
                <button className="btn-secondary text-xs" onClick={() => setCompare([])}>Clear</button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {comparePhotos.map(photo => (
                  <div key={photo.id}>
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      {new Date(photo.photo_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ url: photo.front_url, label: 'Front' }, { url: photo.side_url, label: 'Side' }, { url: photo.back_url, label: 'Back' }].map(({ url, label }) => (
                        <div key={label}>
                          <p className="text-xs text-slate-400 mb-1">{label}</p>
                          {url ? (
                            <img src={url} alt={label} className="w-full rounded-lg object-contain bg-slate-50" style={{ maxHeight: '400px' }} />
                          ) : (
                            <div className="bg-slate-100 rounded-lg flex items-center justify-center" style={{ height: '140px' }}>
                              <p className="text-xs text-slate-300">—</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.map((photo, idx) => (
            <div key={photo.id} className={`card ${compare.includes(photo.id) ? 'border-sky-300 bg-sky-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {new Date(photo.photo_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      {idx === 0 && <span className="badge badge-green">Latest</span>}
                    </div>
                    {photo.notes && <p className="text-xs text-slate-400 mt-0.5">{photo.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCompare(photo.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                      ${compare.includes(photo.id)
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'}`}
                  >
                    {compare.includes(photo.id) ? 'Selected ✓' : 'Compare'}
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === photo.id ? null : photo.id)}
                    className="text-slate-300 text-sm"
                  >
                    {expanded === photo.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {expanded === photo.id && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[{ url: photo.front_url, label: 'Front' }, { url: photo.side_url, label: 'Side' }, { url: photo.back_url, label: 'Back' }].map(({ url, label }) => (
                      <div key={label}>
                        <p className="text-xs font-medium text-slate-400 mb-2">{label}</p>
                        {url ? (
                          <img src={url} alt={label} className="w-full rounded-xl object-contain bg-slate-50" style={{ maxHeight: '500px' }} />
                        ) : (
                          <div className="bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center" style={{ height: '220px' }}>
                            <p className="text-xs text-slate-300">No {label.toLowerCase()} photo</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
