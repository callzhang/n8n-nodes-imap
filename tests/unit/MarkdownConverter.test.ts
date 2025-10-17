/**
 * Unit Tests for MarkdownConverter
 *
 * Tests the HTML to Markdown conversion and JSON extraction utilities
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  htmlToMarkdown,
  cleanHtml,
  htmlToText,
  extractJsonFromMixedContent,
  cleanExtractedJson,
} from '../../nodes/Imap/utils/MarkdownConverter';

describe('MarkdownConverter', () => {
  describe('htmlToMarkdown', () => {
    it('should convert simple HTML to markdown', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('Hello **world**!');
    });

    it('should handle empty HTML', () => {
      const result = htmlToMarkdown('');
      expect(result).toBe('');
    });

    it('should handle null/undefined HTML', () => {
      expect(htmlToMarkdown(null as any)).toBe('');
      expect(htmlToMarkdown(undefined as any)).toBe('');
    });

    it('should remove images and replace with [Image]', () => {
      const html = '<img src="data:image/png;base64,abc123" alt="Test">';
      const result = htmlToMarkdown(html);
      expect(result).toContain('[Image]');
    });

    it('should handle long URLs by simplifying them', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      const html = `<a href="${longUrl}">Link</a>`;
      const result = htmlToMarkdown(html);
      expect(result).not.toContain(longUrl);
    });

    it('should clean up excessive whitespace', () => {
      const html = '<p>   Multiple   spaces   </p>';
      const result = htmlToMarkdown(html);
      expect(result).not.toContain('   ');
    });

    it('should handle Chinese characters correctly', () => {
      const html = '<p>你好世界！</p>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('你好世界！');
    });

    it('should convert lists properly', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('should handle blockquotes', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('This is a quote');
    });
  });

  describe('cleanHtml', () => {
    it('should remove script and style tags', () => {
      const html = '<div><script>alert("test")</script><style>body{color:red}</style>Content</div>';
      const result = cleanHtml(html);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<style>');
      expect(result).toContain('Content');
    });

    it('should remove comments', () => {
      const html = '<div>Content<!-- This is a comment -->More content</div>';
      const result = cleanHtml(html);
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('-->');
    });

    it('should remove base64 images', () => {
      const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Test">';
      const result = cleanHtml(html);
      expect(result).toContain('[Image removed - base64 data]');
    });

    it('should remove style attributes', () => {
      const html = '<div style="color: red; font-size: 14px;">Content</div>';
      const result = cleanHtml(html);
      expect(result).not.toContain('style=');
      expect(result).toContain('Content');
    });

    it('should remove class attributes', () => {
      const html = '<div class="test-class">Content</div>';
      const result = cleanHtml(html);
      expect(result).not.toContain('class=');
      expect(result).toContain('Content');
    });

    it('should convert divs to paragraphs', () => {
      const html = '<div>Content</div>';
      const result = cleanHtml(html);
      expect(result).toContain('<p>Content</p>');
    });

    it('should handle empty paragraphs', () => {
      const html = '<p></p><p>&nbsp;</p><p>Content</p>';
      const result = cleanHtml(html);
      expect(result).not.toContain('<p></p>');
      expect(result).toContain('Content');
    });

    it('should clean up excessive whitespace', () => {
      const html = '<div>   Multiple   spaces   </div>';
      const result = cleanHtml(html);
      expect(result).not.toContain('   ');
    });
  });

  describe('htmlToText', () => {
    it('should convert HTML to plain text', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const result = htmlToText(html);
      expect(result).toContain('Hello world!');
    });

    it('should handle links with URLs', () => {
      const html = '<a href="https://example.com">Link text</a>';
      const result = htmlToText(html);
      expect(result).toContain('Link text (https://example.com)');
    });

    it('should handle long URLs by showing only text', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000);
      const html = `<a href="${longUrl}">Link text</a>`;
      const result = htmlToText(html);
      expect(result).toBe('Link text');
    });

    it('should convert lists to bullet points', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = htmlToText(html);
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
    });

    it('should handle blockquotes', () => {
      const html = '<blockquote>This is a quote</blockquote>';
      const result = htmlToText(html);
      expect(result).toContain('> This is a quote');
    });

    it('should decode HTML entities', () => {
      const html = '&lt;tag&gt; &amp; &quot;quoted&quot;';
      const result = htmlToText(html);
      expect(result).toContain('<tag> & "quoted"');
    });

    it('should handle Chinese characters', () => {
      const html = '<p>你好世界！</p>';
      const result = htmlToText(html);
      expect(result).toContain('你好世界！');
    });

    it('should clean up whitespace', () => {
      const html = '<p>   Multiple   spaces   </p>';
      const result = htmlToText(html);
      expect(result).not.toContain('   ');
    });
  });

  describe('extractJsonFromMixedContent', () => {
    it('should extract JSON from markdown code blocks', () => {
      const content = '```json\n{"uid": 123, "path": "INBOX"}\n```\nSome other content';
      const result = extractJsonFromMixedContent(content);

      expect(result).not.toBeNull();
      expect(result?.json).toEqual({ uid: 123, path: 'INBOX' });
      expect(result?.remainingContent).toContain('Some other content');
    });

    it('should extract JSON from beginning of content', () => {
      const content = '{"uid": 123, "path": "INBOX"}\nSome other content';
      const result = extractJsonFromMixedContent(content);

      expect(result).not.toBeNull();
      expect(result?.json).toEqual({ uid: 123, path: 'INBOX' });
      expect(result?.remainingContent).toContain('Some other content');
    });

    it('should handle pure JSON content', () => {
      const content = '{"uid": 123, "path": "INBOX"}';
      const result = extractJsonFromMixedContent(content);

      expect(result).not.toBeNull();
      expect(result?.json).toEqual({ uid: 123, path: 'INBOX' });
      expect(result?.remainingContent).toBe('');
    });

    it('should handle malformed JSON gracefully', () => {
      const content = '```json\n{"uid": 123, "path": "INBOX"\n```\nSome content';
      const result = extractJsonFromMixedContent(content);

      expect(result).toBeNull();
    });

    it('should handle content without JSON', () => {
      const content = 'This is just plain text content';
      const result = extractJsonFromMixedContent(content);

      expect(result).toBeNull();
    });

    it('should handle empty content', () => {
      const result = extractJsonFromMixedContent('');
      expect(result).toBeNull();
    });

    it('should handle null/undefined content', () => {
      expect(extractJsonFromMixedContent(null as any)).toBeNull();
      expect(extractJsonFromMixedContent(undefined as any)).toBeNull();
    });

    it('should handle complex JSON with nested objects', () => {
      const json = {
        uid: 123,
        path: 'INBOX',
        metadata: {
          flags: ['\\Seen'],
          size: 1024,
        },
        labels: ['Important', 'Urgent'],
      };
      const content = JSON.stringify(json) + '\nSome other content';
      const result = extractJsonFromMixedContent(content);

      expect(result).not.toBeNull();
      expect(result?.json).toEqual(json);
    });

    it('should handle JSON arrays', () => {
      const json = [{ uid: 1 }, { uid: 2 }, { uid: 3 }];
      const content = JSON.stringify(json) + '\nSome other content';
      const result = extractJsonFromMixedContent(content);

      expect(result).not.toBeNull();
      expect(result?.json).toEqual(json);
    });
  });

  describe('cleanExtractedJson', () => {
    it('should clean string values by removing excessive whitespace', () => {
      const json = {
        subject: '   Multiple   spaces   ',
        body: 'Line 1\n\n\nLine 2',
        flags: ['\\Seen', '\\Flagged'],
      };
      const result = cleanExtractedJson(json);

      expect(result.subject).toBe('Multiple spaces');
      expect(result.body).toBe('Line 1 Line 2');
      expect(result.flags).toEqual(['\\Seen', '\\Flagged']);
    });

    it('should handle nested objects', () => {
      const json = {
        envelope: {
          subject: '   Test Subject   ',
          from: '   sender@test.com   ',
        },
        flags: ['\\Seen'],
      };
      const result = cleanExtractedJson(json);

      expect(result.envelope.subject).toBe('Test Subject');
      expect(result.envelope.from).toBe('sender@test.com');
    });

    it('should handle arrays', () => {
      const json = {
        flags: ['   \\Seen   ', '   \\Flagged   '],
        labels: ['   Important   ', '   Urgent   '],
      };
      const result = cleanExtractedJson(json);

      expect(result.flags).toEqual(['\\Seen', '\\Flagged']);
      expect(result.labels).toEqual(['Important', 'Urgent']);
    });

    it('should handle null and undefined values', () => {
      const json = {
        subject: null,
        body: undefined,
        flags: ['\\Seen'],
      };
      const result = cleanExtractedJson(json);

      expect(result.subject).toBeNull();
      expect(result.body).toBeUndefined();
      expect(result.flags).toEqual(['\\Seen']);
    });

    it('should handle non-object values', () => {
      expect(cleanExtractedJson('string')).toBe('string');
      expect(cleanExtractedJson(123)).toBe(123);
      expect(cleanExtractedJson(null)).toBeNull();
      expect(cleanExtractedJson(undefined)).toBeUndefined();
    });

    it('should handle empty objects', () => {
      const result = cleanExtractedJson({});
      expect(result).toEqual({});
    });

    it('should handle objects with empty string keys', () => {
      const json = {
        '': 'empty key',
        'valid': 'valid key',
      };
      const result = cleanExtractedJson(json);

      expect(result).toEqual({
        'valid': 'valid key',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large HTML content', () => {
      const largeHtml = '<div>' + 'A'.repeat(10000) + '</div>';
      const result = htmlToMarkdown(largeHtml);
      expect(result).toContain('A'.repeat(10000));
    });

    it('should handle HTML with special characters', () => {
      const html = '<p>Special chars: &lt;&gt;&amp;&quot;&#39;</p>';
      const result = htmlToText(html);
      expect(result).toContain('Special chars: <>&"\'');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<div><p>Unclosed tag</div>';
      const result = htmlToMarkdown(malformedHtml);
      expect(result).toContain('Unclosed tag');
    });

    it('should handle JSON with special characters', () => {
      const json = {
        subject: 'Test with "quotes" and \'apostrophes\'',
        body: 'Line 1\nLine 2',
      };
      const content = JSON.stringify(json) + '\nSome content';
      const result = extractJsonFromMixedContent(content);

      expect(result).not.toBeNull();
      expect(result?.json).toEqual(json);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large HTML content efficiently', () => {
      const largeHtml = '<div>' + 'A'.repeat(100000) + '</div>';
      const startTime = Date.now();
      const result = htmlToMarkdown(largeHtml);
      const endTime = Date.now();

      expect(result).toContain('A'.repeat(100000));
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large JSON content efficiently', () => {
      const largeJson = {
        data: 'A'.repeat(100000),
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `Item ${i}` })),
      };
      const content = JSON.stringify(largeJson) + '\nSome other content';

      const startTime = Date.now();
      const result = extractJsonFromMixedContent(content);
      const endTime = Date.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
