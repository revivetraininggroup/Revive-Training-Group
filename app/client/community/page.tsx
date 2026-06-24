'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState<File | null>(null)
  const [newPostPreview, setNewPostPreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [userId, setUserId] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setIsAdmin(user.email === ADMIN_EMAIL)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setUserProfile(profile)
      await loadPosts()
      setLoading(false)
    }
    init()

    const channel = supabase.channel('community-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_likes' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, () => loadPosts())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPosts() {
    const { data } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles(id, full_name),
        likes:community_likes(user_id),
        comments:community_comments(*, author:profiles(id, full_name))
      `)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPostImage(file)
    setNewPostPreview(URL.createObjectURL(file))
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!newPostContent.trim() && !newPostImage) return
    setPosting(true)

    let imageUrl = null
    if (newPostImage) {
      const ext = newPostImage.name.split('.').pop()
      const path = `community/${userId}/${Date.now()}.${ext}`
      await supabase.storage.from('community-images').upload(path, newPostImage)
      const { data: { publicUrl } } = supabase.storage.from('community-images').getPublicUrl(path)
      imageUrl = publicUrl
    }

    await supabase.from('community_posts').insert({
      author_id: userId,
      content: newPostContent.trim() || null,
      image_url: imageUrl,
      pinned: false,
    })

    setNewPostContent('')
    setNewPostImage(null)
    setNewPostPreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
    setPosting(false)
  }

  async function toggleLike(postId: string, alreadyLiked: boolean) {
    if (alreadyLiked) {
      await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', userId)
    } else {
      await supabase.from('community_likes').insert({ post_id: postId, user_id: userId })
    }
    loadPosts()
  }

  async function submitComment(postId: string) {
    const content = commentInputs[postId]?.trim()
    if (!content) return
    setSubmittingComment(postId)
    await supabase.from('community_comments').insert({ post_id: postId, author_id: userId, content })
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    setSubmittingComment(null)
    loadPosts()
  }

  async function deletePost(postId: string) {
    await supabase.from('community_posts').delete().eq('id', postId)
    loadPosts()
  }

  async function deleteComment(commentId: string) {
    await supabase.from('community_comments').delete().eq('id', commentId)
    loadPosts()
  }

  async function togglePin(postId: string, currentlyPinned: boolean) {
    await supabase.from('community_posts').update({ pinned: !currentlyPinned }).eq('id', postId)
    loadPosts()
  }

  function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) return <div className="text-slate-400 text-sm">Loading community...</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title mb-6">Community</h1>

      {/* New post composer */}
      <div className="card mb-5">
        <form onSubmit={submitPost}>
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {userProfile?.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                className="w-full text-sm text-slate-700 placeholder-slate-400 outline-none resize-none bg-transparent"
                placeholder="Share something with the RTG community..."
                rows={3}
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
              />
              {newPostPreview && (
                <div className="relative mt-2 inline-block">
                  <img src={newPostPreview} className="rounded-xl max-h-48 object-contain" />
                  <button type="button" onClick={() => { setNewPostImage(null); setNewPostPreview(null) }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white text-xs">✕</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex gap-2">
              <input type="file" accept="image/*" ref={imageInputRef} className="hidden" onChange={handleImageSelect} />
              <button type="button" onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 transition-colors px-2 py-1 rounded-lg hover:bg-sky-50">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
                Photo
              </button>
            </div>
            <button type="submit" disabled={posting || (!newPostContent.trim() && !newPostImage)}
              className="btn-primary text-xs px-4 py-1.5 disabled:opacity-40">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🏋️</p>
          <p className="text-slate-600 font-medium">No posts yet</p>
          <p className="text-slate-400 text-sm mt-1">Be the first to post something!</p>
        </div>
      ) : posts.map(post => {
        const liked = post.likes?.some((l: any) => l.user_id === userId)
        const likeCount = post.likes?.length ?? 0
        const commentCount = post.comments?.length ?? 0
        const showComments = expandedComments[post.id]
        const canDelete = isAdmin || post.author_id === userId

        return (
          <div key={post.id} className={`card mb-4 ${post.pinned ? 'border-sky-200 bg-sky-50/30' : ''}`}>
            {/* Post header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {post.author?.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800">{post.author?.full_name}</p>
                    {post.pinned && (
                      <span className="text-[10px] font-semibold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full">📌 Pinned</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{timeAgo(post.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <button onClick={() => togglePin(post.id, post.pinned)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${post.pinned ? 'text-sky-600 bg-sky-50 hover:bg-sky-100' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}>
                    {post.pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => deletePost(post.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Post content */}
            {post.content && <p className="text-sm text-slate-700 mb-3 leading-relaxed">{post.content}</p>}
            {post.image_url && (
              <img src={post.image_url} alt="post image" className="w-full rounded-xl mb-3 object-contain bg-slate-50"
                style={{ maxHeight: '400px' }} onClick={() => window.open(post.image_url, '_blank')} />
            )}

            {/* Like & comment counts */}
            {(likeCount > 0 || commentCount > 0) && (
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-2 pb-2 border-b border-slate-100">
                {likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
                {commentCount > 0 && (
                  <button onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="hover:text-sky-600 transition-colors">
                    {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                  </button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-1">
              <button onClick={() => toggleLike(post.id, liked)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors flex-1 justify-center font-medium ${liked ? 'text-sky-600 bg-sky-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                {liked ? 'Liked' : 'Like'}
              </button>
              <button onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors flex-1 justify-center font-medium">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                Comment
              </button>
            </div>

            {/* Comments section */}
            {showComments && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                {post.comments?.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((c: any) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-xs flex-shrink-0">
                      {c.author?.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-700">{c.author?.full_name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</p>
                          {(isAdmin || c.author_id === userId) && (
                            <button onClick={() => deleteComment(c.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6L6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}

                {/* Comment input */}
                <div className="flex gap-2 mt-2">
                  <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                    {userProfile?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      className="flex-1 text-xs bg-slate-50 rounded-full px-3 py-1.5 outline-none border border-slate-200 focus:border-sky-300"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] ?? ''}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(post.id) } }}
                    />
                    <button onClick={() => submitComment(post.id)} disabled={submittingComment === post.id || !commentInputs[post.id]?.trim()}
                      className="text-xs text-sky-600 font-semibold hover:text-sky-700 disabled:opacity-40 px-1">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
