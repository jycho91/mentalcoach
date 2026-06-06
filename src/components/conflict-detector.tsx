"use client"

/**
 * @fileOverview 내부 규정 간 충돌 탐지 컴포넌트
 *
 * - ConflictDetector - 사내 규정들 간 충돌을 탐지하고 결과를 표시하는 컴포넌트
 */

import { useState } from "react"
import {
  Swords,
  Scan,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  FileText,
  History,
  Clock,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  detectRegulationConflicts,
  type ConflictItem,
  type ConflictType,
} from "@/ai/flows/detect-regulation-conflicts-flow"
import { useSession, type SessionConflictScan } from "@/contexts/session-context"
import { useToast } from "@/hooks/use-toast"

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

/**
 * 충돌 유형의 한국어 레이블을 반환합니다.
 */
const getConflictTypeLabel = (type: ConflictType): string => {
  switch (type) {
    case 'LOGIC': return '논리 충돌';
    case 'NUMERIC': return '수치 비일관성';
    case 'SEMANTIC': return '의미 중복';
  }
};

/**
 * 심각도에 따른 Badge variant를 반환합니다.
 */
const getSeverityBadgeVariant = (
  severity: string
): 'destructive' | 'default' | 'secondary' => {
  switch (severity) {
    case 'HIGH': return 'destructive';
    case 'MEDIUM': return 'default';
    case 'LOW': return 'secondary';
    default: return 'secondary';
  }
};

/**
 * 심각도에 따른 한국어 레이블을 반환합니다.
 */
const getSeverityLabel = (severity: string): string => {
  switch (severity) {
    case 'HIGH': return '즉시 해소 필요';
    case 'MEDIUM': return '검토 필요';
    case 'LOW': return '참고 수준';
    default: return severity;
  }
};

/**
 * 심각도에 따른 아이콘을 반환합니다.
 */
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'HIGH': return <AlertTriangle className="w-3.5 h-3.5" />;
    case 'MEDIUM': return <AlertCircle className="w-3.5 h-3.5" />;
    case 'LOW': return <Info className="w-3.5 h-3.5" />;
    default: return null;
  }
};

/**
 * 충돌 유형 필터 탭 목록
 */
const FILTER_TABS: { value: ConflictType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'LOGIC', label: '논리 충돌' },
  { value: 'NUMERIC', label: '수치 비일관성' },
  { value: 'SEMANTIC', label: '의미 중복' },
];

/**
 * ISO 날짜 문자열을 한국어 형식으로 포맷합니다.
 */
const formatDate = (isoString: string): string =>
  new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// ─── 충돌 카드 ────────────────────────────────────────────────────────────────

interface ConflictCardProps {
  conflict: ConflictItem;
}

/**
 * 개별 충돌 항목 카드 컴포넌트
 */
