"use client"

import { useState, useEffect } from "react"
import { Wand2, ArrowRight, CheckCircle2, BookOpen, FileDiff, Info, Loader2, Scale, History, Clock, ChevronRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { generateRegulationDraft, type GenerateRegulationDraftOutput } from "@/ai/flows/generate-regulation-draft-flow"
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocument } from "@/firebase"
import { collection, doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

// 디텍팅에서 전달받는 요청 데이터 타입
interface RevisionRequest {
  regulationId: string;
  regulationName: string;
  reason: string;
  sourceArticle: string;
  diff: string;
}

interface RevisionDrafterProps {
  initialRequest?: RevisionRequest | null;
  onComplete?: () => void;
}

// 개정안 버전 (iteration) 타입
interface DraftIteration {
  version: number;
  userInput: string;
  draft: GenerateRegulationDraftOutput;
  createdAt: string;
}

// Firestore 개정안 문서 타입
interface RevisionDraft {
  userId: string;
  regulationId: string;
  regulationName: string;
  initialDirective: string;
  scanId?: string;
  iterations: DraftIteration[];
  createdAt: string;
  updatedAt: string;
}

export function RevisionDrafter({ initialRequest, onComplete }: RevisionDrafterProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [directive, setDirective] = useState("고용노동부 지침: 2026년 4월 1일부터 모든 상시근로자 50인 이상 사업장은 월 1회 의무적으로 '직장 내 괴롭힘 예방 및 대처 심화 교육'을 2시간 이상 실시해야 하며, 이를 취업규칙에 명시해야 한다.");
  const [upgradeInput, setUpgradeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRegulationDraftOutput | null>(null);
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("new");

  // 현재 작업 중인 개정안의 iterations
  const [currentIterations, setCurrentIterations] = useState<DraftIteration[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  // 현재 표시 중인 버전 (버전 전환용)
  const [displayVersion, setDisplayVersion] = useState<number>(1);

  // 이력에서 선택한 개정안
  const [selectedDraft, setSelectedDraft] = useState<(RevisionDraft & { id: string }) | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);

  const regulationsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "regulations");
  }, [db, user]);

  const { data: regulations } = useCollection(regulationsRef);

  // 개정안 이력 구독
  const draftsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, `users/${user.uid}/revisionDrafts`);
  }, [db, user]);

  const { data: draftHistory } = useCollection<RevisionDraft>(draftsRef);

  // 디텍팅에서 전달받은 데이터로 자동 입력
  useEffect(() => {
    if (initialRequest && regulations) {
      setSelectedRegId(initialRequest.regulationId);

      const autoDirective = `[법령 영향 분석 결과에 따른 개정 요청]

개정 대상: ${initialRequest.regulationName}

개정 필요 사유:
${initialRequest.reason}

관련 법령 조문:
${initialRequest.sourceArticle}

현행 vs 개정 법령 차이점:
${initialRequest.diff}`;

      setDirective(autoDirective);
      setResult(null);
      setCurrentIterations([]);
      setCurrentDraftId(null);
      setDisplayVersion(1);
      setActiveTab("new");
    }
  }, [initialRequest, regulations]);

  // 개정안 저장
  const saveDraft = async (output: GenerateRegulationDraftOutput, isUpgrade: boolean) => {
    if (!user || !draftsRef) return;

    const regulation = regulations?.find(r => r.id === selectedRegId);
    const now = new Date().toISOString();

    if (isUpgrade && currentDraftId && currentIterations.length > 0) {
      // 기존 문서에 iteration 추가 (updateDoc 사용)
      const newIteration: DraftIteration = {
        version: currentIterations.length + 1,
        userInput: upgradeInput,
        draft: output,
        createdAt: now,
      };
      const newIterations = [...currentIterations, newIteration];
      setCurrentIterations(newIterations);
      setDisplayVersion(newIteration.version); // 새 버전으로 표시

      try {
        // 기존 문서 업데이트
        const docRef = doc(db, `users/${user.uid}/revisionDrafts`, currentDraftId);
        await updateDoc(docRef, {
          iterations: newIterations,
          updatedAt: now,
        });
      } catch (error) {
        console.error("Failed to update draft:", error);
      }
    } else {
      // 새 개정안 문서 생성
      const newIteration: DraftIteration = {
        version: 1,
        userInput: directive,
        draft: output,
        createdAt: now,
      };

      const draftData: RevisionDraft = {
        userId: user.uid,
        regulationId: selectedRegId,
        regulationName: regulation?.fileName || "알 수 없음",
        initialDirective: directive,
        iterations: [newIteration],
        createdAt: now,
        updatedAt: now,
      };

      try {
        const docRef = await addDocument(draftsRef, draftData);
        setCurrentDraftId(docRef.id);
        setCurrentIterations([newIteration]);
        setDisplayVersion(1);
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    }
  };

  // 첫 개정안 생성
  const handleGenerate = async () => {
    if (!directive.trim()) {
      toast({
        variant: "destructive",
        title: "입력 부족",
        description: "변경 지침 또는 요구사항을 입력해주세요."
      });
      return;
    }

    const baseRegulation = regulations?.find(r => r.id === selectedRegId);
    if (!baseRegulation) {
      toast({
        variant: "destructive",
        title: "규정 미선택",
        description: "개정 대상이 될 규정을 라이브러리에서 선택해주세요."
      });
      return;
    }

    const contextContent = baseRegulation.content || "내용 없음";

    setLoading(true);
    setResult(null);
    try {
      const output = await generateRegulationDraft({
        newLawDirective: directive,
        existingRegulationContent: contextContent
      });
      setResult(output);

      // 저장
      await saveDraft(output, false);

      toast({
        title: "분석 완료",
        description: "개정안 v1이 생성되어 이력에 저장되었습니다."
      });

      if (initialRequest) {
        onComplete?.();
      }
    } catch (error: any) {
      console.error("Revision Drafter Generate Error:", error);
      setResult(null);
      toast({
        variant: "destructive",
        title: "생성 실패",
        description: error.message || "개정안을 분석하는 중 오류가 발생했습니다."
      });
    } finally {
      setLoading(false);
    }
  };

  // 개정안 업그레이드
  const handleUpgrade = async () => {
    if (!upgradeInput.trim()) {
      toast({
        variant: "destructive",
        title: "입력 부족",
        description: "업그레이드 요구사항을 입력해주세요."
      });
      return;
    }

    if (currentIterations.length === 0 || !result) {
      toast({
        variant: "destructive",
        title: "이전 버전 없음",
        description: "먼저 개정안을 생성해주세요."
      });
      return;
    }

    const baseRegulation = regulations?.find(r => r.id === selectedRegId);
    const contextContent = baseRegulation?.content || "내용 없음";

    // 이전 버전의 draft를 문자열로 변환
    const previousDraftText = result.comparisonTable.map(item =>
      `${item.section}\n[개정 전] ${item.before}\n[개정 후] ${item.after}`
    ).join("\n\n");

    setLoading(true);
    try {
      const output = await generateRegulationDraft({
        newLawDirective: directive,
        existingRegulationContent: contextContent,
        previousDraft: previousDraftText,
        upgradeRequest: upgradeInput,
      });
      setResult(output);

      // 저장
      await saveDraft(output, true);

      toast({
        title: "업그레이드 완료",
        description: `개정안 v${currentIterations.length + 1}이 생성되었습니다.`
      });

      setUpgradeInput("");
    } catch (error: any) {
      console.error("Revision Upgrade Error:", error);
      toast({
        variant: "destructive",
        title: "업그레이드 실패",
        description: error.message || "개정안 업그레이드 중 오류가 발생했습니다."
      });
    } finally {
      setLoading(false);
    }
  };

  // 이력에서 개정안 선택
  const handleSelectDraft = (draft: RevisionDraft & { id: string }) => {
    setSelectedDraft(draft);
    setSelectedVersion(draft.iterations.length);
  };

  // 이력에서 작업 이어가기
  const handleContinueFromHistory = (draft: RevisionDraft & { id: string }) => {
    setSelectedRegId(draft.regulationId);
    setDirective(draft.initialDirective);
    setCurrentIterations(draft.iterations);
    setCurrentDraftId(draft.id);
    const lastIteration = draft.iterations[draft.iterations.length - 1];
    setResult(lastIteration.draft);
    setDisplayVersion(lastIteration.version);
    setActiveTab("new");
    setSelectedDraft(null);
    toast({
      title: "작업 이어가기",
      description: `v${draft.iterations.length}에서 작업을 이어갑니다.`
    });
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

  // 이력 정렬 (최신순)
  const sortedHistory = draftHistory?.slice().sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // 선택된 이력의 표시할 버전
  const displayDraft = selectedDraft
    ? selectedDraft.iterations.find(i => i.version === selectedVersion)?.draft
    : null;

  // 현재 버전 번호
  const currentVersion = currentIterations.length || 0;

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileDiff className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">개정안 추천</h2>
          {initialRequest && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Scale className="w-3 h-3" />
              <span>법령 영향 스캔에서 연결됨</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">개정 대상 규정 선택:</span>
          <Select value={selectedRegId} onValueChange={setSelectedRegId}>
            <SelectTrigger className="w-[200px] h-8 text-xs border-none shadow-none focus:ring-0">
              <SelectValue placeholder="라이브러리에서 선택..." />
            </SelectTrigger>
            <SelectContent>
              {regulations?.map(reg => (
                <SelectItem key={reg.id} value={reg.id} className="text-xs">
                  {reg.fileName}
                </SelectItem>
              ))}
              {(!regulations || regulations.length === 0) && (
                <SelectItem value="none" disabled>먼저 규정을 업로드하세요</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="new" className="flex items-center space-x-2">
            <Wand2 className="w-4 h-4" />
            <span>새 개정안 작성</span>
            {currentVersion > 0 && (
              <Badge variant="secondary" className="ml-1">v{currentVersion}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>개정안 이력</span>
            {sortedHistory && sortedHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1">{sortedHistory.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 새 개정안 탭 */}
        <TabsContent value="new" className="space-y-6">
          {/* Input Card */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-semibold text-slate-700">
                {currentVersion === 0 ? "개정 지침 및 요구사항" : `v${currentVersion} 업그레이드 요청`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {currentVersion === 0 ? (
                <>
                  <Textarea
                    className="w-full min-h-[120px] resize-none border-slate-200 focus-visible:ring-primary text-slate-700 leading-relaxed p-4"
                    placeholder="새로운 법적 요구사항이나 내부 지시사항을 입력하세요..."
                    value={directive}
                    onChange={(e) => setDirective(e.target.value)}
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !selectedRegId}
                    className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                    {loading ? "조항 분석 및 개정안 도출 중..." : "개정안 생성하기 (v1)"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                    <strong>현재 버전:</strong> v{currentVersion} |{" "}
                    <strong>규정:</strong> {regulations?.find(r => r.id === selectedRegId)?.fileName}
                  </div>
                  <Textarea
                    className="w-full min-h-[100px] resize-none border-slate-200 focus-visible:ring-primary text-slate-700 leading-relaxed p-4"
                    placeholder="추가 요구사항이나 수정 피드백을 입력하세요... (예: '교육 시간을 3시간으로 늘려줘', '과태료 조항도 추가해줘')"
                    value={upgradeInput}
                    onChange={(e) => setUpgradeInput(e.target.value)}
                  />
                  <Button
                    onClick={handleUpgrade}
                    disabled={loading || !upgradeInput.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-bold shadow-lg transition-all active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
                    {loading ? "업그레이드 중..." : `개정안 업그레이드 (v${currentVersion} → v${currentVersion + 1})`}
                  </Button>
                </>
              )}
              {!selectedRegId && (
                <div className="flex items-center justify-center space-x-2 text-rose-500 animate-pulse">
                  <Info className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">상단에서 개정할 대상 규정을 먼저 선택해주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-300">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
              <p className="text-slate-500 font-medium animate-pulse">기존 규정 조항을 스캔하고 변경 지침을 매핑하고 있습니다...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Comparison Table */}
              <Card className="overflow-hidden border-slate-200 shadow-xl">
                <CardHeader className="bg-slate-900 text-white p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
                      신구조문 대비표 (추천 초안)
                    </CardTitle>
                    <Badge variant="outline" className="text-white border-white/20">
                      Draft v{displayVersion}
                    </Badge>
                  </div>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[20%] font-bold text-slate-800 border-r">조항명</TableHead>
                      <TableHead className="w-[40%] font-bold text-slate-800 border-r">현행 (기존)</TableHead>
                      <TableHead className="w-[40%] font-bold text-primary">개정 추천안</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.comparisonTable.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-sm text-slate-700 bg-slate-50/30 border-r align-top py-6">
                          {item.section}
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed text-slate-500 border-r align-top py-6 whitespace-pre-wrap">
                          {item.before}
                        </TableCell>
                        <TableCell className="text-sm leading-relaxed text-slate-900 font-medium bg-primary/5 align-top py-6 whitespace-pre-wrap">
                          {item.after}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-md">
                  <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">주요 변경 요약</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ul className="space-y-3">
                      {result.summaryOfChanges.map((change, i) => (
                        <li key={i} className="flex items-start space-x-3 text-sm text-slate-700">
                          <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5 shadow-md">
                  <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="text-xs font-bold text-primary uppercase tracking-widest">개정 근거 (Rationale)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{result.rationale}"
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Version History */}
              {currentIterations.length > 1 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      버전 히스토리 ({currentIterations.length}개)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      {currentIterations.map((iter) => (
                        <Badge
                          key={iter.version}
                          variant={iter.version === displayVersion ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setDisplayVersion(iter.version);
                            setResult(iter.draft);
                          }}
                        >
                          v{iter.version}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!result && !loading && currentVersion === 0 && (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <FileDiff className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">아직 생성된 추천안이 없습니다.</p>
                <p className="text-sm">규정을 선택하고 지침을 입력한 뒤 버튼을 눌러주세요.</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 개정안 이력 탭 */}
        <TabsContent value="history" className="space-y-6">
          {sortedHistory && sortedHistory.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 이력 리스트 */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  저장된 개정안
                </h3>
                {sortedHistory.map((draft) => (
                  <Card
                    key={draft.id}
                    className={`shadow-sm border-slate-200 cursor-pointer transition-all hover:shadow-md ${
                      selectedDraft?.id === draft.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectDraft(draft)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800 truncate">
                          {draft.regulationName}
                        </span>
                        <Badge variant="secondary">v{draft.iterations.length}</Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(draft.updatedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 선택된 개정안 상세 */}
              <div className="lg:col-span-2">
                {selectedDraft ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{selectedDraft.regulationName}</h3>
                        <p className="text-sm text-slate-500">
                          {selectedDraft.iterations.length}개 버전 | 마지막 수정: {formatDate(selectedDraft.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleContinueFromHistory(selectedDraft)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        작업 이어가기
                      </Button>
                    </div>

                    {/* 버전 선택 */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-500">버전:</span>
                      {selectedDraft.iterations.map((iter) => (
                        <Badge
                          key={iter.version}
                          variant={iter.version === selectedVersion ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setSelectedVersion(iter.version)}
                        >
                          v{iter.version}
                        </Badge>
                      ))}
                    </div>

                    {/* 선택된 버전 표시 */}
                    {displayDraft && (
                      <Card className="overflow-hidden border-slate-200 shadow-lg">
                        <CardHeader className="bg-slate-900 text-white p-4">
                          <CardTitle className="text-base font-bold flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" />
                            신구조문 대비표
                            <Badge variant="outline" className="text-white border-white/20 ml-2">
                              v{selectedVersion}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-[20%] font-bold text-slate-800 border-r text-xs">조항명</TableHead>
                              <TableHead className="w-[40%] font-bold text-slate-800 border-r text-xs">현행</TableHead>
                              <TableHead className="w-[40%] font-bold text-primary text-xs">개정안</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayDraft.comparisonTable.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium text-xs text-slate-700 bg-slate-50/30 border-r align-top py-3">
                                  {item.section}
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 border-r align-top py-3 whitespace-pre-wrap">
                                  {item.before}
                                </TableCell>
                                <TableCell className="text-xs text-slate-900 bg-primary/5 align-top py-3 whitespace-pre-wrap">
                                  {item.after}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-4 border-2 border-dashed border-slate-200 rounded-3xl">
                    <ChevronRight className="w-8 h-8" />
                    <p className="text-sm">왼쪽에서 개정안을 선택하세요</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-4 border-2 border-dashed border-slate-200 rounded-3xl">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <History className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-bold">저장된 개정안이 없습니다.</p>
                <p className="text-sm">"새 개정안 작성" 탭에서 개정안을 생성해보세요.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
