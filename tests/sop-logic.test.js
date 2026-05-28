import { describe, it, expect } from 'vitest';
import { classifySop, formatText } from '../src/sop-logic.js';

// ── classifySop ──────────────────────────────────────────────────────────────

describe('classifySop — high impact (MKT / 광고 / 마케팅)', () => {
  it('flags "MKT" prefix as high impact', () => {
    const r = classifySop('MKT-001 판촉전략규정');
    expect(r.level).toBe('impact-high');
    expect(r.badgeClass).toBe('badge-high');
    expect(r.badgeText).toBe('영향 가능성 높음');
  });

  it('flags "광고" keyword as high impact', () => {
    expect(classifySop('광고운영규정').level).toBe('impact-high');
  });

  it('flags "마케팅" keyword as high impact', () => {
    expect(classifySop('마케팅SOP').level).toBe('impact-high');
  });

  it('is case-sensitive — lowercase "mkt" is NOT high impact', () => {
    expect(classifySop('mkt-sop').level).toBe('impact-low');
  });

  it('desc mentions 광고·판촉', () => {
    expect(classifySop('MKT-002').desc).toContain('광고·판촉');
  });
});

describe('classifySop — mid impact (HR / 취업규칙)', () => {
  it('flags "HR" keyword as mid impact', () => {
    const r = classifySop('HR-003 직원교육규정');
    expect(r.level).toBe('impact-mid');
    expect(r.badgeClass).toBe('badge-mid');
    expect(r.badgeText).toBe('검토 필요');
  });

  it('flags "취업규칙" as mid impact', () => {
    expect(classifySop('취업규칙 개정안').level).toBe('impact-mid');
  });

  it('desc mentions 근로조건', () => {
    expect(classifySop('HR-001').desc).toContain('근로조건');
  });
});

describe('classifySop — low impact (unrelated SOPs)', () => {
  it('marks unrelated SOPs as low impact', () => {
    const cases = ['구매관리규정', 'IT보안정책', '재무회계규정', '환경안전SOP'];
    for (const name of cases) {
      expect(classifySop(name).level).toBe('impact-low');
    }
  });

  it('returns badge-low and "무관" for unrelated SOPs', () => {
    const r = classifySop('재고관리규정');
    expect(r.badgeClass).toBe('badge-low');
    expect(r.badgeText).toBe('무관');
  });

  it('handles empty string as low impact', () => {
    expect(classifySop('').level).toBe('impact-low');
  });

  it('handles whitespace-only name as low impact', () => {
    expect(classifySop('   ').level).toBe('impact-low');
  });

  it('desc mentions 직접 연관되지 않습니다', () => {
    expect(classifySop('기타').desc).toContain('직접 연관되지 않습니다');
  });
});

describe('classifySop — priority (MKT wins over HR when both match)', () => {
  it('MKT pattern takes priority over HR when name contains both', () => {
    expect(classifySop('MKT-HR-혼합규정').level).toBe('impact-high');
  });
});

// ── formatText ───────────────────────────────────────────────────────────────

describe('formatText — plain mode (isRevised=false)', () => {
  it('wraps a single line in a div', () => {
    expect(formatText('hello')).toBe('<div>hello</div>');
  });

  it('wraps multiple lines in separate divs', () => {
    expect(formatText('line1\nline2\nline3'))
      .toBe('<div>line1</div><div>line2</div><div>line3</div>');
  });

  it('does NOT convert <add> tags in plain mode', () => {
    expect(formatText('<add>신규</add>')).toBe('<div><add>신규</add></div>');
  });

  it('handles empty string', () => {
    expect(formatText('')).toBe('<div></div>');
  });
});

describe('formatText — revised mode (isRevised=true)', () => {
  it('converts a single <add> tag to a text-add span', () => {
    expect(formatText('<add>신규조문</add>', true))
      .toBe('<div><span class="text-add">신규조문</span></div>');
  });

  it('converts multiple <add> tags on one line', () => {
    expect(formatText('<add>A</add> 그리고 <add>B</add>', true))
      .toBe('<div><span class="text-add">A</span> 그리고 <span class="text-add">B</span></div>');
  });

  it('handles a line with no <add> tags unchanged', () => {
    expect(formatText('기존조문', true)).toBe('<div>기존조문</div>');
  });

  it('handles multi-line text with mixed revised and plain lines', () => {
    expect(formatText('기존\n<add>신규</add>', true))
      .toBe('<div>기존</div><div><span class="text-add">신규</span></div>');
  });

  it('default parameter isRevised=false produces plain output', () => {
    expect(formatText('<add>x</add>')).toBe('<div><add>x</add></div>');
  });
});