function ConflictCard({ conflict }: ConflictCardProps) {
  return (
    <Card className="shadow-md border-slate-200 overflow-hidden">
      <CardHeader className="pb-3 bg-slate-50/80 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-bold text-slate-600 border-slate-300">
                {getConflictTypeLabel(conflict.type)}
              </Badge>
              <Badge
                variant={getSeverityBadgeVariant(conflict.severity)}
                className="flex items-center gap-1 text-xs"
              >
                {getSeverityIcon(conflict.severity)}
                <span>{getSeverityLabel(conflict.severity)}</span>
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 flex-wrap">
              <span>{conflict.regulationAName}</span>
              <span className="text-slate-400 font-normal">↔</span>
              <span>{conflict.regulationBName}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* 충돌 조항 원문 */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">충돌 조항 원문</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {conflict.regulationAName}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed font-mono italic">
                &ldquo;{conflict.conflictingTexts.a}&rdquo;
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {conflict.regulationBName}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed font-mono italic">
                &ldquo;{conflict.conflictingTexts.b}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* 충돌 내용 설명 */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">충돌 내용</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{conflict.description}</p>
        </div>

        {/* 중재안 */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">중재안</h4>
          <p className="text-sm text-slate-700 leading-relaxed">{conflict.arbitration}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

/**
 * 내부 규정 간 충돌 탐지 메인 컴포넌트
 */
export function ConflictDetector() {
  const { regulations, conflictScans, addConflictScan, deleteConflictScan } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("scan");
  const [filterType, setFilterType] = useState<ConflictType | 'ALL'>('ALL');
  const [currentResult, setCurrentResult] = useState<SessionConflictScan | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // ─── 스캔 실행 ──────────────────────────────────────────────────────────────

  /**
   * 충돌 탐지를 실행하고 결과를 세션에 저장합니다.
   */
  const handleScan = async () => {
    if (regulations.length < 2) {
      toast({
        variant: "destructive",
        title: "규정 부족",
        description: "비교할 규정이 2개 이상 필요합니다. 규정 라이브러리에서 규정을 먼저 등록해주세요.",
      });
      return;
    }

    setLoading(true);
    setCurrentResult(null);
    setSelectedHistoryId(null);

    try {
      const output = await detectRegulationConflicts({
        regulations: regulations.map(r => ({
          id: r.id,
          fileName: r.fileName,
          content: r.content,
        })),
      });

      const id = addConflictScan(output);
      const saved: SessionConflictScan = { ...output, id };
      setCurrentResult(saved);
      setFilterType('ALL');

      toast({
        title: "탐지 완료",
        description: `${output.conflicts.length}건의 충돌이 발견되었습니다. 이력에 저장됨.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "규정 충돌 분석 중 오류가 발생했습니다.";
      toast({ variant: "destructive", title: "탐지 실패", description: message });
    } finally {
      setLoading(false);
    }
  };

  // ─── 이력 선택/삭제 ─────────────────────────────────────────────────────────

  /**
   * 이력 항목을 선택하여 결과를 표시합니다.
   */
  const handleSelectHistory = (scan: SessionConflictScan) => {
    setCurrentResult(scan);
    setSelectedHistoryId(scan.id);
    setFilterType('ALL');
  };

  /**
   * 이력 항목을 삭제합니다.
   */
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConflictScan(id);
    if (selectedHistoryId === id) {
      setCurrentResult(null);
      setSelectedHistoryId(null);
    }
    toast({ title: "삭제 완료", description: "충돌 스캔 이력이 삭제되었습니다." });
  };

  // ─── 파생 데이터 ────────────────────────────────────────────────────────────

  const sortedHistory = [...conflictScans].sort(
    (a, b) => new Date(b.scanTimestamp).getTime() - new Date(a.scanTimestamp).getTime()
  );

  const filteredConflicts = currentResult
    ? (filterType === 'ALL'
      ? currentResult.conflicts
      : currentResult.conflicts.filter(c => c.type === filterType))
    : [];

  const canScan = regulations.length >= 2 && !loading;

  // ─── 렌더 ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Swords className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">규정 충돌 탐지</h2>
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            등록된 규정: {regulations.length}개
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="scan" className="flex items-center space-x-2">
            <Scan className="w-4 h-4" />
            <span>충돌 탐지</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>탐지 이력</span>
            {sortedHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1">{sortedHistory.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 충돌 탐지 탭 */}
        <TabsContent value="scan" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-semibold text-slate-700">규정 간 충돌 자동 탐지</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                등록된 사내 규정들을 AI로 교차 분석하여 논리 충돌, 수치 비일관성, 의미 중복을 탐지합니다.
                탐지 결과는 이력에 자동 저장됩니다.
              </p>
              <Button
                onClick={handleScan}
                disabled={!canScan}
                className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-bold shadow-lg transition-all active:scale-[0.98]"
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />분석 중...</>
                  : <><Swords className="w-5 h-5 mr-2" />충돌 탐지 시작</>
                }
              </Button>

              {regulations.length === 0 && (
                <div className="flex items-center justify-center space-x-2 text-amber-600">
                  <Info className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    규정 라이브러리에 규정을 먼저 등록해주세요.
                  </p>
                </div>
              )}
              {regulations.length === 1 && (
                <div className="flex items-center justify-center space-x-2 text-amber-600">
                  <Info className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    충돌 탐지를 위해 규정이 2개 이상 필요합니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 탐지 이력 탭 */}
        <TabsContent value="history" className="space-y-6">
          {sortedHistory.length > 0 ? (
            <div className="space-y-3">
              {sortedHistory.map((scan) => (
                <Card
                  key={scan.id}
                  className={`shadow-sm border-slate-200 cursor-pointer transition-all hover:shadow-md ${
                    selectedHistoryId === scan.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectHistory(scan)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {formatDate(scan.scanTimestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          규정 {scan.regulationCount}개 분석
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={scan.conflicts.length > 0 ? "destructive" : "secondary"}>
                          충돌 {scan.conflicts.length}건
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                          onClick={(e) => handleDeleteHistory(scan.id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-4 border-2 border-dashed border-slate-200 rounded-3xl">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <History className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-bold">탐지 이력이 없습니다.</p>
                <p className="text-sm">&ldquo;충돌 탐지&rdquo; 탭에서 분석을 실행해보세요.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 결과 영역 */}
      <div className="space-y-6">
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-300">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
            <p className="text-slate-500 font-medium animate-pulse">
              {regulations.length}개의 규정을 교차 분석하고 있습니다...
            </p>
          </div>
        )}

        {currentResult && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 요약 카드 */}
            <Card className="border-primary/20 bg-primary/5 shadow-md">
              <CardHeader className="pb-3 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">
                    탐지 결과 요약
                  </CardTitle>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {currentResult.conflicts.length}건 탐지
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-slate-700 leading-relaxed">{currentResult.summary}</p>
                <p className="text-xs text-slate-400 italic">
                  ⚠️ AI 분석 결과입니다. 실제 적용 전 담당자 최종 판단이 필요합니다.
                </p>
              </CardContent>
            </Card>

            {currentResult.conflicts.length > 0 ? (
              <>
                {/* 유형별 필터 탭 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {FILTER_TABS.map(tab => {
                    const count = tab.value === 'ALL'
                      ? currentResult.conflicts.length
                      : currentResult.conflicts.filter(c => c.type === tab.value).length;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setFilterType(tab.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          filterType === tab.value
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                        {count > 0 && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                            filterType === tab.value ? 'bg-white/20' : 'bg-slate-200'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 충돌 카드 목록 */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    탐지된 충돌 목록
                  </h3>
                  {filteredConflicts.length > 0 ? (
                    filteredConflicts.map((conflict, idx) => (
                      <ConflictCard key={idx} conflict={conflict} />
                    ))
                  ) : (
                    <Card className="border-slate-200 bg-slate-50">
                      <CardContent className="py-8 text-center">
                        <p className="text-slate-500 font-medium">
                          선택한 유형의 충돌이 없습니다.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-emerald-700 font-medium">
                    등록된 규정들 간에 충돌이 발견되지 않았습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!currentResult && !loading && activeTab === 'scan' && (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Swords className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">아직 탐지 결과가 없습니다.</p>
              <p className="text-sm">충돌 탐지 시작 버튼을 눌러 분석을 시작하세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
