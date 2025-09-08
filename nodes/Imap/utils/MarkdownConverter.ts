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

/**
 * Convert HTML to plain text
 * Used for generating text content from HTML when no plain text is available
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  // Remove script and style elements completely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert HTML elements to plain text
  text = text
    // Convert line breaks
    .replace(/<br[^>]*>/gi, '\n')
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n')
    // Convert headers
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    // Convert divs
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '\n$1\n')
    // Convert lists
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '\n$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '\n$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    // Convert blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
    // Convert links to plain text with URL (handle long URLs)
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (match, url, text) => {
      try {
        const decodedUrl = decodeURIComponent(url);
        if (url.includes('%') && url.length > 200) {
          return text; // Just show the text for URLs with excessive byte code
        }
        if (decodedUrl.length > 500) {
          return text; // Just show the text for very long URLs
        }
        return `${text} (${url})`;
      } catch (e) {
        return text; // If decoding fails, just show the text
      }
    })
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Handle plain URLs in text (not in HTML links)
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
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .replace(/\n /g, '\n') // Remove leading spaces from lines
    .replace(/ \n/g, '\n'); // Remove trailing spaces from lines

  return text.trim();
}
