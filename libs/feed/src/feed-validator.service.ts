import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Parser from 'rss-parser';
import { type Env } from '@nih/config';
import { assertPublicUrl } from './ssrf-guard';

export interface FeedPreview {
  title: string;
  description: string | null;
  canonicalUrl: string;
  itemCount: number;
  siteUrl: string | null;
}

const parser = new Parser({ timeout: 10_000 });

@Injectable()
export class FeedValidatorService {
  private readonly timeoutMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.timeoutMs = config.get('FEED_FETCH_TIMEOUT_MS', { infer: true });
  }

  async validateAndPreview(rawUrl: string): Promise<FeedPreview> {
    const parsed = await assertPublicUrl(rawUrl);
    const canonicalUrl = parsed.toString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let xml: string;
    try {
      const res = await fetch(canonicalUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NIH-Bot/1.0', Accept: 'application/rss+xml, application/atom+xml, text/xml, */*' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } finally {
      clearTimeout(timer);
    }

    const feed = await parser.parseString(xml);

    return {
      title: feed.title ?? canonicalUrl,
      description: feed.description ?? null,
      canonicalUrl,
      itemCount: feed.items.length,
      siteUrl: feed.link ?? null,
    };
  }
}
