import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  generateRevisionDocx,
  getRevisionDocxFilename,
  type RevisionDocxInput,
} from "./revision-docx";

async function extractDocxText(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("document.xml not found in docx");
  }
  return documentXml;
}

describe("generateRevisionDocx", () => {
  const sampleInput: RevisionDocxInput = {
    regulationName: "취업규칙",
    rationale: "고용노동부 최신 지침에 따른 의무 교육 강화 대응",
    summaryOfChanges: [
      "교육 주기 단축 (연 1회 -> 월 1회)",
      "교육 시간 명시 (2시간 이상)",
    ],
    comparisonTable: [
      {
        section: "제 45조 (직장 내 괴롭힘 예방 교육)",
        before:
          "① 회사는 직장 내 괴롭힘 예방을 위해 연 1회 교육을 실시한다.",
        after:
          "① 회사는 직장 내 괴롭힘 예방 및 대처를 위해 상시근로자를 대상으로 월 1회, 2시간 이상의 심화 교육을 의무적으로 실시한다.",
      },
      {
        section: "제 46조 (교육 기록)",
        before: "N/A (신설)",
        after: "① 회사는 교육 실시 내용을 기록하고 3년간 보관한다.",
      },
    ],
  };

  it("comparisonTable의 section 텍스트가 문서에 포함된다", async () => {
    const blob = await generateRevisionDocx(sampleInput);
    const xmlContent = await extractDocxText(blob);

    for (const item of sampleInput.comparisonTable) {
      expect(xmlContent).toContain(item.section);
    }
  });

  it("comparisonTable의 before 텍스트가 문서에 포함된다", async () => {
    const blob = await generateRevisionDocx(sampleInput);
    const xmlContent = await extractDocxText(blob);

    for (const item of sampleInput.comparisonTable) {
      expect(xmlContent).toContain(item.before);
    }
  });

  it("comparisonTable의 after 텍스트가 문서에 포함된다", async () => {
    const blob = await generateRevisionDocx(sampleInput);
    const xmlContent = await extractDocxText(blob);

    for (const item of sampleInput.comparisonTable) {
      expect(xmlContent).toContain(item.after);
    }
  });

  it("문서 제목에 규정명이 포함된다", async () => {
    const blob = await generateRevisionDocx(sampleInput);
    const xmlContent = await extractDocxText(blob);

    expect(xmlContent).toContain(`${sampleInput.regulationName} 개정안`);
  });

  it("개정 근거 섹션과 rationale 텍스트가 포함된다", async () => {
    const blob = await generateRevisionDocx(sampleInput);
    const xmlContent = await extractDocxText(blob);

    expect(xmlContent).toContain("개정 근거");
    expect(xmlContent).toContain(sampleInput.rationale);
  });

  it("주요 변경 요약이 포함된다", async () => {
    const blob = await generateRevisionDocx(sampleInput);
    const xmlContent = await extractDocxText(blob);

    expect(xmlContent).toContain("주요 변경 요약");
    for (const change of sampleInput.summaryOfChanges) {
      const escapedChange = change.replace(/>/g, "&gt;").replace(/</g, "&lt;");
      expect(xmlContent).toContain(escapedChange);
    }
  });

  it("유효한 docx Blob을 반환한다", async () => {
    const blob = await generateRevisionDocx(sampleInput);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe("getRevisionDocxFilename", () => {
  it("올바른 형식의 파일명을 생성한다", () => {
    const filename = getRevisionDocxFilename("취업규칙");

    expect(filename).toMatch(/^개정안_취업규칙_\d{8}\.docx$/);
  });

  it("오늘 날짜가 파일명에 포함된다", () => {
    const filename = getRevisionDocxFilename("취업규칙");
    const today = new Date();
    const expectedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    expect(filename).toContain(expectedDate);
  });
});
