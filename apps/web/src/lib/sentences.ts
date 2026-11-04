/**
 * One definition of "a sentence", shared by the uploader and the editor, so a
 * paragraph splits the same way whether it was imported or typed.
 */
const DOT = "___EDUX_DOT___";

export function splitSentenceTexts(text: string): string[] {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];

  // A short title or heading stays one sentence instead of being split on a full stop.
  if (trimmed.length < 80 && !trimmed.includes(". ")) return [trimmed];

  const protectedText = trimmed
    // Numbered headings like "1. " and "2.1. "
    .replace(/(^|\s)(\d+)\.(\s+)/g, "$1$2" + DOT + "$3")
    .replace(/(^|\s)(\d+\.\d+)\.(\s+)/g, "$1$2" + DOT + "$3")
    // Decimals like 0.05
    .replace(/(\d+)\.(\d+)/g, "$1" + DOT + "$2")
    // Common abbreviations
    .replace(/\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr)\./gi, "$1" + DOT)
    .replace(/\b(et al|i\.e|e\.g|vs|cf|vol|pp|p|ed|eds)\./gi, (m) => m.replace(/\./g, DOT));

  const parts = protectedText
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'⟦])/)
    .map((s) => s.replace(new RegExp(DOT, "g"), ".").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : [trimmed];
}
