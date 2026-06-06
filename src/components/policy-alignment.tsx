"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Compass, CheckCircle2, Clock, Loader2, Download, ChevronDown, ChevronUp,
  AlertTriangle, BookOpen, Target, Info, PlayCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  POLICY_COMMITMENTS,
  alignPolicyCommitment,
  type RegulationAlignmentResult,
} from "@/ai/flows/align-policy-commitment-flow"
import { useSession } from "@/contexts/session-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

type RegulationStatus = 'idle' | 'pending' | 'processing' | 'done' | 'error';

interface RegulationProgress {
  regulationId: string;
  regulationName: string;
  status: RegulationStatus;
  result?: RegulationAlignmentResult;
  errorMessage?: string;
}

const SESSION_STORAGE_KEY = 'regulmate-policy-progress';

// ─── 저장/복원 유틸리티 ───────────────────────────────────────────────────────

/**
 * 완료된 규정 정렬 결과를 sessionStorage에 저장합니다.
 * @param results - 완료된 결과 목록
 */
function saveProgressToSession(results: RegulationProgress[]) {
  try {
    const completed = results.filter((r) => r.status === 'done' && r.result);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(completed));
  } catch {
    // sessionStorage 접근 불가 시 무시
  }
}

/**
 * sessionStorage에서 이전 진행 상태를 복원합니다.
 * @returns 저장된 완료 결과 목록 또는 빈 배열
 */
function loadProgressFromSession(): RegulationProgress[] {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RegulationProgress[];
  } catch {
    return [];
  }
}

// ─── 다운로드 유틸리티 ────────────────────────────────────────────────────────

/**
 * 전체 정렬 결과를 텍스트 파일로 다운로드합니다.
 * @param progressList - 완료된 규정 진행 상태 목록
 * @param commitmentLabels - 선택된 커미트먼트 레이블 목록
 */
