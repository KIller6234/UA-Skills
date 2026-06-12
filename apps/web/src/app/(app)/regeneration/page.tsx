'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, type RegenerationRun } from '@/lib/api'; // eslint-disable-line @typescript-eslint/no-unused-vars

function fmt(s: string | null | undefined) {
  if (!s) {return '—';}
  return new Date(s).toLocaleString('uk-UA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function fmtNum(n: number) {
  return n.toLocaleString('uk-UA');
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    completed: 'bg-green-500/15 text-green-400 border-green-500/20',
    paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    idle: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md border capitalize ${map[status] ?? map['idle']}`}>
      {status}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-blue-500 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className={`text-gray-600 ${small ? 'text-[10px]' : 'text-[11px]'}`}>{label}</p>
      <p className={`text-white font-medium ${small ? 'text-[12px]' : 'text-[13px]'}`}>{value}</p>
    </div>
  );
}

export default function RegenerationPage() {
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);

  const { data: status } = useSWR('regen-status', () => api.regeneration.status(), {
    refreshInterval: (data) => (data?.status === 'running' ? 3000 : 0),
  });

  const { data: history } = useSWR('regen-history', () => api.regeneration.history());

  const isRunning = status?.status === 'running';

  const handleStart = async () => {
    setStarting(true);
    try {
      await api.regeneration.start();
      await mutate('regen-status');
      await mutate('regen-history');
    } finally {
      setStarting(false);
    }
  };

  const handlePause = async () => {
    setPausing(true);
    try {
      await api.regeneration.pause();
      await mutate('regen-status');
    } finally {
      setPausing(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Regeneration</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Re-classify all articles with the current LLM prompt version
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Status panel */}
        <div className="bg-[#131620] border border-white/5 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white">Current status</p>
            {status && <StatusBadge status={status.status} />}
          </div>

          {(!status || status.status === 'idle') && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13.5 8A5.5 5.5 0 0 1 3.3 11.5" strokeLinecap="round" />
                  <path d="M2.5 8A5.5 5.5 0 0 1 12.7 4.5" strokeLinecap="round" />
                  <path d="M11 2.5l1.7 2-2 1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 13.5l-1.7-2 2-1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm mb-1">No active regeneration</p>
              <p className="text-gray-600 text-xs mb-5">
                Re-classify all your articles with the latest prompt version
              </p>
              <button
                onClick={handleStart}
                disabled={starting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
              >
                {starting ? 'Starting…' : 'Start regeneration'}
              </button>
            </div>
          )}

          {status && (status.status === 'running' || status.status === 'paused') && (
            <div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Progress</span>
                  <span>{status.progress ?? 0}%</span>
                </div>
                <ProgressBar value={status.progress ?? 0} />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
                <Stat
                  label="Articles processed"
                  value={`${fmtNum(status.processedArticles ?? 0)} / ${fmtNum(status.totalArticles ?? 0)}`}
                />
                <Stat label="LLM calls" value={fmtNum(status.llmCalls ?? 0)} />
                <Stat label="Estimated cost" value={`$${(status.estimatedCostUsd ?? 0).toFixed(4)}`} />
                <Stat label="Started" value={fmt(status.startedAt)} />
              </dl>

              <div className="flex gap-2">
                {isRunning && (
                  <button
                    onClick={handlePause}
                    disabled={pausing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 disabled:opacity-50 text-yellow-400 border border-yellow-500/20 text-sm rounded-md transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="3" y="2" width="4" height="12" rx="1" />
                      <rect x="9" y="2" width="4" height="12" rx="1" />
                    </svg>
                    {pausing ? 'Pausing…' : 'Pause'}
                  </button>
                )}
                {status.status === 'paused' && (
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
                  >
                    Resume
                  </button>
                )}
              </div>
            </div>
          )}

          {status?.status === 'completed' && (
            <div>
              <div className="p-4 bg-green-600/5 border border-green-500/15 rounded-lg mb-4">
                <p className="text-sm text-green-400 font-medium mb-1">Completed</p>
                <p className="text-xs text-gray-500">
                  {fmtNum(status.processedArticles ?? 0)} articles ·{' '}
                  {fmtNum(status.llmCalls ?? 0)} LLM calls ·{' '}
                  ${(status.estimatedCostUsd ?? 0).toFixed(4)}
                </p>
              </div>
              <button
                onClick={handleStart}
                disabled={starting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
              >
                {starting ? 'Starting…' : 'Start new run'}
              </button>
            </div>
          )}
        </div>

        {/* History panel */}
        <div className="bg-[#131620] border border-white/5 rounded-xl p-6">
          <p className="text-sm font-medium text-white mb-4">History</p>
          {!history || history.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No previous runs</p>
          ) : (
            <div className="space-y-2.5">
              {(history).map((run) => (
                <div key={run.id} className="p-3 bg-white/[0.03] rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] text-gray-400">{fmt(run.startedAt)}</p>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Articles" value={fmtNum(run.processedArticles)} small />
                    <Stat label="LLM calls" value={fmtNum(run.llmCalls)} small />
                    <Stat label="Cost" value={`$${run.estimatedCostUsd.toFixed(4)}`} small />
                  </div>
                  {run.status === 'running' && (
                    <div className="mt-2">
                      <ProgressBar value={run.progress} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
