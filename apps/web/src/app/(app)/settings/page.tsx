'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Tab = 'profile' | 'general' | 'email' | 'integrations' | 'plan';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Профіль' },
  { id: 'general', label: 'Загальні' },
  { id: 'email', label: 'Email' },
  { id: 'integrations', label: 'Інтеграції' },
  { id: 'plan', label: 'План' },
];

interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

function AvatarPlaceholder({ name, size = 80 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || '?'}
    </div>
  );
}

function ProfileTab({ profile, onSaved }: { profile: UserProfile; onSaved: (p: UserProfile) => void }) {
  const [name, setName] = useState(profile.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateProfile({ displayName: name });
      onSaved({ ...profile, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-4">
        <AvatarPlaceholder name={name || profile.email} size={72} />
        <div>
          <p className="text-[13px] font-medium text-gray-300">{name || profile.email}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Учасник з{' '}
            {new Date(profile.createdAt).toLocaleDateString('uk-UA', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
            Ім&apos;я
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введіть ваше ім'я"
            className="w-full bg-[#151820] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-[13px] text-gray-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-gray-700 mt-1">Email не можна змінити</p>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-[13px] font-medium text-white transition-colors"
      >
        {saving ? 'Збереження…' : saved ? '✓ Збережено' : 'Зберегти зміни'}
      </button>
    </div>
  );
}

function GeneralTab() {
  const [timezone, setTimezone] = useState('Europe/Kyiv');
  const [language, setLanguage] = useState('uk');

  const TIMEZONES = [
    'Europe/Kyiv',
    'Europe/Warsaw',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
  ];
  const LANGUAGES = [
    { code: 'uk', label: 'Українська' },
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
  ];

  return (
    <div className="max-w-md space-y-6">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
          Часовий пояс
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full bg-[#151820] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-indigo-500/60"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">
          Мова інтерфейсу
        </label>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-4 py-2 rounded-lg text-[13px] border transition-colors ${
                language === lang.code
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-[#151820] border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[13px] font-medium text-white transition-colors">
        Зберегти зміни
      </button>
    </div>
  );
}

function EmailTab() {
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between p-4 bg-[#151820] border border-white/5 rounded-xl">
        <div>
          <p className="text-[13px] font-medium text-gray-200">Email-дайджест</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Отримувати дайджести на пошту</p>
        </div>
        <button
          onClick={() => setDigestEnabled(!digestEnabled)}
          className="relative flex-shrink-0"
          style={{ width: 40, height: 22 }}
          aria-label="Toggle digest"
        >
          <span
            className={`absolute inset-0 rounded-full transition-colors ${
              digestEnabled ? 'bg-indigo-600' : 'bg-gray-700'
            }`}
          />
          <span
            className="absolute top-0.5 rounded-full bg-white shadow transition-all"
            style={{ width: 18, height: 18, top: 2, left: digestEnabled ? 20 : 2 }}
          />
        </button>
      </div>

      {digestEnabled && (
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Частота
          </label>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-4 py-2 rounded-lg text-[13px] border transition-colors ${
                  frequency === f
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-[#151820] border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                {f === 'daily' ? 'Щодня' : f === 'weekly' ? 'Щотижня' : 'Щомісяця'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[13px] font-medium text-white transition-colors">
        Зберегти зміни
      </button>
    </div>
  );
}

function IntegrationsTab() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const maskedKey = 'sk-••••••••••••••••••••••••••••••••••••';

  return (
    <div className="max-w-md space-y-6">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
          LLM API ключ
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={maskedKey}
            disabled
            className="flex-1 bg-[#0f1117] border border-white/5 rounded-lg px-3 py-2 text-[13px] text-gray-500 font-mono cursor-not-allowed"
          />
          <button className="px-3 py-2 bg-[#151820] border border-white/10 rounded-lg text-[12px] text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap">
            Оновити
          </button>
        </div>
        <p className="text-[11px] text-gray-700 mt-1">Ключ налаштовується через змінні середовища</p>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
          Webhook URL
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://your-service.com/webhook"
          className="w-full bg-[#151820] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
        />
        <p className="text-[11px] text-gray-700 mt-1">
          Отримувати POST-повідомлення про нові дайджести
        </p>
      </div>

      <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[13px] font-medium text-white transition-colors">
        Зберегти
      </button>
    </div>
  );
}

function PlanTab({ profile }: { profile: UserProfile }) {
  const planFeatures = [
    '∞ RSS-фіди',
    '50 000 статей / місяць',
    '5 000 LLM-викликів / місяць',
    'Повний граф зв\'язків',
    'Дайджести (день / тиждень / місяць)',
    'API-доступ',
  ];

  return (
    <div className="max-w-md space-y-6">
      <div className="p-5 bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/20 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold text-white">Pro Plan</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Активний · до{' '}
              {new Date(Date.now() + 30 * 86400000).toLocaleDateString('uk-UA')}
            </p>
          </div>
          <span className="px-2 py-0.5 bg-indigo-600/30 border border-indigo-500/30 rounded text-[11px] text-indigo-300 font-medium">
            Pro
          </span>
        </div>
        <ul className="space-y-1.5 mt-4">
          {planFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[12px] text-gray-400">
              <svg
                className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 8l3.5 3.5 6.5-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span>LLM-виклики цього місяця</span>
            <span>3 240 / 5 000</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '64.8%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span>Статті цього місяця</span>
            <span>12 842 / 50 000</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '25.7%' }} />
          </div>
        </div>
      </div>

      <p className="text-[12px] text-gray-600">
        Обліковий запис: <span className="text-gray-400">{profile.email}</span>
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setProfile)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-[13px] text-red-400">Не вдалося завантажити профіль</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-7">
        <h1 className="text-[15px] font-semibold text-white">Налаштування</h1>
        <p className="text-[12px] text-gray-600 mt-0.5">
          Керуйте своїм профілем та налаштуваннями
        </p>
      </div>

      <div className="flex gap-0.5 mb-8 border-b border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-indigo-400 border-indigo-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <ProfileTab profile={profile} onSaved={setProfile} />
      )}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'email' && <EmailTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'plan' && <PlanTab profile={profile} />}
    </div>
  );
}
