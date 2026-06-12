'use client';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/міс',
    current: false,
    features: ['5 RSS фідів', '100 статей/міс', 'Базовий дашборд', '1 дайджест/тиждень'],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/міс',
    current: true,
    features: ['Необмежені фіди', 'Необмежені статті', 'LLM аналіз', 'Всі дайджести', 'Граф зв\'язків', 'API доступ'],
  },
  {
    name: 'Team',
    price: '$49',
    period: '/міс',
    current: false,
    features: ['Все з Pro', 'До 10 користувачів', 'Спільні дайджести', 'Пріоритетна підтримка', 'SSO'],
  },
];

export default function BillingPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Білінг</h1>
      <p className="text-slate-400 mb-8">Управління підпискою та платежами</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border p-6 flex flex-col gap-4 ${
              plan.current
                ? 'border-indigo-500 bg-indigo-950/30'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">{plan.name}</span>
              {plan.current && (
                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Поточний
                </span>
              )}
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-slate-400 mb-1">{plan.period}</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-slate-300 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={`mt-2 rounded-lg py-2 text-sm font-medium transition ${
                plan.current
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
              }`}
            >
              {plan.current ? 'Активний план' : 'Вибрати план'}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <h2 className="font-semibold mb-4">Історія платежів</h2>
        <div className="text-slate-400 text-sm text-center py-8">
          Немає записів про платежі
        </div>
      </div>
    </div>
  );
}
