import { db } from "../db/store";
import { DbDocument, DbSentence, DbUser } from "../db/schema";

/** The built-in sample paper is public to read; nothing else is. */
export const SAMPLE_DOCUMENT_ID = "doc_84719a";

/** A document, but only if it belongs to this user. Anything else looks like "not found". */
export async function ownDocument(user: DbUser, documentId: string): Promise<DbDocument | null> {
  const doc = await db.findDocumentById(documentId);
  if (!doc || doc.ownerId !== user.id) return null;
  return doc;
}

/** A sentence, but only if its document belongs to this user (or it is part of the public sample). */
export async function ownSentence(user: DbUser, sentenceId: string): Promise<DbSentence | null> {
  const sentence = await db.findSentenceById(sentenceId);
  if (!sentence) return null;
  if (sentence.documentId === SAMPLE_DOCUMENT_ID) return sentence;
  return (await ownDocument(user, sentence.documentId)) ? sentence : null;
}
