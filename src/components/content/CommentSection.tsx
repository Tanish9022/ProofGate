'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MessageSquare, Send, User } from 'lucide-react';

export interface CommentItem {
  id: string;
  workspace_id: string;
  content_version_id: string;
  finding_id: string | null;
  author_role: string;
  body: string;
  created_at: string;
}

interface CommentSectionProps {
  contentId: string;
  versionId: string;
  currentRole: string;
}

export function CommentSection({ contentId, versionId, currentRole }: CommentSectionProps) {
  const showToast = useToast();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    if (!contentId || !versionId) return;
    try {
      const res = await fetch(`/api/content/${contentId}/comments?versionId=${versionId}`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // silently handle or log
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [contentId, versionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newComment.trim();
    if (!clean) return;
    if (clean.length > 500) {
      showToast('Comment cannot exceed 500 characters', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/content/${contentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': currentRole,
        },
        body: JSON.stringify({
          versionId,
          body: clean,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to post comment');
      }

      setNewComment('');
      showToast('Comment added', 'success');
      await fetchComments();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error posting comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'reviewer':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'admin':
        return 'bg-amber-light text-ink border-amber/40';
      default:
        return 'bg-indigo-light text-indigo border-indigo/20';
    }
  };

  return (
    <div className="rounded-xl border border-line-soft bg-paper p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3 border-b border-line-soft pb-2.5">
        <MessageSquare className="h-4 w-4 text-ink-muted" />
        <h3 className="font-serif text-sm font-semibold text-ink">
          Version Comments ({comments.length})
        </h3>
      </div>

      {/* Comment List */}
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-ink-muted">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-ink-muted italic">No comments on this version yet. Add notes or rationale below.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-line-soft bg-paper/60 p-2.5 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadge(c.author_role)}`}>
                  <User className="h-3 w-3" />
                  {c.author_role}
                </span>
                <span className="font-mono text-[10px] text-ink-muted">
                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-ink leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`Add a comment as ${currentRole}… (max 500 chars)`}
            maxLength={500}
            className="w-full rounded-lg border border-line-strong bg-paper p-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-indigo focus:outline-none"
          />
          <div className="text-[10px] font-mono text-ink-muted text-right mt-0.5">
            {newComment.length}/500
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !newComment.trim()}
          >
            <Send className="h-3 w-3 mr-1" />
            {submitting ? 'Posting…' : 'Comment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
