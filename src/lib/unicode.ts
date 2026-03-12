/**
 * LinkedIn Unicode Formatter
 * Converts markdown bold/italic to Unicode characters that actually render on LinkedIn.
 * LinkedIn strips HTML and markdown — Unicode math symbols are the only way to get bold/italic.
 */

// Unicode Mathematical Sans-Serif Bold (U+1D5D4 - U+1D607)
const BOLD_UPPER: Record<string, string> = {};
const BOLD_LOWER: Record<string, string> = {};
const BOLD_DIGITS: Record<string, string> = {};

// Unicode Mathematical Sans-Serif Italic (U+1D608 - U+1D63B)
const ITALIC_UPPER: Record<string, string> = {};
const ITALIC_LOWER: Record<string, string> = {};

// Build bold mappings: A-Z → 𝗔-𝗭, a-z → 𝗮-𝘇, 0-9 → 𝟬-𝟵
for (let i = 0; i < 26; i++) {
    BOLD_UPPER[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1D5D4 + i);
    BOLD_LOWER[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1D5EE + i);
}
for (let i = 0; i < 10; i++) {
    BOLD_DIGITS[String.fromCharCode(48 + i)] = String.fromCodePoint(0x1D7EC + i);
}

// Build italic mappings: A-Z → 𝘈-𝘡, a-z → 𝘢-𝘻
for (let i = 0; i < 26; i++) {
    ITALIC_UPPER[String.fromCharCode(65 + i)] = String.fromCodePoint(0x1D608 + i);
    ITALIC_LOWER[String.fromCharCode(97 + i)] = String.fromCodePoint(0x1D622 + i);
}

function toBold(text: string): string {
    return [...text].map(c => BOLD_UPPER[c] ?? BOLD_LOWER[c] ?? BOLD_DIGITS[c] ?? c).join("");
}

function toItalic(text: string): string {
    return [...text].map(c => ITALIC_UPPER[c] ?? ITALIC_LOWER[c] ?? c).join("");
}

/**
 * Convert markdown-style formatting to LinkedIn-compatible Unicode.
 * **bold** → 𝗯𝗼𝗹𝗱
 * *italic* → 𝘪𝘵𝘢𝘭𝘪𝘤
 */
export function formatForLinkedIn(text: string): string {
    let result = text;

    // Replace **bold** (double asterisks) with Unicode bold
    result = result.replace(/\*\*(.+?)\*\*/g, (_match, content) => toBold(content));

    // Replace remaining *italic* (single asterisks) with Unicode italic
    result = result.replace(/\*(.+?)\*/g, (_match, content) => toItalic(content));

    // Clean up any extra whitespace lines (max 2 consecutive newlines)
    result = result.replace(/\n{3,}/g, "\n\n");

    return result;
}

/**
 * Preview: convert a short string to bold for display purposes.
 */
export function unicodeBold(text: string): string {
    return toBold(text);
}

export function unicodeItalic(text: string): string {
    return toItalic(text);
}
