/**
 * Equations travel through the editor as tokens such as ⟦EQ:7⟧ inside sentence
 * text. The token is what gets scored, rewritten around and exported; the
 * equation itself is kept beside the document and drawn with KaTeX.
 */

export interface EquationAtom {
  /** LaTeX used to draw the equation in the editor. */
  latex: string;
  /** True for an equation that sits on its own line. */
  display: boolean;
  /** The original Word (OMML) markup, restored on export. */
  omml: string;
}

export type EquationMap = Record<string, EquationAtom>;

const TOKEN_SOURCE = "⟦EQ:([A-Za-z0-9_-]+)⟧";

export const equationToken = (id: string) => `⟦EQ:${id}⟧`;
export const hasEquation = (text: string) => text.includes("⟦EQ:");

/** Ids of the equations mentioned in `text`, in order. */
export function tokensOf(text: string): string[] {
  return [...text.matchAll(new RegExp(TOKEN_SOURCE, "g"))].map((m) => m[1]);
}

/** True when every equation in `before` still appears in `after`. */
export function keepsEquations(before: string, after: string): boolean {
  const need = tokensOf(before);
  if (need.length === 0) return true;
  const have = tokensOf(after);
  return need.every((id) => have.includes(id));
}

/** Text with each equation token replaced by a short stand-in, for word counts and scoring. */
export function withoutEquations(text: string): string {
  return text.replace(new RegExp(TOKEN_SOURCE, "g"), "");
}

export const TOKEN_REGEX = () => new RegExp(TOKEN_SOURCE, "g");
