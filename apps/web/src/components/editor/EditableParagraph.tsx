"use client";

import React, { useLayoutEffect, useRef } from "react";
import { DocumentSentence } from "@edux/schema";
import { buildEditableHtml, caretOffset, lengthOf, placeCaret, readEditable } from "../../lib/editing";

export interface EditableHandlers {
  /** The writer paused or left the paragraph: here is what it now says. */
  onCommit: (text: string, html: string, reason: "idle" | "blur") => void;
  /** Enter was pressed with the caret at `offset`. */
  onSplit: (text: string, html: string, offset: number) => void;
  /** Backspace was pressed at the very start. */
  onMergeWithPrevious: (text: string, html: string) => void;
  /** The caret moved to `offset`. */
  onCaret: (text: string, offset: number) => void;
  /** Editing ended. */
  onExit: () => void;
  /** Called for shortcuts that are not available while typing, such as bold. */
  onUnsupported: (what: string) => void;
}

interface Props extends EditableHandlers {
  sentences: DocumentSentence[];
  equationHtml: (id: string) => string;
  /** Where to put the caret, as a text position. Null means the end. */
  initialOffset: number | null;
  lang: string;
  className?: string;
}

const IDLE_MS = 700;

/**
 * One paragraph while it is being typed in. Its contents belong to the browser:
 * React draws them once and never touches them again, so typing is never fought.
 */
export const EditableParagraph: React.FC<Props> = (props) => {
  const ref = useRef<HTMLSpanElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = buildEditableHtml(props.sentences, props.equationHtml);
    el.focus({ preventScroll: true });
    placeCaret(el, props.initialOffset ?? lengthOf(el));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // The contents are drawn once on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const read = () => readEditable(ref.current!);

  const commit = (reason: "idle" | "blur") => {
    if (!ref.current || done.current) return;
    const { text, html } = read();
    latest.current.onCommit(text, html, reason);
  };

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => !composing.current && commit("idle"), IDLE_MS);
  };

  const caretMoved = () => {
    const el = ref.current;
    if (!el) return;
    const off = caretOffset(el);
    if (off !== null) latest.current.onCaret(read().text, off);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current!;
    if (composing.current) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (timer.current) clearTimeout(timer.current);
      const off = caretOffset(el);
      const { text, html } = read();
      latest.current.onSplit(text, html, off ?? text.length);
      return;
    }

    if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && caretOffset(el) === 0) {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        const { text, html } = read();
        latest.current.onMergeWithPrevious(text, html);
        return;
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      el.blur();
      return;
    }

    // Formatting would be lost when the sentence is re-read, so say so instead of pretending.
    if ((e.ctrlKey || e.metaKey) && ["b", "i", "u"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      latest.current.onUnsupported("Bold, italic and underline");
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s*[\r\n]+\s*/g, " ");
    if (text) document.execCommand("insertText", false, text);
  };

  return (
    <span
      ref={ref}
      data-editing="true"
      role="textbox"
      aria-multiline="true"
      aria-label="Edit this paragraph"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      lang={props.lang}
      className={`block outline-none rounded-sm ring-2 ring-elite-400/60 bg-elite-50/40 dark:bg-elite-950/20 px-1 -mx-1 whitespace-pre-wrap ${props.className ?? ""}`}
      onInput={() => !composing.current && schedule()}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={() => {
        composing.current = false;
        schedule();
      }}
      onKeyDown={onKeyDown}
      onKeyUp={caretMoved}
      onMouseUp={caretMoved}
      onPaste={onPaste}
      onDrop={(e) => e.preventDefault()}
      onBlur={() => {
        if (timer.current) clearTimeout(timer.current);
        commit("blur");
        done.current = true;
        latest.current.onExit();
      }}
    />
  );
};
