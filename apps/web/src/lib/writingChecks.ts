/**
 * Plain, explainable writing checks that run in the browser with no model:
 * repeated words, a/an, spacing, very long sentences, and weak intensifiers.
 * They sit beside the AI-likelihood score and the spelling variant check in the
 * review panel, so a writer sees every kind of issue in one place.
 */

export type CheckKind = "grammar" | "clarity";

export interface WritingIssue {
  id: string;
  kind: CheckKind;
  message: string;
  /** The text the issue is about. */
  excerpt: string;
  /** A replacement for the whole sentence when the fix is mechanical. */
  fixedText?: string;
}

const VOWEL_SOUND_EXCEPTIONS_A = /^(uni([^nmd]|$)|use|usu|eu|one|once|ubiq|uri|util)/i;
const SILENT_H = /^(hour|honest|honou?r|heir)/i;
const AN_ACRONYMS = /^(MBA|MRI|FAQ|SQL|HTML|LLM|NLP|URL|HR|FBI|SME|RSVP|X-?ray)$/;

function article(word: string): "a" | "an" {
  const clean = word.replace(/[^A-Za-z-]/g, "");
  if (AN_ACRONYMS.test(clean)) return "an";
  if (/^[A-Z]{2,}$/.test(clean)) return /^[AEFHILMNORSX]/.test(clean) ? "an" : "a";
  if (SILENT_H.test(clean)) return "an";
  if (VOWEL_SOUND_EXCEPTIONS_A.test(clean)) return "a";
  return /^[aeiou]/i.test(clean) ? "an" : "a";
}

const INTENSIFIERS = /\b(very|really|quite|extremely|basically|actually|literally|just)\b/gi;
const WORDS_PER_SENTENCE_LIMIT = 40;

export function checkSentence(text: string): WritingIssue[] {
  const issues: WritingIssue[] = [];
  const words = text.split(/\s+/).filter(Boolean);

  // Repeated word: "the the"
  const rep = text.match(/\b([A-Za-z']{2,})\s+\1\b/i);
  if (rep && !/^(had|that)$/i.test(rep[1])) {
    issues.push({
      id: "repeat",
      kind: "grammar",
      message: `"${rep[1]}" appears twice in a row.`,
      excerpt: rep[0],
      fixedText: text.replace(new RegExp(`\\b(${rep[1]})\\s+\\1\\b`, "i"), "$1"),
    });
  }

  // a / an
  const an = [...text.matchAll(/\b(a|an)\s+([A-Za-z][A-Za-z-]*)/gi)];
  for (const m of an) {
    const want = article(m[2]);
    if (m[1].toLowerCase() !== want) {
      const fixed = text.replace(m[0], `${m[1][0] === "A" ? (want === "a" ? "A" : "An") : want} ${m[2]}`);
      issues.push({
        id: `article-${m.index}`,
        kind: "grammar",
        message: `Use "${want}" before "${m[2]}".`,
        excerpt: m[0],
        fixedText: fixed,
      });
      break;
    }
  }

  // Double spaces inside the sentence
  if (/\S {2,}\S/.test(text)) {
    issues.push({
      id: "spacing",
      kind: "grammar",
      message: "There is more than one space between words.",
      excerpt: "double space",
      fixedText: text.replace(/(\S) {2,}(?=\S)/g, "$1 "),
    });
  }

  // Space before punctuation
  if (/\s[,;:.!?](?!\.)/.test(text)) {
    issues.push({
      id: "punct-space",
      kind: "grammar",
      message: "Remove the space before the punctuation mark.",
      excerpt: text.match(/\S?\s[,;:.!?]/)?.[0] || "",
      fixedText: text.replace(/\s+([,;:.!?])(?!\.)/g, "$1"),
    });
  }

  // Missing capital at the start
  if (/^[a-z]/.test(text.trim()) && words.length > 3) {
    issues.push({
      id: "capital",
      kind: "grammar",
      message: "A sentence should start with a capital letter.",
      excerpt: words[0],
      fixedText: text.replace(/^(\s*)([a-z])/, (_m, sp, c) => sp + c.toUpperCase()),
    });
  }

  // Very long sentence
  if (words.length > WORDS_PER_SENTENCE_LIMIT) {
    issues.push({
      id: "long",
      kind: "clarity",
      message: `This sentence has ${words.length} words. Splitting it usually makes it easier to follow.`,
      excerpt: `${words.slice(0, 6).join(" ")}…`,
    });
  }

  // Weak intensifiers
  const weak = [...text.matchAll(INTENSIFIERS)].map((m) => m[0].toLowerCase());
  if (weak.length >= 2) {
    issues.push({
      id: "weak",
      kind: "clarity",
      message: `Several filler words (${[...new Set(weak)].join(", ")}). Cutting them often sharpens the point.`,
      excerpt: [...new Set(weak)].join(", "),
    });
  }

  return issues;
}
