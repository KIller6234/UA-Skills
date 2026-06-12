'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, type Feed } from '@/lib/api';

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  ACTIVE:  { dot: 'bg-emerald-500', label: 'Active' },
  PENDING: { dot: 'bg-yellow-400',  label: 'Pending' },
  PAUSED:  { dot: 'bg-gray-500',    label: 'Paused' },
  ERROR:   { dot: 'bg-red-500',     label: 'Error' },
};

const DEFAULT_STATUS = { dot: 'bg-gray-400', label: 'Unknown' };

function relativeTime(iso: string | null): string {
  if (!iso) {return '—';}
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) {return 'just now';}
  if (mins < 60) {return `${mins}m ago`;}
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {return `${hrs}h ago`;}
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FeedsPage() {
  const { data: feeds, mutate, isLoading } = useSWR<Feed[]>('/feeds', () => api.feeds.list());
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {return;}
    setAdding(true);
    setError(null);
    try {
      await api.feeds.create(url.trim());
      setUrl('');
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feed');
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (feed: Feed) => {
    const next = feed.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    await api.feeds.updateStatus(feed.id, next);
    await mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this feed?')) {return;}
    await api.feeds.remove(id);
    await mutate();
  };

  const handlePoll = async (id: string) => {
    setPolling(id);
    try {
      await api.feeds.triggerPoll(id);
      await mutate();
    } finally {
      setPolling(null);
    }
  };

  const activeCount = feeds?.filter((f) => f.status === 'ACTIVE').length ?? 0;
  const errorCount = feeds?.filter((f) => f.status === 'ERROR').length ?? 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Feeds</h1>
          <p className="text-sm text-gray-500 mt-0.5">RSS/Atom sources for article ingestion</p>
        </div>
        {feeds && feeds.length > 0 && (
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-400">{activeCount} active</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-400">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/feed.xml"
          className="flex-1 bg-white/5 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={adding || !url.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shrink-0"
        >
          {adding ? 'Adding…' : '+ Add Feed'}
        </button>
      </form>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : !feeds?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 18a12 12 0 0 1 12-12M3 12a6 6 0 0 1 6-6M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No feeds yet</p>
          <p className="text-gray-500 text-sm">Add your first RSS/Atom feed above to start ingesting articles.</p>
        </div>
      ) : (
        <div className="bg-[#131620] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
          {feeds.map((feed) => {
            const cfg = STATUS_CONFIG[feed.status] ?? DEFAULT_STATUS;
            return (
              <div key={feed.id} className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">
                    {feed.title ?? feed.canonicalUrl}
                  </p>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-gray-600">{cfg.label}</span>
                    <span className="text-[11px] text-gray-700">·</span>
                    <span className="text-[11px] text-gray-600">polled {relativeTime(feed.lastPolledAt)}</span>
                    {feed.siteUrl && (
                      <>
                        <span className="text-[11px] text-gray-700">·</span>
                        <span className="text-[11px] text-gray-600 truncate max-w-[200px]">
                          {feed.siteUrl.replace(/^https?:\/\//, '')}
                        </span>
                      </>
                    )}
                    {feed.consecutiveFailures > 0 && (
                      <>
                        <span className="text-[11px] text-gray-700">·</span>
                        <span className="text-[11px] text-red-500" title={feed.lastError ?? ''}>
                          {feed.consecutiveFailures} failure{feed.consecutiveFailures > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>
                  {feed.description && (
                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">{feed.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => handlePoll(feed.id)}
                    disabled={polling === feed.id}
                    title="Poll now"
                    className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
                  >
                    <svg className={`w-4 h-4 ${polling === feed.id ? 'animate-spin' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M13.5 8A5.5 5.5 0 0 1 3.3 11.5" strokeLinecap="round" />
                      <path d="M2.5 8A5.5 5.5 0 0 1 12.7 4.5" strokeLinecap="round" />
                      <path d="M11 2.5l1.7 2-2 1.7M5 13.5l-1.7-2 2-1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleStatus(feed)}
                    title={feed.status === 'PAUSED' ? 'Resume' : 'Pause'}
                    className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    {feed.status === 'PAUSED' ? (
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 3l8 5-8 5V3z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="3" y="3" width="3.5" height="10" rx="1" />
                        <rect x="9.5" y="3" width="3.5" height="10" rx="1" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    title="Remove"
                    className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
