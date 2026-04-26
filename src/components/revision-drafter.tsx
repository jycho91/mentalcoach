"use client"

import { useState } from "react"
import { Wand2, ArrowRight, CheckCircle2, BookOpen, FileDiff, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function RevisionDrafter() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [directive, setDirective] = useState("고용노동부 지침: 2026년 4월 1일부터 모든 상시근로자 50인 이상 사업장은 월 1회 의무적으로 '직장 내 괴롭힘 예방 및 대처 심화 교육'을 2시간 이상 실시해야 하며, 이를 취업규칙에 명시해야 한다.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateRegulationDraftOutput | null>(null);
  const [selectedRegId, setSelectedRegId] = useState<string>("");

  const regulationsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "regulations");
  }, [db, user]);
  
  const { data: regulations } = useCollection(regulationsRef);

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
      toast({
        title: "분석 완료",
        description: "개정안 추천 결과가 도출되었습니다."
      });
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

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileDiff className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">개정안 추천</h2>
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

      <div className="grid grid-cols-1 gap-8">
        {/* Input Card */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-semibold text-slate-700">개정 지침 및 요구사항</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
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
              {loading ? "조항 분석 및 개정안 도출 중..." : "개정안 생성하기"}
            </Button>
            {!selectedRegId && (
              <div className="flex items-center justify-center space-x-2 text-rose-500 animate-pulse">
                <Info className="w-4 h-4" />
                <p className="text-xs font-bold uppercase tracking-wider">상단에서 개정할 대상 규정을 먼저 선택해주세요.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Area */}
        <div className="space-y-6">
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
                    <Badge variant="outline" className="text-white border-white/20">Draft v1.0</Badge>
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
            </div>
          )}

          {!result && !loading && (
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
        </div>
      </div>
    </div>
  )
}
