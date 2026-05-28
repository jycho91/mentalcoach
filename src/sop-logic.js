// Business logic extracted from prototype.html — testable pure functions.
// These must stay in sync with the inline implementations in prototype.html.

export function classifySop(name) {
  if (/MKT|광고|마케팅/.test(name)) {
    return {
      level: 'impact-high',
      badgeClass: 'badge-high',
      badgeText: '영향 가능성 높음',
      desc: '의약품 광고·판촉 관련 조문이 직접 영향을 받습니다.',
    };
  }
  if (/HR|취업규칙/.test(name)) {
    return {
      level: 'impact-mid',
      badgeClass: 'badge-mid',
      badgeText: '검토 필요',
      desc: '근로조건 관련 조문과 연관 가능성이 있습니다.',
    };
  }
  return {
    level: 'impact-low',
    badgeClass: 'badge-low',
    badgeText: '무관',
    desc: '이번 법령 개정과 직접 연관되지 않습니다.',
  };
}

export function formatText(text, isRevised = false) {
  if (!isRevised) {
    return text.split('\n').map(line => `<div>${line}</div>`).join('');
  }
  return text
    .split('\n')
    .map(line =>
      line.replace(/<add>(.*?)<\/add>/g, (_, content) =>
        `<span class="text-add">${content}</span>`
      )
    )
    .map(line => `<div>${line}</div>`)
    .join('');
}
