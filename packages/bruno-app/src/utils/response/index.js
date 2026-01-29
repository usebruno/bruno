// Normalize & extract MIME type from full header
const extractMimeType = (contentType = '') => {
  const cleaned = String(contentType).trim().toLowerCase();
  const match = cleaned.match(/^[^;]+/); // strip "; charset=utf-8"
  return match ? match[0] : cleaned;
};

export const getDefaultResponseFormat = (contentType) => {
  const mime = extractMimeType(contentType);

  const rules = [
    // ====== HTML ======
    { test: /^text\/html$/, result: { format: 'html', tab: 'preview' } },

    // ====== JSON (including custom +json types) ======
    {
      test: /^application\/(json|.+\+json)$/,
      result: { format: 'json', tab: 'editor' }
    },
    {
      test: /^text\/(json|.+\+json)$/,
      result: { format: 'json', tab: 'editor' }
    },

    // ====== XML (including custom +xml types) ======
    {
      test: /^application\/(xml|.+\+xml)$/,
      result: { format: 'xml', tab: 'editor' }
    },
    {
      test: /^text\/(xml|.+\+xml)$/,
      result: { format: 'xml', tab: 'editor' }
    },

    // ====== JavaScript ======
    {
      test: /^(application|text)\/javascript$/,
      result: { format: 'javascript', tab: 'editor' }
    },

    // ====== Images, audio, video, PDFs → preview (base64) ======
    { test: /^image\//, result: { format: 'base64', tab: 'preview' } },
    { test: /^audio\//, result: { format: 'base64', tab: 'preview' } },
    { test: /^video\//, result: { format: 'base64', tab: 'preview' } },
    { test: /^application\/pdf$/, result: { format: 'base64', tab: 'preview' } },

    // ====== Any other text types ======
    { test: /^text\//, result: { format: 'raw', tab: 'editor' } }
  ];

  for (const rule of rules) {
    if (rule.test.test(mime)) {
      return rule.result;
    }
  }

  // ====== Fallback ======
  return { format: 'raw', tab: 'editor' };
};

// Safe HTML escaping for webview content
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Helper to detect if buffer contains text data
 */
const isLikelyText = (buffer) => {
  if (!buffer || buffer.length === 0) return false;
  let textChars = 0;
  const sampleSize = Math.min(buffer.length, 512);

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    // Check for common text characters (printable ASCII + common control chars)
    if ((byte >= 0x20 && byte <= 0x7E) // Printable ASCII
      || byte === 0x09 // Tab
      || byte === 0x0A // Line feed
      || byte === 0x0D) { // Carriage return
      textChars++;
    }
  }

  // If more than 85% are text characters, likely text
  return (textChars / sampleSize) > 0.85;
};

/**
 * Helper to detect SVG content from text buffer
 * SVG files may start with XML declaration, comments, or whitespace before the <svg tag
 * @param {Buffer} buffer - The data buffer to analyze
 * @returns {boolean} - true if buffer contains SVG content
 */
const isSvgContent = (buffer) => {
  const length = buffer.length;
  if (length < 4 || buffer[0] !== 0x3C) return false;

  // Fast path: <svg
  if (buffer[1] === 0x73 && buffer[2] === 0x76 && buffer[3] === 0x67) {
    return true;
  }

  // Slow path: <?xml or <!DOCTYPE or <!--
  if (buffer[1] !== 0x3F && buffer[1] !== 0x21) return false;

  // Search for <svg in first 512 bytes
  const limit = Math.min(512, length - 3);
  for (let i = 2; i < limit; i++) {
    if (buffer[i] === 0x3C && buffer[i + 1] === 0x73
      && buffer[i + 2] === 0x76 && buffer[i + 3] === 0x67) {
      return true;
    }
  }

  return false;
};

/**
 * Decode only the first N bytes from a Base64 string
 * Returns an empty buffer for invalid/missing input
 */
const decodeBase64Head = (base64, byteCount) => {
  // Validate input is a non-empty string
  if (!base64 || typeof base64 !== 'string') {
    return Buffer.alloc(0);
  }

  try {
    // Safely remove data URL prefix (e.g., "data:image/png;base64,")
    const prefixMatch = base64.match(/^data:[^;]*;base64,/);
    const cleanedBase64 = prefixMatch ? base64.slice(prefixMatch[0].length) : base64;

    // Return empty buffer if nothing left after stripping prefix
    if (!cleanedBase64) {
      return Buffer.alloc(0);
    }

    // How many base64 chars needed to reconstruct "byteCount" bytes
    const neededChars = Math.ceil(byteCount / 3) * 4;

    // Slice only required chars
    let slice = cleanedBase64.slice(0, neededChars);

    // Sanitize: remove any non-base64 characters (whitespace, invalid chars)
    slice = slice.replace(/[^A-Za-z0-9+/=]/g, '');

    // Pad to valid base64 length (must be multiple of 4)
    const padLength = (4 - (slice.length % 4)) % 4;
    slice = slice + '='.repeat(padLength);

    // Decode and trim to requested bytes
    return Buffer.from(slice, 'base64').subarray(0, byteCount);
  } catch (error) {
    // On any decoding error, return an empty buffer
    return Buffer.alloc(0);
  }
};

/**
* Detects content type from buffer by checking magic numbers (file signatures)
* @param {Buffer} buffer - The data buffer to analyze
* @returns {string|null} - Detected MIME type or null
*/
export const detectContentTypeFromBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // Get first few bytes for magic number checking
  const bytes = buffer.subarray(0, 12);

  // Image formats
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    && bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) {
    return 'image/avif';
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return 'image/bmp';
  }
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2A && bytes[3] === 0x00)
    || (bytes[0] === 0x4D && bytes[1] === 0x4D && bytes[2] === 0x00 && bytes[3] === 0x2A)) {
    return 'image/tiff';
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return 'image/x-icon';
  }
  if (bytes[0] === 0x3C && bytes[1] === 0x73 && bytes[2] === 0x76 && bytes[3] === 0x67 && bytes[4] === 0x20) {
    return 'image/svg+xml';
  }
  // PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  // Video formats
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00
    && (bytes[3] === 0x18 || bytes[3] === 0x20)
    && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return 'video/mp4';
  }
  if ((bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3)) {
    return 'video/webm';
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) {
    return 'video/x-msvideo'; // AVI
  }

  // Audio formats
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
    return 'audio/mpeg'; // MP3
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
    return 'audio/wav';
  }
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'audio/ogg';
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    && bytes[8] === 0x4D && bytes[9] === 0x34 && bytes[10] === 0x41) {
    return 'audio/m4a';
  }

  // Archive formats
  if (bytes[0] === 0x50 && bytes[1] === 0x4B
    && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)) {
    return 'application/zip';
  }
  if (bytes[0] === 0x1F && bytes[1] === 0x8B) {
    return 'application/gzip';
  }

  return null;
};

/**
 * Main: detect from base64 string
 */
export const detectContentTypeFromBase64 = (base64) => {
  if (!base64) return null;

  // 1. Decode first 12 bytes (magic numbers)
  const magicHead = decodeBase64Head(base64, 12);

  const magicType = detectContentTypeFromBuffer(magicHead);
  if (magicType) return magicType;

  // 2. If not binary → decode up to 512 bytes for text detection
  const textHead = decodeBase64Head(base64, 512);

  if (isSvgContent(textHead)) {
    return 'image/svg+xml';
  }

  if (isLikelyText(textHead)) return 'text/plain';

  return null;
};
