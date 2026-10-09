const { escapeHtml } = require('../js/utils.js');

describe('utils.js - escapeHtml', () => {
  test('escapes special HTML characters properly', () => {
    const raw = '<script>alert("XSS & fun")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS &amp; fun&quot;)&lt;/script&gt;';
    expect(escapeHtml(raw)).toBe(expected);
  });

  test('handles null, undefined, and empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });

  test('returns unmodified string if no special characters exist', () => {
    const cleanStr = 'Hello World 123';
    expect(escapeHtml(cleanStr)).toBe(cleanStr);
  });
});
