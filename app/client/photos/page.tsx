'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type PhotoAngle = 'front' | 'side' | 'back'

export default function ClientPhotosPage() {
  const [photos, setPhotos] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [preview, setPreview] = useState<{ front: string | null, side: string | null, back: string | null }>({ front: null, side: null, back: null })
  const [files, setFiles] = useState<{ front: File | null, side: File | null, back: File | null }>({ front: null, side: null, back: null })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const sideRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user!.id)
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('client_id', user!.id)
      .order('photo_date', { ascending: false })
    setPhotos(data ?? [])
  }

  useEffect(() => { load() }, [])

  function handleFileSelect(angle: PhotoAngle, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFiles(f => ({ ...f, [angle]: file }))
    const url = URL.createObjectURL(file)
    setPreview(p => ({ ...p, [angle]: url }))
  }

  async function uploadPhoto(file: File, angle: PhotoAngle): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}-${angle}.${ext}`
    const { error } = await supabase.storage.from('progress-photos').upload(path, file)
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from('progress-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function getSignedUrl(path: string): Promise<string> {
    const fileName = path.split('/progress-photos/')[1] ?? path
    const { data } = await supabase.storage.from('progress-photos').createSignedUrl(fileName, 3600)
    return data?.signedUrl ?? path
  }

  async function savePhotos() {
    if (!files.front && !files.side && !files.back) return
    setSaving(true)

    const [frontUrl, sideUrl, backUrl] = await Promise.all([
      files.front ? uploadPhoto(files.front, 'front') : Promise.resolve(null),
      files.side ? uploadPhoto(files.side, 'side') : Promise.resolve(null),
      files.back ? uploadPhoto(files.back, 'back') : Promise.resolve(null),
    ])

    await supabase.from('progress_photos').insert({
      client_id: userId,
      photo_date: new Date().toISOString().split('T')[0],
      front_url: frontUrl,
      side_url: sideUrl,
      back_url: backUrl,
      notes: notes || null,
    })

    setFiles({ front: null, side: null, back: null })
    setPreview({ front: null, side: null, back: null })
    setNotes('')
    setSaving(false)
    load()
  }

  const angles: { key: PhotoAngle, label: string, ref: React.RefObject<HTMLInputElement> }[] = [
    { key: 'front', label: 'Front', ref: frontRef },
    { key: 'side', label: 'Side', ref: sideRef },
    { key: 'back', label: 'Back', ref: backRef },
  ]

  const hasAnyFile = files.front || files.side || files.back

  return (
    <div>
      <h1 className="page-title mb-1">Progress Photos</h1>
      <p className="text-slate-400 text-sm mb-6">Upload front, side and back photos to track your visual progress</p>

      <div className="card mb-6">
        <h2 className="section-title mb-4">Upload new photos</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {angles.map(({ key, label, ref }) => (
            <div key={key}>
              <p className="label mb-2">{label}</p>
              <div
                onClick={() => ref.current?.click()}
                className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-colors flex items-center justify-center overflow-hidden
                  ${preview[key] ? 'border-sky-300 bg-sky-50' : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50 bg-slate-50'}`}
                style={{ height: '160px' }}
              >
                {preview[key] ? (
                  <img src={preview[key]!} alt={label} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs text-slate-400 font-medium">Tap to upload</p>
                    <p className="text-xs text-slate-300 mt-0.5">{label} photo</p>
                  </div>
                )}
                <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileSelect(key, e)} />
              </div>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <label className="label">Notes (optional)</label>
          <input className="input" placeholder="How are you feeling? Any changes you notice?" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <button
          className="btn-primary"
          onClick={savePhotos}
          disabled={!hasAnyFile || saving}
        >
          {saving ? 'Uploading...' : 'Submit photos'}
        </button>
      </div>

      <h2 className="section-title mb-4">Photo history</h2>

      {photos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">No photos submitted yet. Upload your first set above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {photos.map(photo => (
            <div key={photo.id} className="card">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === photo.id ? null : photo.id)}
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {new Date(photo.photo_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {photo.notes && <p className="text-xs text-slate-400 mt-0.5">{photo.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {photo.front_url && <span className="badge badge-blue">Front</span>}
                    {photo.side_url && <span className="badge badge-blue">Side</span>}
                    {photo.back_url && <span className="badge badge-blue">Back</span>}
                  </div>
                  <span className="text-slate-300 text-sm">{expanded === photo.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === photo.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { url: photo.front_url, label: 'Front' },
                      { url: photo.side_url, label: 'Side' },
                      { url: photo.back_url, label: 'Back' },
                    ].map(({ url, label }) => url ? (
                      <div key={label}>
                        <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
                        <img src={url} alt={label} className="w-full rounded-lg object-cover" style={{ height: '200px' }} />
                      </div>
                    ) : (
                      <div key={label} className="bg-slate-50 rounded-lg flex items-center justify-center" style={{ height: '200px' }}>
                        <p className="text-xs text-slate-300">No {label.toLowerCase()} photo</p>
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
