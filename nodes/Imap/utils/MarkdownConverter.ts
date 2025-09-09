import { NodeHtmlMarkdown } from 'node-html-markdown';
// Note: You would need to install: npm install extract-json-from-string
// import extractJson from 'extract-json-from-string';

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

/**
 * Extract JSON from mixed content that may contain markdown code blocks
 * Handles cases where content starts with ```json but contains mixed data
 */
export function extractJsonFromMixedContent(content: string): { json: any; remainingContent: string } | null {
  if (!content) return null;

  try {
    // First, try to parse the entire content as JSON
    const parsed = JSON.parse(content);
    return { json: parsed, remainingContent: '' };
  } catch (e) {
    // If direct parsing fails, try to extract JSON from markdown code blocks
    const jsonBlockMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      try {
        const jsonContent = jsonBlockMatch[1].trim();
        const parsed = JSON.parse(jsonContent);
        const remainingContent = content.replace(jsonBlockMatch[0], '').trim();
        return { json: parsed, remainingContent };
      } catch (e) {
        // JSON block exists but is malformed
        return null;
      }
    }

    // Try to find JSON at the beginning of the content
    const lines = content.split('\n');
    let jsonLines: string[] = [];
    let jsonEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines at the beginning
      if (jsonLines.length === 0 && !line) continue;

      // If we find a line that looks like it could be JSON
      if (line.startsWith('{') || line.startsWith('[') || jsonLines.length > 0) {
        jsonLines.push(line);

        // Try to parse what we have so far
        try {
          const jsonString = jsonLines.join('\n');
          JSON.parse(jsonString);
          jsonEndIndex = i;
          break;
        } catch (e) {
          // Continue collecting lines
        }
      } else if (jsonLines.length > 0) {
        // We were collecting JSON but hit a non-JSON line
        break;
      }
    }

    if (jsonEndIndex >= 0) {
      try {
        const jsonString = jsonLines.join('\n');
        const parsed = JSON.parse(jsonString);
        const remainingContent = lines.slice(jsonEndIndex + 1).join('\n').trim();
        return { json: parsed, remainingContent };
      } catch (e) {
        // JSON extraction failed
        return null;
      }
    }

    return null;
  }
}

/**
 * Clean and validate extracted JSON data
 * Removes excessive whitespace and validates structure
 */
export function cleanExtractedJson(jsonData: any): any {
  if (!jsonData || typeof jsonData !== 'object') {
    return jsonData;
  }

  // Recursively clean the JSON object
  const cleanObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    } else if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Clean the key
        const cleanKey = key.trim();
        if (cleanKey) {
          cleaned[cleanKey] = cleanObject(value);
        }
      }
      return cleaned;
    } else if (typeof obj === 'string') {
      // Clean string values - remove excessive whitespace
      return obj.replace(/\s+/g, ' ').trim();
    }
    return obj;
  };

  return cleanObject(jsonData);
}

/**
 * Alternative implementation using extract-json-from-string package
 * Uncomment the import at the top and use this function instead of extractJsonFromMixedContent
 */
export function extractJsonWithPackage(content: string): { json: any; remainingContent: string } | null {
  // Uncomment when package is installed:
  // try {
  //   const extracted = extractJson(content);
  //   if (extracted && typeof extracted === 'object') {
  //     // Find where the JSON ends in the original content
  //     const jsonString = JSON.stringify(extracted);
  //     const jsonIndex = content.indexOf(jsonString);
  //     const remainingContent = jsonIndex >= 0
  //       ? content.substring(jsonIndex + jsonString.length).trim()
  //       : content.replace(jsonString, '').trim();
  //
  //     return { json: extracted, remainingContent };
  //   }
  //   return null;
  // } catch (e) {
  //   return null;
  // }

  // Fallback to our custom implementation
  return extractJsonFromMixedContent(content);
}
