"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import type { GenerateRegulationDraftOutput } from "@/ai/flows/generate-regulation-draft-flow"

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
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
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

// ─── 컨텍스트 인터페이스 ──────────────────────────────────────────────────────

interface SessionContextValue {
  regulations: SessionRegulation[];
  drafts: SessionDraft[];
  scans: SessionScan[];
  addRegulation: (reg: Omit<SessionRegulation, "id">) => string;
  deleteRegulations: (ids: string[]) => void;
  addDraft: (draft: Omit<SessionDraft, "id">) => string;
  updateDraft: (id: string, updates: Partial<Omit<SessionDraft, "id">>) => void;
  deleteDraft: (id: string) => void;
  addScan: (scan: Omit<SessionScan, "id">) => string;
  deleteScan: (id: string) => void;
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

  return (
    <SessionContext.Provider value={{
      regulations,
      drafts,
      scans,
      addRegulation,
      deleteRegulations,
      addDraft,
      updateDraft,
      deleteDraft,
      addScan,
      deleteScan,
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
