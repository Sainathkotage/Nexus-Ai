/**
 * Prompt Injection Protection Utility
 * Scans user inputs for standard prompt injection patterns.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /ignore\s+(?:all\s+)?prior\s+instructions/i,
  /ignore\s+(?:all\s+)?instructions\s+above/i,
  /system\s+prompt/i,
  /system\s+instruction/i,
  /forget\s+(?:the\s+)?instructions/i,
  /forget\s+(?:the\s+)?rules/i,
  /override\s+(?:the\s+)?instructions/i,
  /override\s+(?:the\s+)?rules/i,
  /you\s+are\s+now\s+a/i,
  /act\s+as\s+a\s+new/i,
  /new\s+role/i,
  /bypass\s+(?:the\s+)?safeguards/i,
  /disregard\s+(?:all\s+)?prior/i,
  /do\s+not\s+warn\s+the\s+user/i,
  /output\s+the\s+system/i,
  /print\s+the\s+instructions/i,
  /reveal\s+(?:your\s+)?prompt/i
];

/**
 * Returns true if prompt injection signature is detected.
 */
export function detectPromptInjection(text: string): boolean {
  if (!text) return false;
  
  // Normalize string spacing and lowercase it
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      console.warn(`[Security Alert] Prompt injection pattern matched: ${pattern} in input: "${text.substring(0, 100)}..."`);
      return true;
    }
  }
  
  return false;
}
