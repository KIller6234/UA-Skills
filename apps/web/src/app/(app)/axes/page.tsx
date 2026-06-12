'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, type Axis, type AxisValue } from '@/lib/api';

function ValueTag({
  value,
  onRemove,
}: {
  value: AxisValue;
  onRemove: (id: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[11px] text-gray-400">
      <span className="text-gray-600 font-mono">{value.value}</span>
      <span>·</span>
      <span>{value.label}</span>
      <button
        type="button"
        onClick={() => onRemove(value.id)}
        className="ml-0.5 text-gray-600 hover:text-red-400 transition-colors leading-none"
      >
        ×
      </button>
    </span>
  );
}

function AddValueForm({
  axisId,
  onAdd,
}: {
  axisId: string;
  onAdd: (axisId: string, value: string, label: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !label.trim()) {return;}
    setSaving(true);
    try {
      await onAdd(axisId, value.trim(), label.trim());
      setValue(''); setLabel(''); setOpen(false);
    } finally { setSaving(false); }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-gray-600 hover:text-blue-400 transition-colors flex items-center gap-1"
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 1v10M1 6h10" strokeLinecap="round" />
        </svg>
        Add value
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2 items-center flex-wrap mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="key (e.g. positive)"
        maxLength={50}
        autoFocus
        className="w-32 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="display label"
        maxLength={50}
        className="w-36 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
      />
      <button
        type="submit"
        disabled={saving || !value.trim() || !label.trim()}
        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] rounded transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setValue(''); setLabel(''); }}
        className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

function AxisCard({
  axis,
  onUpdate,
  onDelete,
  onAddValue,
  onRemoveValue,
}: {
  axis: Axis;
  onUpdate: (id: string, label: string, description: string) => Promise<void>;
  onDelete: (id: string) => void;
  onAddValue: (axisId: string, value: string, label: string) => Promise<void>;
  onRemoveValue: (axisId: string, valueId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(axis.label);
  const [editDesc, setEditDesc] = useState(axis.description ?? '');
  const [saving, setSaving] = useState(false);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(axis.id, editLabel, editDesc);
      setEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-[#151820] border border-white/5 rounded-xl overflow-hidden">
      {/* Axis header */}
      {editing ? (
        <form onSubmit={submitEdit} className="p-4 space-y-2 border-b border-white/5">
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            maxLength={50}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-[13px] text-gray-200 focus:outline-none focus:border-blue-500/50"
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-[12px] text-gray-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[12px] font-medium rounded transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setEditLabel(axis.label); setEditDesc(axis.description ?? ''); }}
              className="px-3 py-1.5 text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5 group border-b border-white/5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-200">{axis.label}</span>
              <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">
                {axis.key}
              </span>
            </div>
            {axis.description && (
              <p className="text-[11px] text-gray-600 mt-0.5">{axis.description}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11 2l3 3-8 8H3v-3l8-8z" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(axis.id)}
              className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Values */}
      <div className="px-4 py-3 space-y-2">
        {axis.values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {axis.values.map((v) => (
              <ValueTag
                key={v.id}
                value={v}
                onRemove={(valueId) => onRemoveValue(axis.id, valueId)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-700">No values yet</p>
        )}
        <AddValueForm axisId={axis.id} onAdd={onAddValue} />
      </div>
    </div>
  );
}

function CreateAxisForm({ onCreate }: { onCreate: (key: string, label: string, description: string) => Promise<void> }) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !label.trim()) {return;}
    setSaving(true);
    try {
      await onCreate(key.trim(), label.trim(), desc.trim());
      setKey(''); setLabel(''); setDesc('');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="bg-[#151820] border border-white/5 rounded-xl p-4 space-y-3">
      <p className="text-[11px] text-gray-600 uppercase tracking-wide">New Axis</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-gray-600 block mb-1">Key <span className="text-gray-700">(machine-readable)</span></label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="e.g. sentiment"
            maxLength={50}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-2 text-[13px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50 font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] text-gray-600 block mb-1">Label <span className="text-gray-700">(display name)</span></label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Sentiment"
            maxLength={50}
            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-2 text-[13px] text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-2 text-[12px] text-gray-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
      />
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving || !key.trim() || !label.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[12px] font-medium rounded-lg transition-colors"
        >
          {saving ? 'Creating…' : 'Create Axis'}
        </button>
      </div>
    </form>
  );
}

export default function AxesPage() {
  const { data: axes, mutate, isLoading } = useSWR<Axis[]>(
    '/axes',
    () => api.axes.list(),
  );

  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (key: string, label: string, description: string) => {
    await api.axes.create({ key, label, description: description || undefined });
    setShowCreate(false);
    await mutate();
  };

  const handleUpdate = async (id: string, label: string, description: string) => {
    await api.axes.update(id, { label, description: description || undefined });
    await mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this axis and all its values?')) {return;}
    await api.axes.remove(id);
    await mutate();
  };

  const handleAddValue = async (axisId: string, value: string, label: string) => {
    await api.axes.addValue(axisId, { value, label });
    await mutate();
  };

  const handleRemoveValue = async (axisId: string, valueId: string) => {
    if (!confirm('Remove this value?')) {return;}
    await api.axes.removeValue(axisId, valueId);
    await mutate();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-white">Axes</h1>
          <p className="text-[12px] text-gray-600 mt-0.5">Multi-dimensional classification axes for LLM analysis</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 1v10M1 6h10" strokeLinecap="round" />
          </svg>
          New Axis
        </button>
      </div>

      {showCreate && (
        <div className="mb-4">
          <CreateAxisForm onCreate={handleCreate} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-28 bg-white/5 rounded-xl" />)}
        </div>
      ) : !axes?.length ? (
        <div className="text-center py-16 text-gray-600">
          <svg className="w-8 h-8 mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h18M3 8h18M3 12h18M3 16h14M3 20h10" strokeLinecap="round" />
          </svg>
          <p className="text-[13px]">No axes yet. Create one to enable multi-dimensional article analysis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {axes.map((axis) => (
            <AxisCard
              key={axis.id}
              axis={axis}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddValue={handleAddValue}
              onRemoveValue={handleRemoveValue}
            />
          ))}
        </div>
      )}
    </div>
  );
}
