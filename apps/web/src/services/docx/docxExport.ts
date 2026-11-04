import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  InsertedTextRun,
  DeletedTextRun,
  ImageRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { DocumentParagraphNode, DocumentSentence } from "@edux/schema";

export interface DocxExportOptions {
  exportMode?: "clean" | "tracked";
  fontFamily?: string;
  fontSizePt?: number;
  author?: string;
}

export interface ExportSummary {
  headings: number;
  paragraphs: number;
  listItems: number;
  tables: number;
  imagesIncluded: number;
  imagesSkipped: number;
  editedSentences: number;
}

const DATA_URI = /^data:image\/(png|jpe?g|gif|bmp);base64,/i;

/** Counts what an export will contain, so the dialog can say so before download. */
export function summariseExport(paragraphs: DocumentParagraphNode[]): ExportSummary {
  const out: ExportSummary = {
    headings: 0,
    paragraphs: 0,
    listItems: 0,
    tables: 0,
    imagesIncluded: 0,
    imagesSkipped: 0,
    editedSentences: 0,
  };
  for (const p of paragraphs) {
    if (p.isEmptyLine) continue;
    if (p.type === "heading") out.headings += 1;
    else if (p.type === "table") out.tables += 1;
    else if (p.type === "list_item") out.listItems += 1;
    else if (p.type === "image") {
      if (p.imageUrl && DATA_URI.test(p.imageUrl)) out.imagesIncluded += 1;
      else out.imagesSkipped += 1;
    } else out.paragraphs += 1;
    out.editedSentences += p.sentences.filter((s) => s.edited).length;
  }
  return out;
}

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
}

/** Reads <strong>, <em> and <u> from a sentence's saved HTML so formatting survives export. */
function styledSegments(sentence: DocumentSentence): { text: string; style: RunStyle }[] {
  if (!sentence.formattedHtml || typeof DOMParser === "undefined") {
    return [{ text: sentence.text, style: {} }];
  }
  const dom = new DOMParser().parseFromString(`<div>${sentence.formattedHtml}</div>`, "text/html");
  const segments: { text: string; style: RunStyle }[] = [];

  const walk = (node: Node, style: RunStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) segments.push({ text, style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (node as Element).tagName.toLowerCase();
    const next: RunStyle = { ...style };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italics = true;
    if (tag === "u") next.underline = true;
    node.childNodes.forEach((child) => walk(child, next));
  };

  dom.body.firstElementChild?.childNodes.forEach((child) => walk(child, {}));
  const joined = segments.map((s) => s.text).join("");
  // If the saved HTML no longer matches the text, trust the text.
  return joined.trim() === sentence.text.trim() ? segments : [{ text: sentence.text, style: {} }];
}

function imageSize(dataUri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 480, height: img.naturalHeight || 320 });
    img.onerror = () => resolve({ width: 480, height: 320 });
    img.src = dataUri;
  });
}

function alignmentFor(p: DocumentParagraphNode, fallback: (typeof AlignmentType)[keyof typeof AlignmentType]) {
  switch (p.alignment) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.BOTH;
    case "left":
      return AlignmentType.LEFT;
    default:
      return fallback;
  }
}

/**
 * Builds a Word (.docx) file from the document as it stands in the editor.
 * Tracked mode records each rewritten sentence as a real Word revision
 * (deleted original plus inserted rewrite) so the author can accept or reject it.
 */
