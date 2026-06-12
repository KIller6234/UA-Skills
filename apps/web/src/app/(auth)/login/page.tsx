'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type OAuthProvider = 'github' | 'google' | 'apple';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

function OAuthButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors"
      style={{
        background: 'var(--auth-input-bg)',
        borderColor: 'var(--auth-border)',
        color: 'var(--auth-text-muted)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--auth-text)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--auth-text-muted)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--auth-border)';
      }}
    >
      {icon}
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [oauthMsg, setOauthMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await api.login(data);
      window.location.href = '/';
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.loginFailed'));
    }
  };

  const handleOAuth = (provider: OAuthProvider) => {
    if (provider === 'apple') {
      setOauthMsg(t('auth.oauthSoon'));
      setTimeout(() => setOauthMsg(null), 3000);
      return;
    }
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div
      className="rounded-2xl border p-8 shadow-2xl animate-fade-in"
      style={{
        background: 'var(--auth-card)',
        borderColor: 'var(--auth-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <h2
        className="text-[20px] font-semibold mb-1"
        style={{ color: 'var(--auth-text)' }}
      >
        {t('auth.welcomeBack')}
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--auth-text-muted)' }}>
        {t('auth.signIn')} · News Intelligence Hub
      </p>

      {/* OAuth buttons */}
      <div className="flex gap-2 mb-5">
        <OAuthButton
          label="Google"
          onClick={() => handleOAuth('google')}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          }
        />
        <OAuthButton
          label="GitHub"
          onClick={() => handleOAuth('github')}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          }
        />
        <OAuthButton
          label="Apple"
          onClick={() => handleOAuth('apple')}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
          }
        />
      </div>

      {/* OAuth notice */}
      {oauthMsg && (
        <div className="mb-4 text-center text-[12px] py-2 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-fade-in">
          {oauthMsg}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ background: 'var(--auth-border)' }} />
        <span className="text-[11px]" style={{ color: 'var(--auth-text-muted)' }}>
          {t('auth.orContinueWith')}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--auth-border)' }} />
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] rounded-xl p-3 animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--auth-text-muted)' }}>
            {t('auth.email')}
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors"
            style={{
              background: 'var(--auth-input-bg)',
              border: `1px solid ${errors.email ? '#ef4444' : 'var(--auth-border)'}`,
              color: 'var(--auth-text)',
            }}
          />
          {errors.email && <p className="text-red-400 text-[11px] mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--auth-text-muted)' }}>
              {t('auth.password')}
            </label>
            <button
              type="button"
              className="text-[11px] transition-colors"
              style={{ color: 'var(--auth-accent)' }}
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-colors"
            style={{
              background: 'var(--auth-input-bg)',
              border: `1px solid ${errors.password ? '#ef4444' : 'var(--auth-border)'}`,
              color: 'var(--auth-text)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors mt-1"
        >
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <p className="text-center text-[13px] mt-5" style={{ color: 'var(--auth-text-muted)' }}>
        {t('auth.noAccount')}{' '}
        <Link
          href="/register"
          className="font-medium transition-colors hover:underline"
          style={{ color: 'var(--auth-accent)' }}
        >
          {t('auth.register')}
        </Link>
      </p>
    </div>
  );
}
