export const POLICY_COMMITMENTS = [
  { id: 'esg', label: 'ESG 경영', description: '환경·사회·지배구조 기준 강화' },
  { id: 'diversity', label: '다양성·포용성', description: '성별·국적·장애 차별 금지 강화' },
  { id: 'safety', label: '안전 최우선', description: '산업안전·근로자 보호 기준 강화' },
  { id: 'ethics', label: '윤리경영', description: '내부거래·부패방지·이해충돌 관리' },
  { id: 'digital', label: '디지털 전환', description: '원격근무·개인정보보호·사이버보안' },
] as const;

export type PolicyCommitmentId = (typeof POLICY_COMMITMENTS)[number]['id'];
