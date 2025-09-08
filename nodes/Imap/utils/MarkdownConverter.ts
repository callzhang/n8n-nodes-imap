import { NodeHtmlMarkdown } from 'node-html-markdown';

/**
 * Convert HTML to clean markdown for DingTalk
 * Simple approach: let node-html-markdown do the conversion, then clean up
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  // Let node-html-markdown do the heavy lifting
  const nhm = new NodeHtmlMarkdown({
    ignore: ['script', 'style', 'meta', 'link', 'head'],
    maxConsecutiveNewlines: 2,
  });

  let markdown = nhm.translate(html);

  // Simple cleanup for DingTalk - remove non-text elements
  markdown = markdown
    // Remove all images (DingTalk doesn't need them)
    .replace(/!\[.*?\]\([^)]*\)/g, '[Image]')
    .replace(/\[Image removed - base64 data\]/g, '[Image]')
    .replace(/\[Large image data removed\]/g, '[Image]')

    // Remove excessive separators
    .replace(/-{10,}/g, '---')
    .replace(/\|{10,}/g, '|')

    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')

    // Remove empty lines with just spaces
    .replace(/^\s+$/gm, '')

    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')

    // Clean up blockquotes
    .replace(/^>\s*$/gm, '')
    .replace(/^>\s*\n/gm, '')

    // Simplify long URLs - handle byte code and excessive length
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      try {
        // Decode URL to check actual length
        const decodedUrl = decodeURIComponent(url);

        // If URL contains excessive byte code or is very long, simplify
        if (url.includes('%') && url.length > 200) {
          return text; // Just show the text, not the URL
        }

        if (decodedUrl.length > 500) {
          return text; // Just show the text for very long URLs
        }

        if (text === url || text.length > 30) {
          return text;
        }
        return match;
      } catch (e) {
        // If decoding fails, just show the text
        return text;
      }
    })

    // Handle plain URLs in text (not in markdown links)
    .replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
      try {
        const decodedUrl = decodeURIComponent(url);
        if (url.includes('%') && url.length > 200) {
          return '[Long URL]';
        }
        if (decodedUrl.length > 500) {
          return '[Long URL]';
        }
        return match;
      } catch (e) {
        return '[Long URL]';
      }
    })

    // Remove excessive markdown formatting
    .replace(/\*\*\*\*/g, '**')
    .replace(/____/g, '__')

    // Clean up common email formatting issues
    .replace(/Best，/g, 'Best,')
    .replace(/best，/g, 'best,')

    // Final cleanup
    .trim();

  return markdown;
}

/**
 * Clean HTML by removing unreadable tags and attributes
 * Optimized for email content processing
 */
export function cleanHtml(html: string): string {
  if (!html) return '';

  // Remove script and style tags completely
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Remove base64 images (very large content)
  cleaned = cleaned.replace(/<img[^>]*src\s*=\s*["']data:image\/[^"']*["'][^>]*>/gi, '<img src="[Image removed - base64 data]">');

  // Remove large base64 data URLs
  cleaned = cleaned.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/gi, '[Large image data removed]');

  // Clean up URLs with excessive byte code/URL encoding
  cleaned = cleaned.replace(/href\s*=\s*["']([^"']*%[0-9A-Fa-f]{2}[^"']{200,})["']/gi, (match, url) => {
    try {
      // Try to decode the URL to see if it's reasonable
      const decoded = decodeURIComponent(url);
      if (decoded.length > 500) {
        // If decoded URL is still very long, truncate it
        const truncated = decoded.substring(0, 200) + '...[truncated]';
        return `href="${truncated}"`;
      }
      return match;
    } catch (e) {
      // If decoding fails, truncate the original URL
      const truncated = url.substring(0, 200) + '...[truncated]';
      return `href="${truncated}"`;
    }
  });

  // Clean up src attributes with excessive byte code
  cleaned = cleaned.replace(/src\s*=\s*["']([^"']*%[0-9A-Fa-f]{2}[^"']{200,})["']/gi, (match, url) => {
    try {
      const decoded = decodeURIComponent(url);
      if (decoded.length > 500) {
        const truncated = decoded.substring(0, 200) + '...[truncated]';
        return `src="${truncated}"`;
      }
      return match;
    } catch (e) {
      const truncated = url.substring(0, 200) + '...[truncated]';
      return `src="${truncated}"`;
    }
  });

  // Remove all style attributes
  cleaned = cleaned.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

  // Remove class attributes
  cleaned = cleaned.replace(/\s*class\s*=\s*["'][^"']*["']/gi, '');

  // Remove id attributes
  cleaned = cleaned.replace(/\s*id\s*=\s*["'][^"']*["']/gi, '');

  // Remove other common attributes that don't affect readability
  cleaned = cleaned.replace(/\s*(width|height|border|cellpadding|cellspacing|align|valign)\s*=\s*["'][^"']*["']/gi, '');

  // Convert common tags to simpler equivalents
  cleaned = cleaned.replace(/<div[^>]*>/gi, '<p>');
  cleaned = cleaned.replace(/<\/div>/gi, '</p>');
  cleaned = cleaned.replace(/<span[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/span>/gi, '');

  // Convert line breaks
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<br\s*>/gi, '\n');

  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<p[^>]*>&nbsp;<\/p>/gi, '');

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');

  return cleaned.trim();
}
