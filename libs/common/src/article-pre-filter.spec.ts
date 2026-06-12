import { ArticlePreFilter } from './article-pre-filter';

const LONG_BODY = 'word '.repeat(100); // 500 chars, 100 words

describe('ArticlePreFilter', () => {
  let filter: ArticlePreFilter;

  beforeEach(() => {
    filter = new ArticlePreFilter();
  });

  it('passes a valid article', () => {
    const result = filter.filter({
      title: 'TypeScript 5.5 Released with New Performance Features',
      bodyText: LONG_BODY,
      wordCount: 100,
    });
    expect(result.pass).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects empty body', () => {
    const result = filter.filter({ title: 'Title', bodyText: '', wordCount: 100 });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('empty_body');
  });

  it('rejects whitespace-only body', () => {
    const result = filter.filter({ title: 'Title', bodyText: '   ', wordCount: 100 });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('empty_body');
  });

  it('rejects article with wordCount < 50', () => {
    const result = filter.filter({ title: 'Title', bodyText: LONG_BODY, wordCount: 49 });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('too_short');
  });

  it('accepts article with wordCount exactly 50', () => {
    const result = filter.filter({ title: 'Title', bodyText: LONG_BODY, wordCount: 50 });
    expect(result.pass).toBe(true);
  });

  it('rejects article with bodyText.length < 200', () => {
    const shortBody = 'x'.repeat(199);
    const result = filter.filter({ title: 'Title', bodyText: shortBody, wordCount: 100 });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('no_extractable_text');
  });

  it('accepts article with bodyText.length exactly 200', () => {
    const body200 = 'x'.repeat(200);
    const result = filter.filter({ title: 'Title', bodyText: body200, wordCount: 100 });
    expect(result.pass).toBe(true);
  });

  it('rejects SEO spam: "top N best" pattern', () => {
    const result = filter.filter({
      title: 'Top 10 Best JavaScript Frameworks in 2024',
      bodyText: LONG_BODY,
      wordCount: 100,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('seo_spam');
  });

  it('rejects SEO spam: "click here" in title', () => {
    const result = filter.filter({
      title: 'Click Here to Learn More',
      bodyText: LONG_BODY,
      wordCount: 100,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('seo_spam');
  });

  it('rejects SEO spam: numeric list pattern "5 ways"', () => {
    const result = filter.filter({
      title: '5 Ways to Improve Your Code',
      bodyText: LONG_BODY,
      wordCount: 100,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('seo_spam');
  });

  it('rejects sponsored content', () => {
    const result = filter.filter({
      title: 'Sponsored: Cloud Services Deep Dive',
      bodyText: LONG_BODY,
      wordCount: 100,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('seo_spam');
  });

  it('rejects advertisement label', () => {
    const result = filter.filter({
      title: 'Advertisement: New Product Launch',
      bodyText: LONG_BODY,
      wordCount: 100,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('seo_spam');
  });
});
