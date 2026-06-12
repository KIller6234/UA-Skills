'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n, type Locale } from '@/lib/i18n';
import { OnboardingModal } from '@/components/onboarding-modal';

function isActive(pathname: string, href: string) {
  if (href === '/') {return pathname === '/';}
  return pathname.startsWith(href);
}

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
        active ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`}
    >
      <span className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-500'}`}>{icon}</span>
      {label}
    </Link>
  );
}

const LOCALES: { code: Locale; flag: string }[] = [
  { code: 'en', flag: '🇬🇧' },
  { code: 'uk', flag: '🇺🇦' },
  { code: 'de', flag: '🇩🇪' },
];

const MOBILE_NAV = [
  { href: '/', label: 'Dashboard', icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h6v6H1V1zm0 8h6v6H1V9zm8-8h6v6H9V1zm0 8h6v6H9V9z" opacity=".8" /></svg> },
  { href: '/articles', label: 'Articles', icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" /></svg> },
  { href: '/graph', label: 'Graph', icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" /><circle cx="2.5" cy="4" r="1.5" fill="currentColor" stroke="none" /><circle cx="13.5" cy="4" r="1.5" fill="currentColor" stroke="none" /><circle cx="2.5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="13.5" cy="12" r="1.5" fill="currentColor" stroke="none" /><path d="M6.3 7.1L3.9 5.2M9.7 7.1L12.1 5.2M6.3 8.9L3.9 10.8M9.7 8.9L12.1 10.8" /></svg> },
  { href: '/digest', label: 'Digest', icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="10" width="12" height="2.5" rx="1" /><rect x="2" y="6.5" width="12" height="2.5" rx="1" /><rect x="2" y="3" width="12" height="2.5" rx="1" /></svg> },
  { href: '/settings', label: 'Settings', icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" strokeLinecap="round" /></svg> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await api.logout();
    router.push('/login');
    router.refresh();
  };

  const SECTIONS = [
    {
      label: t('nav.content'),
      items: [
        { href: '/', label: t('nav.dashboard'), icon: <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h6v6H1V1zm0 8h6v6H1V9zm8-8h6v6H9V1zm0 8h6v6H9V9z" opacity=".8" /></svg> },
        { href: '/articles', label: t('nav.articles'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" /></svg> },
        { href: '/graph', label: t('nav.graph'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" /><circle cx="2.5" cy="4" r="1.5" fill="currentColor" stroke="none" /><circle cx="13.5" cy="4" r="1.5" fill="currentColor" stroke="none" /><circle cx="2.5" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="13.5" cy="12" r="1.5" fill="currentColor" stroke="none" /><path d="M6.3 7.1L3.9 5.2M9.7 7.1L12.1 5.2M6.3 8.9L3.9 10.8M9.7 8.9L12.1 10.8" /></svg> },
        { href: '/digest', label: t('nav.digest'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="10" width="12" height="2.5" rx="1" /><rect x="2" y="6.5" width="12" height="2.5" rx="1" /><rect x="2" y="3" width="12" height="2.5" rx="1" /></svg> },
      ],
    },
    {
      label: t('nav.manage'),
      items: [
        { href: '/feeds', label: t('nav.feeds'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12a10 10 0 0 1 10-10M2 8a6 6 0 0 1 6-6M4 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" strokeLinecap="round" /></svg> },
        { href: '/categories', label: t('nav.categories'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h4l1.5 2H14" strokeLinecap="round" /><path d="M2 8h12M2 12h12" strokeLinecap="round" /></svg> },
        { href: '/axes', label: t('nav.axes'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M5 4v1.5M11 4v1.5M2 8h12M4 8v1.5M12 8v1.5M3 12h10M6 12v1.5M10 12v1.5" strokeLinecap="round" /></svg> },
        { href: '/regeneration', label: t('nav.regeneration'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13.5 8A5.5 5.5 0 0 1 3.3 11.5" strokeLinecap="round" /><path d="M2.5 8A5.5 5.5 0 0 1 12.7 4.5" strokeLinecap="round" /><path d="M11 2.5l1.7 2-2 1.7M5 13.5l-1.7-2 2-1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> },
      ],
    },
    {
      label: 'SETTINGS',
      items: [
        { href: '/settings', label: t('nav.settings'), icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" strokeLinecap="round" /></svg> },
      ],
    },
  ];

  return (
    <>
      <OnboardingModal />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex min-h-screen transition-colors duration-200" style={{ background: 'var(--app-bg)' }}>
        <aside
          className={`fixed md:sticky top-0 z-50 md:z-auto w-[240px] flex flex-col shrink-0 h-screen transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ background: 'var(--app-sidebar)', borderRight: '1px solid var(--app-border)' }}
        >
          {/* Logo */}
          <div className="px-4 py-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--app-border)' }}>
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--app-text)' }}>
              News Intelligence<br />
              <span className="font-normal" style={{ color: 'var(--app-text-muted)' }}>Hub</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
            {SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--app-text-dim)' }}>
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem key={item.href} {...item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer: controls + logout */}
          <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--app-border)' }}>
            {/* Language + Theme row */}
            <div className="flex items-center gap-1.5 px-1">
              <div className="flex items-center gap-0.5 rounded-md p-0.5 flex-1" style={{ background: 'var(--app-border)' }}>
                {LOCALES.map(({ code, flag }) => (
                  <button
                    key={code}
                    onClick={() => setLocale(code)}
                    title={code.toUpperCase()}
                    className="flex-1 flex items-center justify-center py-1 rounded text-[10px] transition-colors"
                    style={{
                      background: locale === code ? 'var(--app-border-md)' : 'transparent',
                      color: locale === code ? 'var(--app-text)' : 'var(--app-text-muted)',
                    }}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-white/5"
              style={{ color: 'var(--app-text-muted)' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M5 8h8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('nav.signOut')}
            </button>
          </div>
        </aside>

        {/* Main content — add bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-auto animate-page transition-colors duration-200 pb-14 md:pb-0" style={{ background: 'var(--app-bg)' }}>
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30 border-b" style={{ background: 'var(--app-sidebar)', borderColor: 'var(--app-border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">N</span>
              </div>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--app-text)' }}>NIH</span>
            </div>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1.5 rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'var(--app-text-muted)' }}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t" style={{ background: 'var(--app-sidebar)', borderColor: 'var(--app-border)' }}>
        {MOBILE_NAV.map(({ href, label, icon }) => (
          <MobileNavItem key={href} href={href} label={label} icon={icon} />
        ))}
      </nav>
    </>
  );
}

function MobileNavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors ${active ? 'text-blue-400' : 'text-gray-500'}`}
    >
      <span className={active ? 'text-blue-400' : 'text-gray-500'}>{icon}</span>
      {label}
    </Link>
  );
}
