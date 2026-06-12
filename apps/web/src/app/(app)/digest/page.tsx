'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, type DigestListItem, type DigestDetail } from '@/lib/api';

type DigestPeriod = 'day' | 'week' | 'month';

function importanceBadge(v: number | null) {
  if (v === null) {return null;}
  if (v >= 70) {return { label: 'Important', cls: 'bg-red-500/15 text-red-400 border border-red-500/20' };}
  if (v >= 40) {return { label: 'Normal', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' };}
  return { label: 'Low', cls: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' };
}

function fmt(s: string | null | undefined) {
  if (!s) {return '—';}
  return new Date(s).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />;
}

export default function DigestPage() {
  const [tab, setTab] = useState<DigestPeriod>('day');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const { data: listData, isLoading } = useSWR(
    ['digests', tab],
    () => api.digests.list({ period: tab }),
  );

  const { data: detail } = useSWR(
    selectedId ? ['digest-detail', selectedId] : null,
    () => selectedId ? api.digests.get(selectedId) : null,
  );

  const items: DigestListItem[] = listData?.items ?? [];

  const handleTrigger = async (period: DigestPeriod) => {
    setTriggering(true);
    try {
      await api.digests.trigger(period);
      await mutate(['digests', period]);
    } catch (e) {
      console.error(e);
    } finally {
      setTriggering(false);
    }
  };

  const TABS: { key: DigestPeriod; label: string }[] = [
    { key: 'day', label: 'Daily' },
    { key: 'week', label: 'Weekly' },
    { key: 'month', label: 'Monthly' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Digests</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-generated summaries of your news feed</p>
        </div>
        <div className="flex gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTrigger(key)}
              disabled={triggering}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 text-blue-400 border border-blue-500/20 rounded-md transition-colors"
            >
              + New {label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedId(null); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === t.key ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-12 justify-center">
          <Spinner /> Loading digests…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="10" width="12" height="2.5" rx="1" />
              <rect x="2" y="6.5" width="12" height="2.5" rx="1" />
              <rect x="2" y="3" width="12" height="2.5" rx="1" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">No {tab} digests yet</p>
          <p className="text-gray-500 text-sm mb-5">Generate a digest to see a summary of your recent articles.</p>
          <button
            onClick={() => handleTrigger(tab)}
            disabled={triggering}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            {triggering ? 'Queuing…' : `Generate ${tab} digest`}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[300px_1fr] gap-6">
          <div className="space-y-2">
            {items.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === d.id
                    ? 'bg-blue-600/15 border-blue-500/30'
                    : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                }`}
              >
                <p className="text-[13px] font-medium text-white leading-snug mb-1">{d.title}</p>
                <p className="text-[11px] text-gray-500">{d.articleCount} articles · {fmt(d.createdAt)}</p>
                {d.summary && (
                  <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{d.summary}</p>
                )}
              </button>
            ))}
          </div>

          <div className="bg-[#131620] border border-white/5 rounded-xl p-6 min-h-[400px]">
            {!selectedId ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Select a digest to view details
              </div>
            ) : !detail ? (
              <div className="flex items-center justify-center h-full gap-2 text-gray-500 text-sm">
                <Spinner /> Loading…
              </div>
            ) : (
              <DigestDetailView digest={detail} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DigestDetailView({ digest }: { digest: DigestDetail }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white mb-1">{digest.title}</h2>
        <p className="text-xs text-gray-500">
          {fmt(digest.periodStart)} – {fmt(digest.periodEnd)} · {digest.articleCount} articles
        </p>
      </div>

      {digest.summary && (
        <div className="mb-6 p-4 bg-blue-600/5 border border-blue-500/15 rounded-lg">
          <p className="text-[10px] font-semibold text-blue-400 mb-2 uppercase tracking-wider">Overview</p>
          <p className="text-sm text-gray-300 leading-relaxed">{digest.summary}</p>
        </div>
      )}

      {digest.items.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Top articles</p>
          <div className="space-y-2">
            {digest.items.map((item) => {
              const imp = importanceBadge(item.article.importance);
              return (
                <div key={item.article.id} className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/5">
                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-400 font-medium shrink-0 mt-0.5">
                    {item.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-200 leading-snug mb-1">{item.article.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.article.sourceDomain && (
                        <span className="text-[11px] text-gray-600">{item.article.sourceDomain}</span>
                      )}
                      {item.article.publishedAt && (
                        <span className="text-[11px] text-gray-600">{fmt(item.article.publishedAt)}</span>
                      )}
                      {imp && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${imp.cls}`}>{imp.label}</span>
                      )}
                    </div>
                    {item.article.summary && (
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{item.article.summary}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