export async function exportDocumentToDocx(
  title: string,
  paragraphs: DocumentParagraphNode[],
  options: DocxExportOptions = {}
): Promise<Blob> {
  const { exportMode = "clean", fontFamily = "Times New Roman", author = "eduX" } = options;
  const when = new Date().toISOString();
  let revisionId = 1;

  const docChildren: (Paragraph | Table)[] = [];

  const sentenceRuns = (p: DocumentParagraphNode, size: number, extra: RunStyle = {}) => {
    const runs: (TextRun | InsertedTextRun | DeletedTextRun)[] = [];
    p.sentences.forEach((s, idx) => {
      const gap = idx < p.sentences.length - 1 ? " " : "";
      if (exportMode === "tracked" && s.edited && s.originalText && s.originalText !== s.text) {
        runs.push(
          new DeletedTextRun({ text: s.originalText, id: revisionId++, author, date: when, font: fontFamily, size })
        );
        runs.push(
          new InsertedTextRun({ text: s.text + gap, id: revisionId++, author, date: when, font: fontFamily, size })
        );
        return;
      }
      const segments = styledSegments(s);
      segments.forEach((seg, i) => {
        runs.push(
          new TextRun({
            text: seg.text + (i === segments.length - 1 ? gap : ""),
            font: fontFamily,
            size,
            bold: extra.bold || seg.style.bold,
            italics: extra.italics || seg.style.italics,
            underline: seg.style.underline ? {} : undefined,
          })
        );
      });
    });
    return runs;
  };

  for (const p of paragraphs) {
    if (p.isEmptyLine) {
      docChildren.push(new Paragraph({ children: [] }));
      continue;
    }

    if (p.type === "heading") {
      const level = p.level && p.level > 0 ? Math.min(p.level, 6) : 1;
      const headingLevel =
        [
          HeadingLevel.HEADING_1,
          HeadingLevel.HEADING_2,
          HeadingLevel.HEADING_3,
          HeadingLevel.HEADING_4,
          HeadingLevel.HEADING_5,
          HeadingLevel.HEADING_6,
        ][level - 1];
      docChildren.push(
        new Paragraph({
          heading: headingLevel,
          alignment: alignmentFor(p, AlignmentType.LEFT),
          pageBreakBefore: !!p.pageBreakBefore,
          spacing: { before: 240, after: 120 },
          children: sentenceRuns(p, level === 1 ? 32 : level === 2 ? 28 : 24, { bold: true }),
        })
      );
    } else if (p.type === "table" && p.tableData && p.tableData.length > 0) {
      const rows = p.tableData.map(
        (rowCells, rIdx) =>
          new TableRow({
            children: rowCells.map(
              (cellText) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: cellText.trim(), bold: rIdx === 0, font: fontFamily, size: 20 }),
                      ],
                    }),
                  ],
                  shading: rIdx === 0 ? { fill: "F3F4F6" } : undefined,
                })
            ),
          })
      );
      docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      docChildren.push(new Paragraph({ spacing: { after: 140 } }));
    } else if (p.type === "list_item") {
      docChildren.push(
        new Paragraph({
          ...(p.listType === "number"
            ? { numbering: { reference: "edux-numbered", level: 0 } }
            : { bullet: { level: 0 } }),
          spacing: { after: 80, line: 276 },
          children: sentenceRuns(p, 24),
        })
      );
    } else if (p.type === "blockquote") {
      docChildren.push(
        new Paragraph({
          indent: { left: 720 },
          spacing: { before: 120, after: 120, line: 276 },
          children: sentenceRuns(p, 22, { italics: true }),
        })
      );
    } else if (p.type === "image") {
      if (p.imageUrl && DATA_URI.test(p.imageUrl)) {
        const kind = p.imageUrl.match(DATA_URI)![1].toLowerCase();
        const type = (kind === "jpeg" ? "jpg" : kind) as "png" | "jpg" | "gif" | "bmp";
        const natural = await imageSize(p.imageUrl);
        const scale = Math.min(1, 600 / natural.width);
        docChildren.push(
          new Paragraph({
            alignment: alignmentFor(p, AlignmentType.CENTER),
            spacing: { before: 120, after: 80 },
            children: [
              new ImageRun({
                type,
                data: p.imageUrl,
                transformation: {
                  width: Math.round(natural.width * scale),
                  height: Math.round(natural.height * scale),
                },
              }),
            ],
          })
        );
        if (p.imageCaption) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 160 },
              children: [new TextRun({ text: p.imageCaption, italics: true, font: fontFamily, size: 20 })],
            })
          );
        }
      }
    } else {
      docChildren.push(
        new Paragraph({
          spacing: { after: 180, line: 360 },
          alignment: alignmentFor(p, AlignmentType.BOTH),
          pageBreakBefore: !!p.pageBreakBefore,
          children: sentenceRuns(p, 24),
        })
      );
    }
  }

  if (docChildren.length === 0) {
    docChildren.push(new Paragraph({ children: [new TextRun({ text: " ", font: fontFamily, size: 24 })] }));
  }

  const doc = new Document({
    creator: author,
    title: title.replace(/\.(docx|txt|md)$/i, ""),
    numbering: {
      config: [
        {
          reference: "edux-numbered",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children: docChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Triggers a browser download of the .docx file. */
export async function downloadDocxFile(
  title: string,
  paragraphs: DocumentParagraphNode[],
  options: DocxExportOptions = {}
): Promise<void> {
  const blob = await exportDocumentToDocx(title, paragraphs, options);
  const cleanTitle = title.replace(/\.(docx|txt|md)$/i, "") + ".docx";

  try {
    saveAs(blob, cleanTitle);
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cleanTitle;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
