export const API_BASE = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (res.status === 204) {return undefined as T;}

  const body = await res.json() as T;
  if (!res.ok) {
    const err = body as { message?: string };
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return body;
}

export type FeedStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ERROR';

export interface Feed {
  id: string;
  url: string;
  canonicalUrl: string;
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  status: FeedStatus;
  lastError: string | null;
  lastPolledAt: string | null;
  consecutiveFailures: number;
  createdAt: string;
}

export type DashboardPeriod = '7d' | '30d' | 'all';

export interface StatCard {
  value: number;
  delta: string;
}

export interface DashboardStats {
  articlesProcessed: StatCard;
  entitiesFound: StatCard;
  activeFeedsCount: { value: number; delta: string };
  llmCallsThisMonth: StatCard;
  importanceBreakdown: { high: number; normal: number; junk: number };
  topCategories: { name: string; count: number }[];
  topEntities: { id: string; name: string; kind: string; count: number }[];
  recentArticles: {
    id: string;
    title: string;
    sourceDomain: string | null;
    publishedAt: string | null;
    importance: number | null;
    feedTitle: string | null;
  }[];
  activityChart: { date: string; articles: number; llmCalls: number }[];
}

export interface ArticleListItem {
  id: string;
  title: string;
  sourceDomain: string | null;
  publishedAt: string | null;
  status: string;
  importance: number | null;
  categoryIds: string[];
  entities: { id: string; canonicalName: string; kind: string }[];
  feedId: string | null;
  feedTitle: string | null;
  similarCount: number;
}

export interface ArticlesResponse {
  items: ArticleListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ArticleDetail {
  id: string;
  title: string;
  bodyText: string | null;
  canonicalUrl: string | null;
  sourceDomain: string | null;
  publishedAt: string | null;
  status: string;
  importance: number | null;
  summary: string | null;
  keywords: string[];
  categories: { id: string; name: string; color: string | null }[];
  entities: { id: string; canonicalName: string; kind: string; mentionCount: number }[];
  feedTitle: string | null;
}

export interface GraphData {
  nodes: {
    id: string;
    type: 'article' | 'entity';
    label: string;
    importance?: 'high' | 'normal' | 'junk';
    entityType?: string;
    ts?: string;
    data: { articleId?: string; entityId?: string };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: 'mentions' | 'co_mention';
    weight?: number;
  }[];
  trimmed: boolean;
  totalNodes: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sortOrder: number;
  isArchived: boolean;
  articleCount: number;
}

export interface AxisValue {
  id: string;
  axisId: string;
  value: string;
  label: string;
  sortOrder: number;
}

export interface Axis {
  id: string;
  key: string;
  label: string;
  description: string | null;
  sortOrder: number;
  values: AxisValue[];
}

export interface DigestListItem {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: string | null;
  articleCount: number;
  createdAt: string;
}

export interface DigestDetail extends DigestListItem {
  bodyMarkdown: string | null;
  items: {
    rank: number;
    reason: string | null;
    article: {
      id: string;
      title: string;
      sourceDomain: string | null;
      publishedAt: string | null;
      importance: number | null;
      summary: string | null;
    };
  }[];
}

export interface RegenerationStatus {
  status: 'idle' | 'running' | 'completed' | 'paused';
  runId?: string;
  progress?: number;
  processedArticles?: number;
  totalArticles?: number;
  llmCalls?: number;
  estimatedCostUsd?: number;
  startedAt?: string;
  completedAt?: string | null;
}

export interface RegenerationRun {
  id: string;
  status: string;
  progress: number;
  processedArticles: number;
  totalArticles: number;
  llmCalls: number;
  estimatedCostUsd: number;
  startedAt: string;
  completedAt: string | null;
}

export const api = {
  register: (data: { email: string; password: string; displayName?: string }) =>
    request<{ confirmUrl: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  confirm: (token: string) =>
    request<void>(`/auth/confirm/${token}`),

  login: (data: { email: string; password: string }) =>
    request<{ id: string; email: string; displayName: string | null }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ id: string; email: string; displayName: string | null; createdAt: string }>('/auth/me'),
  updateProfile: (data: { displayName?: string }) =>
    request<{ id: string; email: string; displayName: string | null }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  dashboard: {
    stats: (period: DashboardPeriod = '7d') =>
      request<DashboardStats>(`/dashboard/stats?period=${period}`),
  },

  articles: {
    list: (params: {
      page?: number; limit?: number; q?: string;
      importance?: 'high' | 'normal' | 'junk';
      feedId?: string; categoryId?: string;
    } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
      return request<ArticlesResponse>(`/articles?${qs.toString()}`);
    },
    get: (id: string) => request<ArticleDetail>(`/articles/${id}`),
    similar: (id: string) => request<{ id: string; title: string; sourceDomain: string | null; publishedAt: string | null; feedArticles: { feed: { title: string | null } }[] }[]>(`/articles/${id}/similar`),
  },

  graph: {
    get: (params: { period?: string; nodeTypes?: string; categoryId?: string } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
      return request<GraphData>(`/graph?${qs.toString()}`);
    },
  },

  categories: {
    list: () => request<Category[]>('/categories'),
    create: (data: { name: string; color?: string }) =>
      request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; color?: string }) =>
      request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
  },

  axes: {
    list: () => request<Axis[]>('/axes'),
    create: (data: { key: string; label: string; description?: string }) =>
      request<Axis>('/axes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { label?: string; description?: string }) =>
      request<Axis>(`/axes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/axes/${id}`, { method: 'DELETE' }),
    addValue: (axisId: string, data: { value: string; label: string }) =>
      request<AxisValue>(`/axes/${axisId}/values`, { method: 'POST', body: JSON.stringify(data) }),
    removeValue: (axisId: string, valueId: string) =>
      request<void>(`/axes/${axisId}/values/${valueId}`, { method: 'DELETE' }),
  },

  feeds: {
    list: () => request<Feed[]>('/feeds'),
    create: (url: string) =>
      request<Feed>('/feeds', { method: 'POST', body: JSON.stringify({ url }) }),
    updateStatus: (id: string, status: 'ACTIVE' | 'PAUSED') =>
      request<Feed>(`/feeds/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    remove: (id: string) => request<void>(`/feeds/${id}`, { method: 'DELETE' }),
    triggerPoll: (id: string) =>
      request<{ queued: boolean }>(`/feeds/${id}/poll`, { method: 'POST' }),
  },

  digests: {
    list: (params: { period?: string; page?: number; limit?: number } = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
      return request<{ items: DigestListItem[]; total: number; page: number; limit: number }>(`/digests?${qs.toString()}`);
    },
    get: (id: string) => request<DigestDetail>(`/digests/${id}`),
    trigger: (period: string) =>
      request<{ queued: boolean; period: string }>('/digests', { method: 'POST', body: JSON.stringify({ period }) }),
    remove: (id: string) => request<void>(`/digests/${id}`, { method: 'DELETE' }),
  },

  regeneration: {
    start: () => request<{ runId: string; status: string }>('/regeneration', { method: 'POST' }),
    status: () => request<RegenerationStatus>('/regeneration/status'),
    history: () => request<RegenerationRun[]>('/regeneration/history'),
    pause: () => request<{ runId: string; status: string }>('/regeneration/pause', { method: 'POST' }),
  },
};
