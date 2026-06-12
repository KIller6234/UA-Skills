'use client';

import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { api, type ArticleDetail } from '@/lib/api';

function importanceBadge(importance: number | null) {
  if (importance === null) {return null;}
  if (importance >= 70)
    {return <span className="px-2 py-0.5 text-xs rounded font-medium bg-red-500/20 text-red-400">High</span>;}
  if (importance >= 30)
    {return <span className="px-2 py-0.5 text-xs rounded font-medium bg-yellow-500/20 text-yellow-400">Normal</span>;}
  return <span className="px-2 py-0.5 text-xs rounded font-medium bg-gray-500/20 text-gray-500">Low</span>;
}

function entityBadge(kind: string) {
  if (kind === 'PERSON') {return 'bg-purple-500/20 text-purple-400';}
  if (kind === 'ORGANIZATION') {return 'bg-blue-500/20 text-blue-400';}
  if (kind === 'LOCATION') {return 'bg-green-500/20 text-green-400';}
  return 'bg-gray-500/20 text-gray-400';
}

function entityAbbr(kind: string) {
  if (kind === 'ORGANIZATION') {return 'ORG';}
  return kind.slice(0, 3);
}

export default function ArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useSWR<ArticleDetail>(
    `article-${id}`,
    () => api.articles.get(id),
  );

  const { data: similar } = useSWR(
    data ? `similar-${id}` : null,
    () => api.articles.similar(id),
  );

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-2/3" />
          <div className="h-4 bg-white/5 rounded w-1/3" />
          <div className="h-24 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Article not found.</p>
        <Link href="/articles" className="mt-3 inline-block text-sm text-blue-500 hover:text-blue-400">
          Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Articles
      </Link>

      <div className="grid grid-cols-[1fr_280px] gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-white leading-tight mb-3">{data.title}</h1>

          <div className="flex items-center gap-3 flex-wrap mb-6">
            {importanceBadge(data.importance)}
            {data.feedTitle && <span className="text-sm text-gray-500">{data.feedTitle}</span>}
            {data.sourceDomain && <span className="text-sm text-gray-600">{data.sourceDomain}</span>}
            {data.publishedAt && (
              <span className="text-sm text-gray-600">
                {formatDistanceToNow(new Date(data.publishedAt), { addSuffix: true })}
              </span>
            )}
            {data.canonicalUrl && (
              <a
                href={data.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400"
              >
                Open original
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 10L10 2M6 2h4v4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            )}
          </div>

          {data.summary && (
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-5 mb-6">
              <p className="text-[11px] text-blue-400 uppercase tracking-wide mb-2 font-medium">AI Summary</p>
              <p className="text-sm text-gray-300 leading-relaxed">{data.summary}</p>
            </div>
          )}

          {data.categories.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {data.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 text-gray-300"
                    style={cat.color ? { borderColor: cat.color + '40', color: cat.color } : {}}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.keywords.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-2">Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {data.keywords.map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded bg-white/5 text-xs text-gray-400">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.bodyText && (
            <div className="bg-[#131620] border border-white/5 rounded-xl p-5">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-3">Article text</p>
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                {data.bodyText.slice(0, 2000)}
                {data.bodyText.length > 2000 ? '…' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {data.entities.length > 0 && (
            <div className="bg-[#131620] border border-white/5 rounded-xl p-4">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-3">
                Entities ({data.entities.length})
              </p>
              <div className="space-y-2">
                {data.entities.slice(0, 12).map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${entityBadge(e.kind)}`}>
                        {entityAbbr(e.kind)}
                      </span>
                      <span className="text-xs text-gray-300 truncate">{e.canonicalName}</span>
                    </div>
                    <span className="text-[11px] text-gray-600 shrink-0 ml-2">{e.mentionCount}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {similar && similar.length > 0 && (
            <div className="bg-[#131620] border border-white/5 rounded-xl p-4">
              <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-3">Similar articles</p>
              <div className="space-y-2">
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/articles/${s.id}`}
                    className="block p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <p className="text-xs text-gray-300 leading-snug line-clamp-2">{s.title}</p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      {s.sourceDomain}
                      {s.publishedAt ? ` · ${formatDistanceToNow(new Date(s.publishedAt), { addSuffix: true })}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
