'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { api, type ArticleListItem, type ArticleDetail } from '@/lib/api';

type Importance = '' | 'high' | 'normal' | 'junk';

const IMP_LABELS: Record<string, string> = { high: 'High', normal: 'Normal', junk: 'Low' }; // eslint-disable-line @typescript-eslint/no-unused-vars

function importanceBadge(importance: number | null, size: 'sm' | 'xs' = 'xs') {
  if (importance === null) {return null;}
  const px = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  if (importance >= 70)
    {return <span className={`${px} rounded font-medium bg-red-500/20 text-red-400`}>High</span>;}
  if (importance >= 30)
    {return <span className={`${px} rounded font-medium bg-yellow-500/20 text-yellow-400`}>Normal</span>;}
  return <span className={`${px} rounded font-medium bg-gray-500/20 text-gray-500`}>Low</span>;
}

function entityBadge(kind: string) {
  if (kind === 'PERSON') {return 'bg-purple-500/20 text-purple-400';}
  if (kind === 'ORGANIZATION') {return 'bg-blue-500/20 text-blue-400';}
  if (kind === 'LOCATION') {return 'bg-green-500/20 text-green-400';}
  return 'bg-gray-500/20 text-gray-400';
}

function ArticleRow({
  article,
  selected,
  onClick,
}: {
  article: ArticleListItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors ${
        selected ? 'bg-white/[0.05] border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-200 leading-snug line-clamp-2 font-medium">
            {article.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {article.feedTitle && (
              <span className="text-[11px] text-gray-600 truncate max-w-[140px]">
                {article.feedTitle}
              </span>
            )}
            {article.sourceDomain && (
              <span className="text-[11px] text-gray-700">{article.sourceDomain}</span>
            )}
            {article.publishedAt && (
              <span className="text-[11px] text-gray-700">
                · {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
              </span>
            )}
          </div>
          {article.entities.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {article.entities.slice(0, 3).map((e) => (
                <span
                  key={e.id}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entityBadge(e.kind)}`}
                >
                  {e.canonicalName}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 mt-0.5">{importanceBadge(article.importance)}</div>
      </div>
    </button>
  );
}

function ArticleDetailPanel({
  articleId,
  onClose,
}: {
  articleId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR<ArticleDetail>(
    `article-${articleId}`,
    () => api.articles.get(articleId),
  );

  return (
    <div className="h-full flex flex-col bg-[#151820] border-l border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <span className="text-[11px] text-gray-600 uppercase tracking-wide">Article</span>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/5"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white/5 rounded h-4" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Title + meta */}
            <div>
              <h2 className="text-[15px] font-semibold text-white leading-snug">
                {data.title}
              </h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {importanceBadge(data.importance, 'sm')}
                {data.feedTitle && (
                  <span className="text-[11px] text-gray-600">{data.feedTitle}</span>
                )}
                {data.sourceDomain && (
                  <span className="text-[11px] text-gray-700">{data.sourceDomain}</span>
                )}
                {data.publishedAt && (
                  <span className="text-[11px] text-gray-700">
                    · {formatDistanceToNow(new Date(data.publishedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              {data.canonicalUrl && (
                <a
                  href={data.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-500 hover:text-blue-400"
                >
                  Open original
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 10L10 2M6 2h4v4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              )}
            </div>

            {/* AI Summary */}
            {data.summary && (
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-4">
                <p className="text-[11px] text-blue-400 uppercase tracking-wide mb-2 font-medium">
                  AI Summary
                </p>
                <p className="text-[13px] text-gray-300 leading-relaxed">{data.summary}</p>
              </div>
            )}

            {/* Categories */}
            {data.categories.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-2">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-white/10 text-gray-300"
                      style={cat.color ? { borderColor: cat.color + '40', color: cat.color } : {}}
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Entities */}
            {data.entities.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-2">
                  Entities ({data.entities.length})
                </p>
                <div className="space-y-1.5">
                  {data.entities.slice(0, 10).map((e) => (
                    <div key={e.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entityBadge(e.kind)}`}
                        >
                          {e.kind === 'ORGANIZATION' ? 'ORG' : e.kind.slice(0, 3)}
                        </span>
                        <span className="text-[12px] text-gray-300">{e.canonicalName}</span>
                      </div>
                      <span className="text-[11px] text-gray-600">{e.mentionCount}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {data.keywords.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-2">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-gray-400"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Body text preview */}
            {data.bodyText && (
              <div>
                <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-2">Preview</p>
                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-6">
                  {data.bodyText.slice(0, 600)}
                  {data.bodyText.length > 600 ? '…' : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600">Failed to load article</p>
        )}
      </div>
    </div>
  );
}

export default function ArticlesPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [importance, setImportance] = useState<Importance>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleImportance = useCallback((val: Importance) => {
    setImportance(val);
    setPage(1);
    setSelectedId(null);
  }, []);

  const swrKey = `articles-${page}-${debouncedQ}-${importance}`;
  const { data, isLoading } = useSWR(
    swrKey,
    () => api.articles.list({ page, limit: 20, q: debouncedQ || undefined, importance: importance || undefined }),
    { revalidateOnFocus: false },
  );

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main list panel */}
      <div className={`flex flex-col transition-all duration-200 ${selectedId ? 'w-[55%]' : 'w-full'} border-r border-white/5`}>
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-white/5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[15px] font-semibold text-white">Articles</h1>
            {data && (
              <span className="text-[12px] text-gray-600">{data.total.toLocaleString()} total</span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search articles..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          {/* Importance filter */}
          <div className="flex gap-1">
            {([['', 'All'], ['high', 'High'], ['normal', 'Normal'], ['junk', 'Low']] as [Importance, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => handleImportance(val)}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                  importance === val
                    ? 'bg-white/10 text-white'
                    : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5 space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 text-sm">No articles found</p>
              {(debouncedQ || importance) && (
                <button
                  onClick={() => { setQuery(''); setImportance(''); setPage(1); }}
                  className="mt-2 text-[12px] text-blue-500 hover:text-blue-400"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            data?.items.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                selected={selectedId === article.id}
                onClick={() => setSelectedId(selectedId === article.id ? null : article.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {data && data.total > data.limit && (
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span className="text-[12px] text-gray-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1.5 rounded-md text-[12px] text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1.5 rounded-md text-[12px] text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedId && (
        <div className="flex-1 overflow-hidden">
          <ArticleDetailPanel
            articleId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
