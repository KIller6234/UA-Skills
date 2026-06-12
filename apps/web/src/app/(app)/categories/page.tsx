'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, type Category } from '@/lib/api';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#6b7280',
];

function ColorDot({ color }: { color: string | null }) {
  return (
    <span
      className="w-3 h-3 rounded-full shrink-0 border border-white/10"
      style={{ background: color ?? '#6b7280' }}
    />
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
            value === c ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-[#151820]' : ''
          }`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function EditRow({
  category,
  onSave,
  onCancel,
}: {
  category: Category;
  onSave: (id: string, name: string, color: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color ?? '#6b7280');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {return;}
    setSaving(true);
    try { await onSave(category.id, name.trim(), color); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="px-4 py-3 bg-white/[0.03] space-y-2">
      <div className="flex gap-2 items-center">
        <ColorDot color={color} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoFocus
          className="flex-1 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-[13px] text-gray-200 focus:outline-none focus:border-blue-500/50"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[12px] font-medium rounded transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
      <ColorPicker value={color} onChange={setColor} />
    </form>
  );
}

export default function CategoriesPage() {
  const { data: categories, mutate, isLoading } = useSWR<Category[]>(
    '/categories',
    () => api.categories.list(),
  );

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {return;}
    setAdding(true);
    try {
      await api.categories.create({ name: newName.trim(), color: newColor });
      setNewName(''); setNewColor('#3b82f6'); setShowAdd(false);
      await mutate();
    } finally { setAdding(false); }
  };

  const handleUpdate = async (id: string, name: string, color: string) => {
    await api.categories.update(id, { name, color });
    setEditingId(null);
    await mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this category?')) {return;}
    await api.categories.remove(id);
    await mutate();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-white">Categories</h1>
          <p className="text-[12px] text-gray-600 mt-0.5">Classify articles into thematic groups</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 1v10M1 6h10" strokeLinecap="round" />
          </svg>
          New Category
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 bg-[#151820] border border-white/5 rounded-xl p-4 space-y-3">
          <p className="text-[11px] text-gray-600 uppercase tracking-wide">New Category</p>
          <div className="flex gap-2 items-center">
            <ColorDot color={newColor} />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              maxLength={50}
              autoFocus
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <ColorPicker value={newColor} onChange={setNewColor} />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-[12px] text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[12px] font-medium rounded transition-colors"
            >
              {adding ? 'Adding…' : 'Add Category'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse h-14 bg-white/5 rounded-xl" />)}
        </div>
      ) : !categories?.length ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-[13px]">No categories yet. Create one to start classifying articles.</p>
        </div>
      ) : (
        <div className="bg-[#151820] border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
          {categories.map((cat) =>
            editingId === cat.id ? (
              <EditRow key={cat.id} category={cat} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
            ) : (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors group">
                <ColorDot color={cat.color} />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-gray-200 font-medium">{cat.name}</span>
                </div>
                <span className="text-[11px] text-gray-600 tabular-nums mr-1">
                  {cat.articleCount} article{cat.articleCount !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingId(cat.id)}
                    className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M11 2l3 3-8 8H3v-3l8-8z" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 4h10M6 4V3h4v1M5 4v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
