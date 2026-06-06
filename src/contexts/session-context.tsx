"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import type { GenerateRegulationDraftOutput } from "@/ai/flows/generate-regulation-draft-flow"
import type { PrecedentReport } from "@/ai/flows/verify-with-precedents-flow"
export type { PrecedentReport } from "@/ai/flows/verify-with-precedents-flow"
import type { ConflictScanResult } from "@/ai/flows/detect-regulation-conflicts-flow"
export type { ConflictScanResult } from "@/ai/flows/detect-regulation-conflicts-flow"

// ─── 타입 정의 ───────────────────────────────────────────────────────────────

export interface SessionRegulation {
  id: string;
  fileName: string;
  content: string;
  version: string;
  status: string;
  uploadedAt: string;
}

export interface DraftIteration {
  version: number;
  userInput: string;
  draft: GenerateRegulationDraftOutput;
  createdAt: string;
}

export interface SessionDraft {
  id: string;
  regulationId: string;
  regulationName: string;
  initialDirective: string;
  iterations: DraftIteration[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionScanImpact {
  regulationId: string;
  regulationName: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  reason: string;
  sourceArticle: string;
  diff: string;
}

export interface SessionScan {
  id: string;
  scannedAt: string;
  lawText: string;
  lawName?: string;
  regulationCount: number;
  impactedCount: number;
  impacts: SessionScanImpact[];
  summary: string;
}

/** 세션 내 충돌 스캔 결과 (id 포함) */
export type SessionConflictScan = ConflictScanResult & { id: string };

// ─── 컨텍스트 인터페이스 ──────────────────────────────────────────────────────

interface SessionContextValue {
  regulations: SessionRegulation[];
  drafts: SessionDraft[];
  scans: SessionScan[];
  /** 판례 교차검증 결과 (key: draftId) */
  precedentReports: Record<string, PrecedentReport>;
  addRegulation: (reg: Omit<SessionRegulation, "id">) => string;
  deleteRegulations: (ids: string[]) => void;
  addDraft: (draft: Omit<SessionDraft, "id">) => string;
  updateDraft: (id: string, updates: Partial<Omit<SessionDraft, "id">>) => void;
  deleteDraft: (id: string) => void;
  addScan: (scan: Omit<SessionScan, "id">) => string;
  deleteScan: (id: string) => void;
  /** 규정 간 충돌 스캔 결과 목록 */
  conflictScans: SessionConflictScan[];
  /** 충돌 스캔 결과를 추가하고 생성된 id를 반환합니다. */
  addConflictScan: (scan: ConflictScanResult) => string;
  /** 충돌 스캔 결과를 삭제합니다. */
  deleteConflictScan: (id: string) => void;
  /** 판례 교차검증 결과를 저장합니다. */
  setPrecedentReport: (draftId: string, report: PrecedentReport) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ─── ID 생성기 ────────────────────────────────────────────────────────────────

let idCounter = 0;
const generateId = () => `session_${Date.now()}_${++idCounter}`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [regulations, setRegulations] = useState<SessionRegulation[]>([]);
  const [drafts, setDrafts] = useState<SessionDraft[]>([]);
  const [scans, setScans] = useState<SessionScan[]>([]);
  const [precedentReports, setPrecedentReportsState] = useState<Record<string, PrecedentReport>>({});
  const [conflictScans, setConflictScans] = useState<SessionConflictScan[]>([]);

  const addRegulation = useCallback((reg: Omit<SessionRegulation, "id">) => {
    const id = generateId();
    setRegulations(prev => [...prev, { ...reg, id }]);
    return id;
  }, []);

  const deleteRegulations = useCallback((ids: string[]) => {
    setRegulations(prev => prev.filter(r => !ids.includes(r.id)));
  }, []);

  const addDraft = useCallback((draft: Omit<SessionDraft, "id">) => {
    const id = generateId();
    setDrafts(prev => [...prev, { ...draft, id }]);
    return id;
  }, []);

  const updateDraft = useCallback((id: string, updates: Partial<Omit<SessionDraft, "id">>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  }, []);

  const addScan = useCallback((scan: Omit<SessionScan, "id">) => {
    const id = generateId();
    setScans(prev => [...prev, { ...scan, id }]);
    return id;
  }, []);

  const deleteScan = useCallback((id: string) => {
    setScans(prev => prev.filter(s => s.id !== id));
  }, []);

  const addConflictScan = useCallback((scan: ConflictScanResult) => {
    const id = generateId();
    setConflictScans(prev => [...prev, { ...scan, id }]);
    return id;
  }, []);

  const deleteConflictScan = useCallback((id: string) => {
    setConflictScans(prev => prev.filter(s => s.id !== id));
  }, []);

  const setPrecedentReport = useCallback((draftId: string, report: PrecedentReport) => {
    setPrecedentReportsState(prev => ({ ...prev, [draftId]: report }));
  }, []);

  return (
    <SessionContext.Provider value={{
      regulations,
      drafts,
      scans,
      precedentReports,
      addRegulation,
      deleteRegulations,
      addDraft,
      updateDraft,
      deleteDraft,
      addScan,
      deleteScan,
      conflictScans,
      addConflictScan,
      deleteConflictScan,
      setPrecedentReport,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
