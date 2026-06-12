'use client';

import { useI18n, type Locale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

const LOCALES: { code: Locale; flag: string; label: string }[] = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'uk', flag: '🇺🇦', label: 'UK' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale, setLocale, t } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 transition-colors duration-300"
      style={{ background: 'var(--auth-bg)' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(59,130,246,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139,92,246,0.04) 0%, transparent 50%)',
        }}
      />

      {/* Top-right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        {/* Language picker */}
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-lg p-0.5">
          {LOCALES.map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => setLocale(code)}
              title={flag}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                locale === code
                  ? 'bg-white/15 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-11V0m0 16v-1.5M2.05 2.05l1.06 1.06m9.78 9.78 1.06 1.06M0 8h1.5m13 0H16M2.05 13.95l1.06-1.06M12.89 3.11l1.06-1.06" strokeWidth="0" />
              <path fill="none" stroke="currentColor" strokeWidth="1.2" d="M8 2V1m0 14v-1M2 8H1m14 0h-1M3.5 3.5l-.7-.7m10.4 10.4-.7-.7M3.5 12.5l-.7.7m10.4-10.4-.7.7"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/20">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--auth-text)' }}>
            {t('app.name')}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--auth-text-muted)' }}>
            {t('app.tagline')}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
