'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

const DONE_KEY = 'nih_onboarding_done';

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 24a20 20 0 0 1 20-20M4 16a12 12 0 0 1 12-12M8 24a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round"/>
      </svg>
    ),
    titleKey: 'onboarding.step1Title',
    descKey: 'onboarding.step1Desc',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 8h8l3 4H28M4 16h24M4 24h24" strokeLinecap="round"/>
      </svg>
    ),
    titleKey: 'onboarding.step2Title',
    descKey: 'onboarding.step2Desc',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 8h20M10 8v3M22 8v3M4 16h24M8 16v3M24 16v3M6 24h20M12 24v3M20 24v3" strokeLinecap="round"/>
      </svg>
    ),
    titleKey: 'onboarding.step3Title',
    descKey: 'onboarding.step3Desc',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 16l8 8L26 8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    titleKey: 'onboarding.step4Title',
    descKey: 'onboarding.step4Desc',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
];

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingModal({ forceOpen, onClose }: OnboardingModalProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (!forceOpen && !localStorage.getItem(DONE_KEY)) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const dismiss = () => {
    localStorage.setItem(DONE_KEY, '1');
    setOpen(false);
    onClose?.();
  };

  if (!open) {return null;}

  const current = STEPS[step]!;
  const total = STEPS.length;
  const isLast = step === total - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Progress bar */}
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">{t('onboarding.welcome')}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t('onboarding.subtitle')}</p>
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Step content */}
          <div className={`rounded-xl border p-6 mb-6 ${current.bg}`}>
            <div className={`mb-4 ${current.color}`}>{current.icon}</div>
            <h3 className="text-[15px] font-semibold text-white mb-2">{t(current.titleKey)}</h3>
            <p className="text-[13px] text-gray-400 leading-relaxed">{t(current.descKey)}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step
                    ? 'w-4 h-1.5 bg-blue-500'
                    : i < step
                    ? 'w-1.5 h-1.5 bg-blue-500/50'
                    : 'w-1.5 h-1.5 bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={dismiss}
              className="text-[12px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              {t('onboarding.skip')}
            </button>

            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 text-[13px] text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors"
                >
                  {t('onboarding.back')}
                </button>
              )}
              <button
                onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
                className="px-5 py-2 text-[13px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                {isLast ? t('onboarding.done') : t('onboarding.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
