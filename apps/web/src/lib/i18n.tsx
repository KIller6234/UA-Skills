'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Locale = 'en' | 'uk' | 'de';

const translations = {
  en: {
    app: { name: 'News Intelligence Hub', tagline: 'AI-powered news aggregation' },
    nav: {
      dashboard: 'Dashboard', articles: 'Articles', digest: 'Digests',
      graph: 'Knowledge Graph', feeds: 'Feeds', categories: 'Categories',
      axes: 'Axes', regeneration: 'Regeneration', settings: 'Settings',
      content: 'CONTENT', manage: 'MANAGE', signOut: 'Sign out', tour: 'Tour',
    },
    auth: {
      signIn: 'Sign in', signUp: 'Create account',
      email: 'Email', password: 'Password', displayName: 'Display name',
      optional: 'Optional', forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
      register: 'Register', login: 'Sign in',
      orContinueWith: 'Or continue with',
      signingIn: 'Signing in…', creating: 'Creating account…',
      checkEmail: 'Check your email',
      emailSent: 'Development mode: click the link below to confirm your account',
      confirmEmail: 'Confirm Email',
      oauthSoon: 'OAuth coming soon — stay tuned',
      loginFailed: 'Login failed', registerFailed: 'Registration failed',
      welcomeBack: 'Welcome back', joinToday: 'Join today',
    },
    onboarding: {
      welcome: 'Welcome to NIH!',
      subtitle: 'Let\'s get you set up in 4 quick steps',
      step1Title: 'Add your first feed',
      step1Desc: 'Go to Feeds and paste any RSS/Atom URL. Articles will start flowing in automatically.',
      step2Title: 'Customize categories',
      step2Desc: 'Create thematic categories so the AI knows how to classify your articles.',
      step3Title: 'Configure axes',
      step3Desc: 'Define multi-dimensional analysis axes for deeper LLM classification.',
      step4Title: "You're all set!",
      step4Desc: 'Articles are auto-analyzed and appear in your Dashboard. Enjoy the intelligence!',
      next: 'Next', back: 'Back', skip: 'Skip tour', done: 'Get started',
      progress: 'Step {n} of {total}',
    },
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
      add: 'Add', loading: 'Loading…', search: 'Search', close: 'Close',
    },
  },
  uk: {
    app: { name: 'News Intelligence Hub', tagline: 'AI-агрегація новин' },
    nav: {
      dashboard: 'Дашборд', articles: 'Статті', digest: 'Дайджести',
      graph: 'Граф знань', feeds: 'Стрічки', categories: 'Категорії',
      axes: 'Осі', regeneration: 'Регенерація', settings: 'Налаштування',
      content: 'КОНТЕНТ', manage: 'КЕРУВАННЯ', signOut: 'Вийти', tour: 'Тур',
    },
    auth: {
      signIn: 'Увійти', signUp: 'Створити акаунт',
      email: 'Email', password: 'Пароль', displayName: "Ім'я",
      optional: "Необов'язково", forgotPassword: 'Забули пароль?',
      noAccount: 'Немає акаунту?', haveAccount: 'Вже є акаунт?',
      register: 'Реєстрація', login: 'Увійти',
      orContinueWith: 'Або продовжити через',
      signingIn: 'Вхід…', creating: 'Створення акаунту…',
      checkEmail: 'Перевірте пошту',
      emailSent: 'Режим розробки: натисніть посилання нижче для підтвердження',
      confirmEmail: 'Підтвердити Email',
      oauthSoon: 'OAuth незабаром — стежте за оновленнями',
      loginFailed: 'Помилка входу', registerFailed: 'Помилка реєстрації',
      welcomeBack: 'З поверненням', joinToday: 'Приєднуйтесь',
    },
    onboarding: {
      welcome: 'Ласкаво просимо до NIH!',
      subtitle: 'Налаштуймо все за 4 кроки',
      step1Title: 'Додайте першу стрічку',
      step1Desc: 'Перейдіть до Стрічок та вставте URL будь-якої RSS/Atom. Статті почнуть надходити автоматично.',
      step2Title: 'Налаштуйте категорії',
      step2Desc: "Створіть тематичні категорії, щоб AI знав як класифікувати ваші статті.",
      step3Title: 'Налаштуйте осі',
      step3Desc: 'Визначте багатовимірні осі аналізу для глибшої LLM-класифікації.',
      step4Title: 'Все готово!',
      step4Desc: 'Статті автоматично аналізуються та з\'являються в Дашборді. Насолоджуйтесь!',
      next: 'Далі', back: 'Назад', skip: 'Пропустити', done: 'Почати',
      progress: 'Крок {n} з {total}',
    },
    common: {
      save: 'Зберегти', cancel: 'Скасувати', delete: 'Видалити', edit: 'Редагувати',
      add: 'Додати', loading: 'Завантаження…', search: 'Пошук', close: 'Закрити',
    },
  },
  de: {
    app: { name: 'News Intelligence Hub', tagline: 'KI-gestützte Nachrichtenaggregation' },
    nav: {
      dashboard: 'Dashboard', articles: 'Artikel', digest: 'Digest',
      graph: 'Wissensgraph', feeds: 'Feeds', categories: 'Kategorien',
      axes: 'Achsen', regeneration: 'Regenerierung', settings: 'Einstellungen',
      content: 'INHALTE', manage: 'VERWALTEN', signOut: 'Abmelden', tour: 'Tour',
    },
    auth: {
      signIn: 'Anmelden', signUp: 'Konto erstellen',
      email: 'E-Mail', password: 'Passwort', displayName: 'Anzeigename',
      optional: 'Optional', forgotPassword: 'Passwort vergessen?',
      noAccount: 'Noch kein Konto?', haveAccount: 'Bereits ein Konto?',
      register: 'Registrieren', login: 'Anmelden',
      orContinueWith: 'Oder weiter mit',
      signingIn: 'Anmelden…', creating: 'Konto wird erstellt…',
      checkEmail: 'E-Mail überprüfen',
      emailSent: 'Entwicklungsmodus: Klicken Sie den Link unten zur Bestätigung',
      confirmEmail: 'E-Mail bestätigen',
      oauthSoon: 'OAuth demnächst — bleiben Sie dran',
      loginFailed: 'Anmeldung fehlgeschlagen', registerFailed: 'Registrierung fehlgeschlagen',
      welcomeBack: 'Willkommen zurück', joinToday: 'Jetzt beitreten',
    },
    onboarding: {
      welcome: 'Willkommen bei NIH!',
      subtitle: 'In 4 Schritten einrichten',
      step1Title: 'Ersten Feed hinzufügen',
      step1Desc: 'Gehe zu Feeds und füge eine RSS/Atom-URL ein. Artikel fließen automatisch.',
      step2Title: 'Kategorien anpassen',
      step2Desc: 'Erstelle thematische Kategorien damit die KI deine Artikel richtig klassifiziert.',
      step3Title: 'Achsen konfigurieren',
      step3Desc: 'Definiere mehrdimensionale Analyseachsen für tiefere LLM-Klassifizierung.',
      step4Title: 'Alles bereit!',
      step4Desc: 'Artikel werden automatisch analysiert und im Dashboard angezeigt. Viel Spaß!',
      next: 'Weiter', back: 'Zurück', skip: 'Tour überspringen', done: 'Loslegen',
      progress: 'Schritt {n} von {total}',
    },
    common: {
      save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten',
      add: 'Hinzufügen', loading: 'Laden…', search: 'Suchen', close: 'Schließen',
    },
  },
} as const;

type Translations = typeof translations.en;
type DeepKeys<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends Record<string, string>
    ? `${Prefix}${K & string}.${string & keyof T[K]}`
    : never;
}[keyof T];

export type TranslationKey = DeepKeys<Translations>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
});

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (typeof cur !== 'object' || cur === null) {return path;}
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : path;
}

const LOCALE_KEY = 'nih_locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored && stored in translations) {setLocaleState(stored);}
    else {
      const browser = navigator.language.slice(0, 2) as Locale;
      if (browser in translations) {setLocaleState(browser);}
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
    document.documentElement.lang = l;
  };

  const t = (key: string) =>
    getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
