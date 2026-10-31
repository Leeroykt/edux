import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType
} from "docx";
import { saveAs } from "file-saver";
import { DocumentParagraphNode } from "@edux/schema";

export interface DocxExportOptions {
  exportMode?: "clean" | "tracked";
  fontFamily?: string;
  fontSizePt?: number;
}

/**
 * Lossless / High-Fidelity .docx exporter.
 * Generates genuine Microsoft Word (.docx) files from academic document nodes.
 */
export async function exportDocumentToDocx(
  title: string,
  paragraphs: DocumentParagraphNode[],
  options: DocxExportOptions = {}
): Promise<Blob> {
  const { exportMode = "clean", fontFamily = "Times New Roman" } = options;

  const docChildren: (Paragraph | Table)[] = [];

  for (const p of paragraphs) {
    if (p.type === "heading") {
      let headingLevel: any = HeadingLevel.HEADING_1;
      if (p.level === 2) headingLevel = HeadingLevel.HEADING_2;
      else if (p.level === 3) headingLevel = HeadingLevel.HEADING_3;
      else if (p.level && p.level > 3) headingLevel = HeadingLevel.HEADING_4;

      const headingText = p.sentences.map((s) => s.text).join(" ").trim();
      docChildren.push(
        new Paragraph({
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              font: fontFamily,
              size: p.level === 1 ? 32 : p.level === 2 ? 28 : 24, // 16pt / 14pt / 12pt
            }),
          ],
        })
      );
    } else if (p.type === "table" && p.tableData && p.tableData.length > 0) {
      const rows = p.tableData.map((rowCells, rIdx) => {
        return new TableRow({
          children: rowCells.map((cellText) => {
            return new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText.trim(),
                      bold: rIdx === 0,
                      font: fontFamily,
                      size: 20, // 10pt
                    }),
                  ],
                }),
              ],
              shading: rIdx === 0 ? { fill: "F3F4F6" } : undefined,
            });
          }),
        });
      });

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows,
        })
      );
      // Spacing after table
      docChildren.push(new Paragraph({ spacing: { after: 140 } }));
    } else if (p.type === "list_item") {
      const text = p.sentences.map((s) => s.text).join(" ").trim();
      docChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80, line: 276 },
          children: [
            new TextRun({
              text,
              font: fontFamily,
              size: 24, // 12pt
            }),
          ],
        })
      );
    } else if (p.type === "blockquote") {
      const text = p.sentences.map((s) => s.text).join(" ").trim();
      docChildren.push(
        new Paragraph({
          indent: { left: 720 }, // 0.5 in
          spacing: { before: 120, after: 120, line: 276 },
          children: [
            new TextRun({
              text,
              italics: true,
              font: fontFamily,
              size: 22,
            }),
          ],
        })
      );
    } else {
      // Standard Paragraph
      const textRuns: TextRun[] = [];

      p.sentences.forEach((s, sIdx) => {
        const isModified = s.score && s.score.score < 0.3 && s.score.confidence > 0.9;
        const text = s.text + (sIdx < p.sentences.length - 1 ? " " : "");

        if (exportMode === "tracked" && isModified) {
          // Highlight revised sentence in tracked mode
          textRuns.push(
            new TextRun({
              text,
              font: fontFamily,
              size: 24, // 12pt
              highlight: "yellow",
            })
          );
        } else {
          textRuns.push(
            new TextRun({
              text,
              font: fontFamily,
              size: 24, // 12pt
            })
          );
        }
      });

      docChildren.push(
        new Paragraph({
          spacing: { after: 180, line: 360 }, // 1.5 line spacing (360 dxa)
          alignment: AlignmentType.BOTH,
          children: textRuns,
        })
      );
    }
  }

  // Fallback if empty
  if (docChildren.length === 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Academic Manuscript - eduX Lossless Export",
            font: fontFamily,
            size: 24,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Triggers instant browser download of genuine .docx file
 */
export async function downloadDocxFile(
  title: string,
  paragraphs: DocumentParagraphNode[],
  options: DocxExportOptions = {}
): Promise<void> {
  const blob = await exportDocumentToDocx(title, paragraphs, options);
  const cleanTitle = title.replace(/\.docx$/i, "") + ".docx";

  try {
    saveAs(blob, cleanTitle);
  } catch {
    // Standard DOM fallback
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
