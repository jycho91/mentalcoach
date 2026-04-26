"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, Send, Bot, User, Loader2, Info, AlertCircle, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { answerComplianceQuestion } from "@/ai/flows/answer-compliance-question"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface Message {
  role: 'user' | 'ai';
  text: string;
  reference?: string;
  crossImpact?: string;
}

export function ComplianceChatbot({ strictness = 75 }: { strictness?: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const db = useFirestore();
  const { user } = useUser();

  const regulationsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "regulations");
  }, [db, user]);

  const { data: regulations, isLoading: isDbLoading } = useCollection(regulationsRef);

  // 초기 메시지 설정 (데이터 로드 완료 후 정확한 수치 반영)
  useEffect(() => {
    if (!isDbLoading && regulations !== null && messages.length === 0) {
      const regCount = regulations.length;
      setMessages([
        { 
          role: 'ai', 
          text: `안녕하세요! ReguMate 수석 컴플라이언스 분석관입니다. 현재 라이브러리에 등록된 ${regCount}개의 모든 규정을 심층 분석하여, 조항 개정 시 발생할 수 있는 위임전결 리스크와 타 규정과의 정합성을 정밀 진단해 드립니다.` 
        }
      ]);
    }
  }, [isDbLoading, regulations, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!regulations || regulations.length === 0) {
      const userMsg: Message = { role: 'user', text: input };
      const aiMsg: Message = { 
        role: 'ai', 
        text: "현재 규정 라이브러리에 분석할 데이터가 없습니다. 먼저 [규정 라이브러리] 메뉴에서 PDF 규정을 업로드해 주세요." 
      };
      setMessages(prev => [...prev, userMsg, aiMsg]);
      setInput("");
      return;
    }

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      // 키워드 추출 및 관련 규정 스코어링
      const keywords = currentInput.split(' ').filter(word => word.length > 1);
      
      const scoredRegulations = regulations.map(reg => {
        let score = 0;
        const content = (reg.content || "").toLowerCase();
        const fileName = (reg.fileName || "").toLowerCase();
        
        keywords.forEach(keyword => {
          const lowerK = keyword.toLowerCase();
          if (fileName.includes(lowerK)) score += 50; 
          if (content.includes(lowerK)) {
            const matches = content.match(new RegExp(lowerK, 'g'));
            score += (matches ? Math.min(matches.length, 100) : 0);
          }
        });

        // 컴플라이언스 핵심 키워드 가중치
        const criticalTerms = ["위임", "전결", "권한", "절차", "이사회", "승인", "보고", "자산", "처분", "기준", "한도"];
        criticalTerms.forEach(term => {
          if (content.includes(term)) score += 15;
          if (fileName.includes(term)) score += 30;
        });
        
        return { ...reg, score };
      });

      // 관련도 높은 순으로 정렬하여 상위 30개 문서 추출 (전수 대조 분석 범위 확장)
      const topRegulations = scoredRegulations
        .sort((a, b) => b.score - a.score)
        .filter(reg => reg.score > 0)
        .slice(0, 30);

      // 만약 키워드 매칭이 적다면 기본적으로 최신순 또는 전체 중 일부라도 포함
      const finalSelection = topRegulations.length < 5 
        ? scoredRegulations.slice(0, 10) 
        : topRegulations;

      const knowledgeBaseSnippets = finalSelection.map(reg => {
        // AI가 읽을 수 있도록 각 문서의 핵심 내용을 8000자 내외로 추출
        const truncatedContent = reg.content?.substring(0, 8000) || "";
        return `[문서명: ${reg.fileName}]\n${truncatedContent}\n---`;
      });

      const response = await answerComplianceQuestion({
        question: currentInput,
        knowledgeBaseContent: knowledgeBaseSnippets,
        strictness: strictness
      });

      const aiMessage: Message = { 
        role: 'ai', 
        text: response.answer, 
        reference: response.documentReference,
        crossImpact: response.crossImpactAnalysis
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Chatbot Error:', error);
      let errorText = error.message || "규정 간 상호 영향도를 분석하는 중 오류가 발생했습니다.";
      
      if (error.message?.includes("429") || error.message?.includes("QUOTA")) {
        toast({
          variant: "destructive",
          title: "AI 서비스 할당량 초과",
          description: "현재 분석 요청이 너무 많습니다. 약 1분 후 다시 시도해 주세요."
        });
        errorText = "현재 분석할 규정 데이터가 너무 방대하거나 요청이 많아 AI 할당량을 초과했습니다. 잠시 후 다시 시도하시거나, 질문 범위를 좁혀주세요.";
      }
      
      setMessages(prev => [...prev, { role: 'ai', text: errorText }]);
    } finally {
      setLoading(false);
    }
  };

  const regCount = regulations?.length || 0;

  return (
    <div className="h-full max-w-4xl mx-auto flex flex-col bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 transform -rotate-3 transition-transform hover:rotate-0">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xl tracking-tight">수석 컴플라이언스 감사관</h3>
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <p className="text-xs text-slate-400 font-medium">
                {isDbLoading ? '규정 데이터 로드 중...' : `${regCount}개 규정 전수 대조 및 상호 영향 분석 중`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Deep Contrastive Engine v2.0</span>
        </div>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 bg-slate-50/30">
        <div className="p-8 space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "flex max-w-[85%] space-x-3",
                msg.role === 'user' ? "flex-row-reverse space-x-reverse" : "flex-row"
              )}>
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm border",
                  msg.role === 'user' ? "bg-white text-slate-600 border-slate-200" : "bg-primary text-white border-primary"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div className="space-y-3">
                  <div className={cn(
                    "p-5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all whitespace-pre-wrap",
                    msg.role === 'user' 
                      ? "bg-slate-900 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                  )}>
                    {msg.text}
                  </div>
                  
                  {msg.crossImpact && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-2 animate-in zoom-in-95 duration-500">
                      <div className="flex items-center space-x-2 text-amber-700">
                        <Zap className="w-3.5 h-3.5 fill-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">감사관의 심층 리스크 진단</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        {msg.crossImpact}
                      </p>
                    </div>
                  )}

                  {msg.reference && (
                    <div className="flex items-center space-x-2 px-1">
                      <div className="bg-primary/10 px-2 py-1 rounded-md flex items-center space-x-1.5 border border-primary/10">
                        <Info className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          분석 근거: {msg.reference}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-500">
              <div className="flex max-w-[85%] space-x-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-primary/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl rounded-tl-none flex items-center space-x-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-sm text-slate-500 font-semibold tracking-tight">전체 {regCount}개 규정을 대조하여 위임전결 충돌 및 절차적 누락 리스크를 심층 분석 중입니다...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Section */}
      <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.05)]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-center gap-4"
        >
          <div className="flex-1 relative group">
            <Input 
              placeholder="예: 회계규정 61조를 개정하면 위임전결요령의 어떤 조항을 함께 손봐야 하나요?"
              className="w-full pl-6 pr-14 py-8 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-primary focus-visible:ring-offset-2 text-base transition-all group-hover:bg-white group-hover:shadow-md"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isDbLoading}
            />
          </div>
          <Button 
            type="submit"
            disabled={loading || !input.trim() || isDbLoading}
            className="h-16 w-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all flex-shrink-0"
          >
            <Send className="w-7 h-7" />
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-center space-x-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <span className="flex items-center"><Zap className="w-3 h-3 mr-1 text-amber-500" /> 라이브러리 연동 전수 대조 분석 모드</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>규정 간 상호 의존성 정밀 추론</span>
        </div>
      </div>
    </div>
  )
}