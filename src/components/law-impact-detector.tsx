"use client"

import { useState } from "react"
import { Scale, Scan, AlertTriangle, AlertCircle, Info, Loader2, FileText, Sparkles, History, Clock, ChevronRight, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { detectLawImpact, type DetectLawImpactOutput } from "@/ai/flows/detect-law-impact-flow"
import { SAMPLE_LAWS } from "@/lib/sample-law"
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocument } from "@/firebase"
import { collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

// 개정안 추천 요청 데이터 타입
interface RevisionRequest {
  regulationId: string;
  regulationName: string;
  reason: string;
  sourceArticle: string;
  diff: string;
}

interface LawImpactDetectorProps {
  onRequestRevision?: (data: RevisionRequest) => void;
}

// Firestore 스캔 결과 타입
interface LawImpactScan {
  userId: string;
  scannedAt: string;
  lawText: string;
  lawName?: string;
  regulationCount: number;
  impactedCount: number;
  impacts: Array<{
    regulationId: string;
    regulationName: string;
    impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
    sourceArticle: string;
    diff: string;
  }>;
  summary: string;
}

export function LawImpactDetector({ onRequestRevision }: LawImpactDetectorProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [lawText, setLawText] = useState("");
  const [lawName, setLawName] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectLawImpactOutput | null>(null);
  const [activeTab, setActiveTab] = useState<string>("scan");
  const [selectedScan, setSelectedScan] = useState<(LawImpactScan & { id: string }) | null>(null);

  // regulations 컬렉션 구독
  const regulationsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "regulations");
  }, [db, user]);

  const { data: regulations } = useCollection(regulationsRef);

  // 스캔 이력 구독
  const scansRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, `users/${user.uid}/lawImpactScans`);
  }, [db, user]);

  const { data: scanHistory } = useCollection<LawImpactScan>(scansRef);

  // 스캔 결과를 Firestore에 저장
  const saveScanResult = async (output: DetectLawImpactOutput, scannedLawText: string, scannedLawName?: string) => {
    if (!user || !scansRef) return;

    const scanData: LawImpactScan = {
      userId: user.uid,
      scannedAt: new Date().toISOString(),
      lawText: scannedLawText,
      lawName: scannedLawName,
      regulationCount: regulations?.length || 0,
      impactedCount: output.impactedRegulations.length,
      impacts: output.impactedRegulations.map(r => ({
        regulationId: r.regulationId,
        regulationName: r.regulationName,
        impactLevel: r.impactLevel,
        reason: r.reason,
        sourceArticle: r.sourceArticle,
        diff: r.diff,
      })),
      summary: output.summary,
    };

    try {
      await addDocument(scansRef, scanData);
    } catch (error) {
      console.error("Failed to save scan result:", error);
    }
  };

  // 스캔 실행
  const handleScan = async (textToScan?: string, scanLawName?: string) => {
    const targetText = textToScan || lawText;
    const targetLawName = scanLawName || lawName;

    if (!targetText.trim()) {
      toast({
        variant: "destructive",
        title: "법령 미입력",
        description: "분석할 법령 텍스트를 입력해주세요."
      });
      return;
    }

    if (!regulations || regulations.length === 0) {
      toast({
        variant: "destructive",
        title: "규정 없음",
        description: "라이브러리에 규정을 먼저 등록해주세요."
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setSelectedScan(null);
    try {
      const output = await detectLawImpact({
        newLawText: targetText,
        regulations: regulations.map(r => ({
          id: r.id,
          fileName: r.fileName,
          content: r.content
        }))
      });
      setResult(output);

      // 결과 저장
      await saveScanResult(output, targetText, targetLawName);

      toast({
        title: "스캔 완료",
        description: `${output.impactedRegulations.length}개의 영향받는 규정이 발견되었습니다. 이력에 저장됨.`
      });
    } catch (error: any) {
      console.error("Law Impact Detection Error:", error);
      setResult(null);
      toast({
        variant: "destructive",
        title: "스캔 실패",
        description: error.message || "법령 영향 분석 중 오류가 발생했습니다."
      });
    } finally {
      setLoading(false);
    }
  };

  // 샘플 법령으로 스캔
  const handleSampleScan = () => {
    const sample = SAMPLE_LAWS[0]; // 근로기준법 개정
    setLawText(sample.fullText);
    setLawName(sample.name);
    handleScan(sample.fullText, sample.name);
  };

  // 이력에서 스캔 선택
  const handleSelectScan = (scan: LawImpactScan & { id: string }) => {
    setSelectedScan(scan);
    setResult(null);
  };

  // 영향도별 배지 색상
  const getImpactBadgeVariant = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // 영향도별 아이콘
  const getImpactIcon = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM':
        return <AlertCircle className="w-4 h-4" />;
      case 'LOW':
        return <Info className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // 영향도 레이블
  const getImpactLabel = (level: string) => {
    switch (level) {
      case 'HIGH':
        return '즉시 개정 필요';
      case 'MEDIUM':
        return '검토 필요';
      case 'LOW':
        return '참고 수준';
      default:
        return level;
    }
  };

  // 날짜 포맷
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 현재 표시할 결과 (새 스캔 결과 또는 선택된 이력)
  const displayResult = result || (selectedScan ? {
    impactedRegulations: selectedScan.impacts,
    summary: selectedScan.summary,
    scanTimestamp: selectedScan.scannedAt
  } : null);

  // 이력 정렬 (최신순)
  const sortedHistory = scanHistory?.slice().sort((a, b) =>
    new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Scale className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">법령 영향 스캔</h2>
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            등록된 규정: {regulations?.length || 0}개
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="scan" className="flex items-center space-x-2">
            <Scan className="w-4 h-4" />
            <span>새 스캔</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>스캔 이력</span>
            {sortedHistory && sortedHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1">{sortedHistory.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 새 스캔 탭 */}
        <TabsContent value="scan" className="space-y-6">
          {/* Input Card */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700">법령 텍스트 입력</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSampleScan}
                  disabled={loading}
                  className="h-8 text-xs font-bold"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  샘플 법령으로 스캔
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Textarea
                className="w-full min-h-[200px] resize-none border-slate-200 focus-visible:ring-primary text-slate-700 leading-relaxed p-4 font-mono text-sm"
                placeholder="분석할 법령 텍스트를 붙여넣으세요...&#10;&#10;예: 제76조의2(직장 내 괴롭힘 예방교육)&#10;① 사업주는 직장 내 괴롭힘 예방 및 대처를 위한 교육을 실시하여야 한다..."
                value={lawText}
                onChange={(e) => setLawText(e.target.value)}
              />
              <Button
                onClick={() => handleScan()}
                disabled={loading || !lawText.trim()}
                className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Scan className="w-5 h-5 mr-2" />}
                {loading ? "규정 분석 중..." : "스캔 실행"}
              </Button>
              {(!regulations || regulations.length === 0) && (
                <div className="flex items-center justify-center space-x-2 text-amber-600 animate-pulse">
                  <Info className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">규정 라이브러리에 규정을 먼저 등록해주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 스캔 이력 탭 */}
        <TabsContent value="history" className="space-y-6">
          {sortedHistory && sortedHistory.length > 0 ? (
            <div className="space-y-3">
              {sortedHistory.map((scan) => (
                <Card
                  key={scan.id}
                  className={`shadow-sm border-slate-200 cursor-pointer transition-all hover:shadow-md ${
                    selectedScan?.id === scan.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectScan(scan)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {formatDate(scan.scannedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate max-w-md">
                          {scan.lawName || scan.lawText.slice(0, 50) + "..."}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={scan.impactedCount > 0 ? "default" : "secondary"}>
                          영향 {scan.impactedCount}건
                        </Badge>
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
                <p className="font-bold">스캔 이력이 없습니다.</p>
                <p className="text-sm">"새 스캔" 탭에서 법령 영향 스캔을 실행해보세요.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Result Area (양쪽 탭에서 공유) */}
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-300">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
            <p className="text-slate-500 font-medium animate-pulse">
              {regulations?.length || 0}개의 사내 규정을 법령과 대조 분석하고 있습니다...
            </p>
          </div>
        )}

        {/* Results */}
        {displayResult && !loading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 이력에서 선택한 경우 표시 */}
            {selectedScan && (
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <History className="w-4 h-4" />
                <span>스캔 시점: {formatDate(selectedScan.scannedAt)}</span>
                {selectedScan.lawName && (
                  <>
                    <span>|</span>
                    <span>{selectedScan.lawName}</span>
                  </>
                )}
              </div>
            )}

            {/* Summary Card */}
            <Card className="border-primary/20 bg-primary/5 shadow-md">
              <CardHeader className="pb-3 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">
                    스캔 결과 요약
                  </CardTitle>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {displayResult.impactedRegulations.length}개 영향
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {displayResult.summary}
                </p>
              </CardContent>
            </Card>

            {/* Impacted Regulations List */}
            {displayResult.impactedRegulations.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  영향받는 규정 목록
                </h3>
                {displayResult.impactedRegulations.map((impact, idx) => (
                  <Card key={idx} className="shadow-md border-slate-200 overflow-hidden">
                    <CardHeader className="pb-3 bg-slate-50/80 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <CardTitle className="text-base font-bold text-slate-800">
                            {impact.regulationName}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={getImpactBadgeVariant(impact.impactLevel)}
                          className="flex items-center space-x-1"
                        >
                          {getImpactIcon(impact.impactLevel)}
                          <span>{getImpactLabel(impact.impactLevel)}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Reason */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          개정 필요 사유
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {impact.reason}
                        </p>
                      </div>

                      {/* Source Article */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          관련 법령 조문
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed font-mono italic">
                          "{impact.sourceArticle}"
                        </p>
                      </div>

                      {/* Diff */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          현행 vs 개정 법령 차이점
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-200">
                          {impact.diff}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => onRequestRevision?.({
                            regulationId: impact.regulationId,
                            regulationName: impact.regulationName,
                            reason: impact.reason,
                            sourceArticle: impact.sourceArticle,
                            diff: impact.diff,
                          })}
                        >
                          <PenTool className="w-4 h-4 mr-2" />
                          개정안 추천
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-emerald-700 font-medium">
                    이 법령으로 인해 영향받는 사내 규정이 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State (새 스캔 탭에서만) */}
        {!displayResult && !loading && activeTab === 'scan' && (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Scale className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">아직 스캔 결과가 없습니다.</p>
              <p className="text-sm">법령 텍스트를 입력하고 스캔을 실행해주세요.</p>
              <p className="text-xs mt-2">또는 [샘플 법령으로 스캔] 버튼으로 빠르게 테스트해보세요.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
