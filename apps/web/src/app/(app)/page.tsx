'use client';

import useSWR from 'swr';
import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api, type DashboardPeriod, type DashboardStats } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
];

function importanceBadge(importance: number | null) {
  if (importance === null) {return null;}
  if (importance >= 70)
    {return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">High</span>;}
  if (importance >= 30)
    {return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400">Normal</span>;}
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/20 text-gray-400">Low</span>;
}

function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: number;
  delta: string;
  icon: React.ReactNode;
}) {
  const isPos = delta.startsWith('+') && delta !== '+0%';
  const isNeg = delta.startsWith('-');
  return (
    <div className="bg-[#151820] border border-white/5 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] text-gray-500 uppercase tracking-wide">{label}</p>
        <span className="text-gray-600">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">
        {value.toLocaleString()}
      </p>
      {delta && (
        <p
          className={`mt-1 text-[12px] font-medium ${
            isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-gray-500'
          }`}
        >
          {delta} vs prev period
        </p>
      )}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: DashboardStats['activityChart'] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-600">
        No activity data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="articlesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1f2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#e5e7eb',
          }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Area
          type="monotone"
          dataKey="articles"
          name="Articles"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#articlesGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ImportanceBar({ breakdown }: { breakdown: DashboardStats['importanceBreakdown'] }) {
  const total = breakdown.high + breakdown.normal + breakdown.junk || 1;
  return (
    <div className="space-y-3">
      {[
        { label: 'High', value: breakdown.high, color: 'bg-red-500', text: 'text-red-400' },
        { label: 'Normal', value: breakdown.normal, color: 'bg-yellow-500', text: 'text-yellow-400' },
        { label: 'Low / Junk', value: breakdown.junk, color: 'bg-gray-600', text: 'text-gray-400' },
      ].map(({ label, value, color, text }) => (
        <div key={label}>
          <div className="flex justify-between text-[12px] mb-1">
            <span className={text}>{label}</span>
            <span className="text-gray-500">{value}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{ width: `${(value / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('7d');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error, isLoading } = useSWR<DashboardStats>(
    `dashboard-stats-${period}`,
    () => api.dashboard.stats(period),
    { revalidateOnFocus: false },
  );

  if (isLoading) {return <DashboardSkeleton />;}

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400 text-sm">Failed to load dashboard: {(error as Error).message}</p>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your news intelligence</p>
        </div>
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                period === p.value
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Articles Processed"
          value={d.articlesProcessed.value}
          delta={d.articlesProcessed.delta}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="12" height="12" rx="1.5" />
              <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Entities Found"
          value={d.entitiesFound.value}
          delta={d.entitiesFound.delta}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
              <circle cx="3" cy="4" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="13" cy="4" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <path d="M5.2 7.2L4.2 5.2M10.8 7.2L11.8 5.2M5.2 8.8L4.2 10.8" />
            </svg>
          }
        />
        <StatCard
          label="Active Feeds"
          value={d.activeFeedsCount.value}
          delta=""
          icon={
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 12a10 10 0 0 1 10-10M2 8a6 6 0 0 1 6-6M4 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="LLM Calls (month)"
          value={d.llmCallsThisMonth.value}
          delta={d.llmCallsThisMonth.delta}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" />
              <path d="M5 12v2M8 12v2M11 12v2" strokeLinecap="round" />
              <path d="M5 7h2M9 7h2M5 9h1" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* Activity chart + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity chart — 2/3 width */}
        <div className="lg:col-span-2 bg-[#151820] border border-white/5 rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-gray-300 mb-4">Article Activity</h2>
          <ActivityChart data={d.activityChart} />
        </div>

        {/* Importance breakdown — 1/3 */}
        <div className="bg-[#151820] border border-white/5 rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-gray-300 mb-4">Importance Breakdown</h2>
          <ImportanceBar breakdown={d.importanceBreakdown} />

          {d.topCategories.length > 0 && (
            <div className="mt-5 pt-5 border-t border-white/5">
              <h3 className="text-[11px] text-gray-600 uppercase tracking-wide mb-3">Top Categories</h3>
              <div className="space-y-2">
                {d.topCategories.slice(0, 4).map((cat) => (
                  <div key={cat.name} className="flex justify-between items-center">
                    <span className="text-[12px] text-gray-400 truncate">{cat.name}</span>
                    <span className="text-[12px] text-gray-600 ml-2 tabular-nums">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entities + Recent articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top entities */}
        <div className="bg-[#151820] border border-white/5 rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-gray-300 mb-4">Top Entities</h2>
          {d.topEntities.length === 0 ? (
            <p className="text-sm text-gray-600">No entities found yet</p>
          ) : (
            <div className="space-y-2.5">
              {d.topEntities.map((entity) => (
                <div key={entity.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                        entity.kind === 'PERSON'
                          ? 'bg-purple-500/20 text-purple-400'
                          : entity.kind === 'ORGANIZATION'
                          ? 'bg-blue-500/20 text-blue-400'
                          : entity.kind === 'LOCATION'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {entity.kind === 'ORGANIZATION' ? 'ORG' : entity.kind.slice(0, 3)}
                    </span>
                    <span className="text-[13px] text-gray-300 truncate">{entity.name}</span>
                  </div>
                  <span className="text-[12px] text-gray-600 tabular-nums ml-2">{entity.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent articles */}
        <div className="bg-[#151820] border border-white/5 rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-gray-300 mb-4">Recent Articles</h2>
          {d.recentArticles.length === 0 ? (
            <p className="text-sm text-gray-600">No classified articles yet</p>
          ) : (
            <div className="space-y-3">
              {d.recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-200 leading-snug line-clamp-2">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-gray-600 truncate">
                        {article.feedTitle ?? article.sourceDomain ?? 'Unknown'}
                      </span>
                      {article.publishedAt && (
                        <span className="text-[11px] text-gray-700">
                          · {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  {importanceBadge(article.importance)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