function downloadAllResults(progressList: RegulationProgress[], commitmentLabels: string[]) {
  const lines: string[] = [];
  const now = new Date().toLocaleString('ko-KR');

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  경영 방향성 기반 전사 규정 정렬 결과');
  lines.push(`  생성일시: ${now}`);
  lines.push(`  적용 커미트먼트: ${commitmentLabels.join(', ')}`);
  lines.push('');
  lines.push('  ⚠️  AI 생성 초안 — 실제 적용 전 법무 담당자 검토 필수');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  const done = progressList.filter((p) => p.status === 'done' && p.result);

  done.forEach((p, idx) => {
    const r = p.result!;
    lines.push(`[${ idx + 1 }] ${r.regulationName}`);
    lines.push('─────────────────────────────────────────────────────────');
    lines.push('');
    lines.push('【 신구조문대비표 】');
    lines.push('');

    r.comparisonTable.forEach((item) => {
      lines.push(`▶ ${item.section}`);
      lines.push(`  [현행]   ${item.before}`);
      lines.push(`  [개정안] ${item.after}`);
      lines.push(`  [변경이유] ${item.changeReason}`);
      lines.push('');
    });

    lines.push('【 주요 변경사항 】');
    r.summary.forEach((s) => lines.push(`  • ${s}`));
    lines.push('');
    lines.push('【 개정 근거 】');
    lines.push(`  ${r.rationale}`);
    lines.push('');
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `경영방향성_규정정렬_${now.replace(/[:/\s]/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 서브 컴포넌트: 신구조문대비표 ───────────────────────────────────────────

interface ComparisonTableProps {
  result: RegulationAlignmentResult;
}

function ComparisonTableView({ result }: ComparisonTableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-slate-700">신구조문대비표 보기</span>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            {result.comparisonTable.length}개 조항
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-5 space-y-5">
          {/* 요약 */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">주요 변경사항</p>
            <ul className="space-y-1">
              {result.summary.map((s, i) => (
                <li key={i} className="text-sm text-blue-900 flex items-start space-x-1.5">
                  <span className="text-blue-400 font-bold flex-shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 개정 근거 */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1.5">개정 근거</p>
            <p className="text-sm text-amber-900 leading-relaxed">{result.rationale}</p>
          </div>

          {/* 신구조문 대비표 */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold text-slate-600 w-36">조항</TableHead>
                  <TableHead className="font-bold text-slate-600">현행</TableHead>
                  <TableHead className="font-bold text-primary">개정안</TableHead>
                  <TableHead className="font-bold text-slate-600 w-48">변경 이유</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.comparisonTable.map((item, i) => (
                  <TableRow key={i} className="align-top">
                    <TableCell className="font-semibold text-xs text-slate-700 py-3">{item.section}</TableCell>
                    <TableCell className="text-xs text-slate-500 py-3 whitespace-pre-wrap leading-relaxed">{item.before}</TableCell>
                    <TableCell className="text-xs text-emerald-800 py-3 whitespace-pre-wrap leading-relaxed bg-emerald-50/40">{item.after}</TableCell>
                    <TableCell className="text-xs text-slate-500 py-3 leading-relaxed">{item.changeReason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 면책 고지 */}
          <div className="flex items-start space-x-2 bg-rose-50 border border-rose-100 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 leading-relaxed">
              <span className="font-bold">AI 생성 초안</span> — 본 개정안은 참고용 초안이며, 실제 규정 개정에 적용하기 전 반드시 법무 담당자 및 해당 부서의 검토·승인이 필요합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

/**
 * 경영 방향성 기반 전사 규정 일괄 정렬 컴포넌트
 * - 커미트먼트 체크박스 선택
 * - 규정별 순차 개정안 생성
 * - sessionStorage 체크포인트 저장
 * - 전체 결과 텍스트 파일 다운로드
 */
export function PolicyAlignment() {
  const { regulations } = useSession();
  const { toast } = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progressList, setProgressList] = useState<RegulationProgress[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // sessionStorage에서 이전 진행 상태 복원
  useEffect(() => {
    const saved = loadProgressFromSession();
    if (saved.length > 0) {
      setProgressList(saved);
    }
  }, []);

  // 커미트먼트 토글
  const toggleCommitment = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 선택된 커미트먼트 레이블 목록
  const selectedLabels = POLICY_COMMITMENTS
    .filter((c) => selectedIds.has(c.id))
    .map((c) => c.label);

  // 완료된 규정 수
  const doneCount = progressList.filter((p) => p.status === 'done').length;
  const hasAnyDone = doneCount > 0;

  // 일괄 개정안 생성 실행
  const handleRunAlignment = async () => {
    if (selectedIds.size === 0) return;
    if (regulations.length === 0) {
      toast({
        variant: 'destructive',
        title: '규정 없음',
        description: '규정 라이브러리에 규정을 먼저 등록해주세요.',
      });
      return;
    }

    // 진행 상태 초기화
    const initial: RegulationProgress[] = regulations.map((reg) => ({
      regulationId: reg.id,
      regulationName: reg.fileName,
      status: 'pending',
    }));
    setProgressList(initial);
    setIsRunning(true);

    const updated = [...initial];

    for (let i = 0; i < regulations.length; i++) {
      const reg = regulations[i];

      // 해당 규정 처리 중 상태로 업데이트
      updated[i] = { ...updated[i], status: 'processing' };
      setProgressList([...updated]);

      try {
        const result = await alignPolicyCommitment({
          selectedCommitmentIds: Array.from(selectedIds),
          regulationId: reg.id,
          regulationName: reg.fileName,
          regulationContent: reg.content,
        });

        updated[i] = { ...updated[i], status: 'done', result };
        setProgressList([...updated]);
        saveProgressToSession(updated);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '알 수 없는 오류';
        updated[i] = { ...updated[i], status: 'error', errorMessage: message };
        setProgressList([...updated]);
        toast({
          variant: 'destructive',
          title: `${reg.fileName} 처리 실패`,
          description: message,
        });
      }
    }

    setIsRunning(false);
    const finalDone = updated.filter((u) => u.status === 'done').length;
    toast({
      title: '일괄 정렬 완료',
      description: `총 ${regulations.length}개 규정 중 ${finalDone}개 완료되었습니다.`,
    });
  };

  // 상태 아이콘 렌더
  const renderStatusIcon = (status: RegulationStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return null;
    }
  };

  // 상태 배지 렌더
  const renderStatusBadge = (status: RegulationStatus) => {
    const map: Record<RegulationStatus, { label: string; className: string }> = {
      idle: { label: '대기', className: 'bg-slate-100 text-slate-500 border-slate-200' },
      pending: { label: '대기 중', className: 'bg-slate-100 text-slate-500 border-slate-200' },
      processing: { label: '진행 중', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      done: { label: '완료', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      error: { label: '오류', className: 'bg-rose-100 text-rose-700 border-rose-200' },
    };
    const { label, className } = map[status];
    return <Badge className={cn('text-xs font-semibold', className)}>{label}</Badge>;
  };

  return (
    <div className="space-y-8">

      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold text-slate-800">경영 방향성 규정 정렬</h2>
              <p className="text-sm text-slate-500">선택한 경영 커미트먼트 방향으로 전사 규정을 일괄 개정합니다.</p>
            </div>
          </div>
        </div>

        {hasAnyDone && (
          <Button
            variant="outline"
            className="flex items-center space-x-2 border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => downloadAllResults(progressList, selectedLabels)}
          >
            <Download className="w-4 h-4" />
            <span>전체 다운로드</span>
          </Button>
        )}
      </div>

      {/* 면책 안내 */}
      <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-amber-800">AI 생성 초안 — 법무 담당자 검토 필수</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            본 기능은 경영 방향성에 맞는 규정 개정 초안을 AI가 자동 생성합니다.
            생성된 결과는 참고용이며, 실제 규정 변경 시 반드시 법무 담당자 및 해당 부서의 승인 절차를 거쳐야 합니다.
          </p>
        </div>
      </div>

      {/* 경영 커미트먼트 선택 */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-primary" />
            <CardTitle className="text-base font-bold text-slate-700">경영 방향성 커미트먼트 선택</CardTitle>
          </div>
          <p className="text-xs text-slate-500 mt-1">적용할 경영 방향성을 하나 이상 선택하세요.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {POLICY_COMMITMENTS.map((commitment) => {
              const isChecked = selectedIds.has(commitment.id);
              return (
                <button
                  key={commitment.id}
                  onClick={() => toggleCommitment(commitment.id)}
                  disabled={isRunning}
                  className={cn(
                    "flex items-start space-x-3 p-4 rounded-xl border text-left transition-all duration-200",
                    isChecked
                      ? "bg-primary/5 border-primary/30 shadow-sm shadow-primary/10"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    isRunning && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleCommitment(commitment.id)}
                    className="mt-0.5 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isRunning}
                  />
                  <div className="space-y-0.5">
                    <p className={cn(
                      "text-sm font-bold leading-tight",
                      isChecked ? "text-primary" : "text-slate-700"
                    )}>
                      {commitment.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">{commitment.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <Separator className="my-5" />

          {/* 선택 요약 + 실행 버튼 */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {selectedIds.size > 0 ? (
                <>
                  <p className="text-xs font-bold text-slate-600">선택된 커미트먼트</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POLICY_COMMITMENTS
                      .filter((c) => selectedIds.has(c.id))
                      .map((c) => (
                        <Badge key={c.id} className="bg-primary/10 text-primary border-primary/20 text-xs">
                          {c.label}
                        </Badge>
                      ))
                    }
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">커미트먼트를 선택하면 적용 대상이 표시됩니다.</p>
              )}
            </div>

            <Button
              onClick={handleRunAlignment}
              disabled={selectedIds.size === 0 || isRunning || regulations.length === 0}
              className="flex items-center space-x-2 px-6"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>일괄 개정안 생성</span>
                </>
              )}
            </Button>
          </div>

          {regulations.length === 0 && (
            <p className="mt-3 text-xs text-slate-400 text-center">
              규정 라이브러리에 등록된 규정이 없습니다. 먼저 규정을 업로드해주세요.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 규정별 진행 상태 */}
      {progressList.length > 0 && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-bold text-slate-700">규정별 처리 현황</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {doneCount} / {progressList.length} 완료
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {progressList.map((progress) => (
              <div key={progress.regulationId} className="space-y-0">
                {/* 규정 행 */}
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-colors",
                  progress.status === 'done'
                    ? "bg-emerald-50/50 border-emerald-200"
                    : progress.status === 'processing'
                    ? "bg-blue-50/50 border-blue-200"
                    : progress.status === 'error'
                    ? "bg-rose-50/50 border-rose-200"
                    : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center space-x-3">
                    {renderStatusIcon(progress.status)}
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{progress.regulationName}</p>
                      {progress.status === 'processing' && (
                        <p className="text-xs text-blue-600 mt-0.5">AI가 개정안을 생성하고 있습니다...</p>
                      )}
                      {progress.status === 'error' && (
                        <p className="text-xs text-rose-600 mt-0.5">{progress.errorMessage}</p>
                      )}
                    </div>
                  </div>
                  {renderStatusBadge(progress.status)}
                </div>

                {/* 완료된 규정: 신구조문대비표 */}
                {progress.status === 'done' && progress.result && (
                  <ComparisonTableView result={progress.result} />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
