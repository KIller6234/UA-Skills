import { sanitizeArticleHtml, htmlToText } from './article-sanitizer';

describe('sanitizeArticleHtml', () => {
  it('keeps allowed block and inline tags', () => {
    const result = sanitizeArticleHtml('<p>Hello <strong>world</strong></p>');
    expect(result).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('strips script tags entirely', () => {
    const result = sanitizeArticleHtml('<p>Text</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Text</p>');
  });

  it('strips inline event handlers', () => {
    const result = sanitizeArticleHtml('<p onclick="alert()">Click</p>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click');
  });

  it('strips javascript: href scheme', () => {
    const result = sanitizeArticleHtml('<a href="javascript:alert()">link</a>');
    expect(result).not.toContain('javascript:');
  });

  it('keeps https href in anchor tags', () => {
    const result = sanitizeArticleHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
  });

  it('strips unknown attributes', () => {
    const result = sanitizeArticleHtml('<p data-x="secret">text</p>');
    expect(result).not.toContain('data-x');
    expect(result).toContain('text');
  });

  it('discards disallowed tags but preserves text content', () => {
    const result = sanitizeArticleHtml('<div>inside div</div>');
    expect(result).toContain('inside div');
    expect(result).not.toContain('<div>');
  });

  it('keeps heading tags h1-h4', () => {
    const input = '<h1>Title</h1><h2>Sub</h2><h3>Sub2</h3><h4>Sub3</h4>';
    const result = sanitizeArticleHtml(input);
    expect(result).toContain('<h1>');
    expect(result).toContain('<h4>');
  });

  it('keeps code and pre tags', () => {
    const result = sanitizeArticleHtml('<pre><code>const x = 1;</code></pre>');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });
});

describe('htmlToText', () => {
  it('strips all HTML tags', () => {
    const result = htmlToText('<p>Hello <strong>world</strong></p>');
    expect(result).toBe('Hello world');
  });

  it('collapses multiple whitespace characters', () => {
    const result = htmlToText('<p>word1</p>   <p>word2</p>');
    expect(result).toBe('word1 word2');
  });

  it('trims leading and trailing whitespace', () => {
    const result = htmlToText('  <p>text</p>  ');
    expect(result).toBe('text');
  });

  it('returns empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
  });

  it('handles nested tags', () => {
    const result = htmlToText('<div><p><em>deep</em></p></div>');
    expect(result).toBe('deep');
  });
});
