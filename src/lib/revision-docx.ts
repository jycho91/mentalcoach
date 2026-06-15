import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
} from "docx";

export interface ComparisonItem {
  section: string;
  before: string;
  after: string;
}

export interface RevisionDocxInput {
  regulationName: string;
  rationale: string;
  summaryOfChanges: string[];
  comparisonTable: ComparisonItem[];
}

export async function generateRevisionDocx(input: RevisionDocxInput): Promise<Blob> {
  const { regulationName, rationale, summaryOfChanges, comparisonTable } = input;

  const doc = new Document({
    sections: [
      {
        children: [
          // 제목
          new Paragraph({
            text: `${regulationName} 개정안`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // 개정 근거 섹션
          new Paragraph({
            text: "개정 근거",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: rationale })],
            spacing: { after: 400 },
          }),

          // 주요 변경 요약 섹션
          new Paragraph({
            text: "주요 변경 요약",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          ...summaryOfChanges.map(
            (change) =>
              new Paragraph({
                children: [new TextRun({ text: `• ${change}` })],
                spacing: { after: 100 },
              })
          ),

          // 신구조문 대비표 섹션
          new Paragraph({
            text: "신구조문 대비표",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          createComparisonTable(comparisonTable),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function createComparisonTable(comparisonTable: ComparisonItem[]): Table {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "000000",
  };

  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "조항", bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { fill: "E0E0E0" },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "현행", bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 40, type: WidthType.PERCENTAGE },
        shading: { fill: "E0E0E0" },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: "개정안", bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 40, type: WidthType.PERCENTAGE },
        shading: { fill: "E0E0E0" },
      }),
    ],
  });

  const dataRows = comparisonTable.map(
    (item) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: item.section })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ text: item.before })],
            width: { size: 40, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ text: item.after })],
            width: { size: 40, type: WidthType.PERCENTAGE },
          }),
        ],
      })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
      insideHorizontal: borderStyle,
      insideVertical: borderStyle,
    },
  });
}

export function getRevisionDocxFilename(regulationName: string): string {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  return `개정안_${regulationName}_${dateStr}.docx`;
}
