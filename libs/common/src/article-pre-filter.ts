import { Injectable } from '@nestjs/common';

export interface FilterResult {
  pass: boolean;
  reason?: string;
}

const SEO_SPAM_PATTERNS = [
  /\b(top \d+ best|click here|buy now|limited offer|act now)\b/i,
  /^\d+ (ways|tips|tricks|hacks|reasons)/i,
  /\b(sponsored|advertisement|promoted content)\b/i,
];

@Injectable()
export class ArticlePreFilter {
  filter(article: { title: string; bodyText: string; wordCount: number }): FilterResult {
    if (!article.bodyText?.trim()) return { pass: false, reason: 'empty_body' };

    if (article.wordCount < 8) return { pass: false, reason: 'too_short' };

    if (article.bodyText.length < 40) return { pass: false, reason: 'no_extractable_text' };

    if (SEO_SPAM_PATTERNS.some((p) => p.test(article.title)))
      return { pass: false, reason: 'seo_spam' };

    return { pass: true };
  }
}
