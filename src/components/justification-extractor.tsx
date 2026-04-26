"use client"

import { useState } from "react"
import { FileSearch, Sparkles, AlertCircle, Goal, Zap, BookOpen, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { summarizeRegulationRevision, type SummarizeRegulationRevisionOutput } from "@/ai/flows/summarize-regulation-revision-flow"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export function JustificationExtractor() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [draft, setDraft] = useState("");
  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummarizeRegulationRevisionOutput | null>(null);

  const regulationsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "regulations");
  }, [db, user]);
  
  const { data: regulations } = useCollection(regulationsRef);

  const handleSummarize = async () => {
    if (!draft.trim()) {
      toast({
        variant: "destructive",
        title: "입력 부족",
        description: "개정할 문구 또는 초안 내용을 입력해주세요."
      });
      return;
    }

    if (!selectedRegId) {
      toast({
        variant: "destructive",
        title: "규정 미선택",
        description: "개정의 대상이 되는 기존 규정을 선택해주세요."
      });
      return;
    }

    setLoading(true);
    setSummary(null);
    try {
      const baseReg = regulations?.find(r => r.id === selectedRegId);
      const fullPrompt = `[기존 규정 명칭: ${baseReg?.fileName}]\n[개정 문구 및 초안]:\n${draft}`;
      
      const output = await summarizeRegulationRevision({ revisedRegulation: fullPrompt });
      setSummary(output);
      toast({
        title: "분석 완료",
        description: "경영진 보고용 개정 근거가 추출되었습니다."
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "분석 실패",
        description: "AI 분석 중 오류가 발생했습니다."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-2">
          <FileSearch className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-headline font-bold tracking-tight text-slate-900">
          경영진 보고용 개정 근거 추출
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto font-medium">
          어떤 규정을 왜 바꾸는지, 주요 골자는 무엇인지 AI가 분석하여 보고서 형식으로 요약합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-xl border-slate-200 bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">1. 개정 대상 규정 선택</span>
                <Select value={selectedRegId} onValueChange={setSelectedRegId}>
                  <SelectTrigger className="w-[250px] bg-white border-slate-200">
                    <SelectValue placeholder="라이브러리에서 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {regulations?.map(reg => (
                      <SelectItem key={reg.id} value={reg.id}>{reg.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                2. 개정하려는 문구 또는 초안 입력
              </label>
              <Textarea 
                className="min-h-[200px] text-base p-6 bg-slate-50/50 border-slate-200 focus:ring-primary shadow-inner rounded-2xl resize-none"
                placeholder="예: 제 12조 (식대 지원) 항을 '일 1만원에서 1.5만원'으로 상향 조정하고, 법인카드 사용을 원칙으로 함..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSummarize} 
              disabled={loading || !selectedRegId}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Zap className="w-6 h-6 mr-3 text-amber-400 fill-amber-400" />}
              {loading ? "규정 및 개정 문구 분석 중..." : "개정 사유 및 주요 골자 생성"}
            </Button>
            {!selectedRegId && (
              <p className="text-center text-xs font-bold text-rose-500 uppercase tracking-widest animate-pulse">
                분석을 위해 상단에서 대상 규정을 먼저 선택해주세요.
              </p>
            )}
          </CardContent>
        </Card>

        {summary && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white rounded-3xl border border-slate-200 p-10 shadow-2xl space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <FileSearch className="w-32 h-32" />
              </div>
              
              <div className="border-b border-slate-100 pb-6">
                <h3 className="text-2xl font-headline font-bold text-slate-900">보고서: 규정 개정 근거 요약</h3>
                <p className="text-sm text-slate-400 mt-1 font-medium uppercase tracking-widest">ReguMate AI Compliance Analysis Report</p>
              </div>

              <div className="grid grid-cols-1 gap-10">
                <section className="space-y-4">
                  <div className="flex items-center space-x-3 text-primary">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Goal className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold tracking-tight">개정 사유 및 필요성</h4>
                  </div>
                  <div className="text-slate-700 text-lg leading-relaxed bg-primary/5 p-8 rounded-2xl border border-primary/10 shadow-sm">
                    {summary.reasonForRevision}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center space-x-3 text-emerald-600">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold tracking-tight">개정 주요 골자 (Key Highlights)</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {summary.keyChanges.map((change, i) => (
                      <div key={i} className="flex items-start space-x-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-slate-800 font-semibold shadow-sm transition-transform hover:translate-x-1">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <span className="text-base">{change}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center space-x-3 text-rose-600">
                    <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold tracking-tight">현행 규칙의 한계 및 문제점</h4>
                  </div>
                  <div className="text-slate-700 text-base leading-relaxed bg-rose-50/50 p-6 rounded-2xl border border-rose-100 italic">
                    {summary.limitationOfCurrentRule}
                  </div>
                </section>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>내부 보고용 자료</span>
                <span>Generated by ReguMate AI</span>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-primary opacity-30" />
              <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-slate-700">개정 타당성 분석 중...</p>
              <p className="text-sm text-slate-400 font-medium">기존 조항의 한계점을 파악하고 개정의 논리를 구축하고 있습니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
