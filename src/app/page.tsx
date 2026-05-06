"use client"

import { useState, useEffect } from "react"
import {
  Book, PenTool, FileSearch, MessageSquare, Shield,
  ShieldOff, User, ChevronDown, Sliders, Settings, Loader2,
  RefreshCw, AlertTriangle, LogOut, Scale
} from "lucide-react"
import { KnowledgeBase } from "@/components/knowledge-base"
import { RevisionDrafter } from "@/components/revision-drafter"
import { JustificationExtractor } from "@/components/justification-extractor"
import { ComplianceChatbot } from "@/components/compliance-chatbot"
import { LawImpactDetector } from "@/components/law-impact-detector"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth, useUser, initiateAnonymousSignIn, initiateSignOut } from "@/firebase"

type View = 'knowledge-base' | 'law-impact' | 'revision-drafter' | 'justification' | 'chatbot';

// 개정안 추천 요청 데이터 타입
interface RevisionRequest {
  regulationId: string;
  regulationName: string;
  reason: string;
  sourceArticle: string;
  diff: string;
}

export default function ReguMateApp() {
  const [currentView, setCurrentView] = useState<View>('knowledge-base');
  const [privacyMode, setPrivacyMode] = useState(true);
  const [strictness, setStrictness] = useState(75);

  // 디텍팅 → 개정안 추천 연결용 상태
  const [revisionRequest, setRevisionRequest] = useState<RevisionRequest | null>(null);

  // 개정안 추천 요청 핸들러
  const handleRequestRevision = (data: RevisionRequest) => {
    setRevisionRequest(data);
    setCurrentView('revision-drafter');
  };

  // 개정안 추천 완료 후 초기화
  const handleRevisionComplete = () => {
    setRevisionRequest(null);
  };
  
  const auth = useAuth();
  const { user, isUserLoading, userError } = useUser();
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  useEffect(() => {
    if (!isUserLoading) {
      setAuthTimeout(false);
      return;
    }
    const id = setTimeout(() => setAuthTimeout(true), 8000);
    return () => clearTimeout(id);
  }, [isUserLoading]);

  if (isUserLoading || userError) {
    const showError = authTimeout || !!userError;
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 space-y-4 px-4">
        {showError ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>
            <p className="text-slate-700 font-semibold text-center">세션을 연결할 수 없습니다</p>
            <p className="text-slate-500 text-sm text-center max-w-sm">
              네트워크 연결을 확인한 후 다시 시도해 주세요.
            </p>
            <button
              onClick={() => {
                setAuthTimeout(false);
                initiateAnonymousSignIn(auth);
              }}
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>다시 시도</span>
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-slate-500 font-medium">보안 세션 연결 중...</p>
          </>
        )}
      </div>
    );
  }

  const navItems = [
    { id: 'knowledge-base', icon: <Book className="w-5 h-5" />, label: '규정 라이브러리' },
    { id: 'law-impact', icon: <Scale className="w-5 h-5" />, label: '법령 영향 스캔' },
    { id: 'revision-drafter', icon: <PenTool className="w-5 h-5" />, label: '개정안 추천' },
    { id: 'chatbot', icon: <MessageSquare className="w-5 h-5" />, label: '컴플라이언스 챗봇' },
    { id: 'justification', icon: <FileSearch className="w-5 h-5" />, label: '개정 근거 추출' },
  ];

  const viewTitles: Record<View, string> = {
    'knowledge-base': '규정 라이브러리',
    'law-impact': '법령 영향 스캔',
    'revision-drafter': '개정안 추천 서비스',
    'justification': '개정 근거 추출',
    'chatbot': '컴플라이언스 챗봇'
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900">
      
      {/* 1. Left Sidebar */}
      <aside className="w-80 bg-slate-900 text-slate-100 flex flex-col justify-between flex-shrink-0 z-20 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-headline font-bold tracking-tight text-white">ReguMate</span>
          </div>

          {/* Navigation */}
          <nav className="p-6 flex-1 space-y-8 overflow-y-auto">
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">컴플라이언스 모듈</div>
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group",
                    currentView === item.id 
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <span className={cn("transition-colors duration-300", currentView === item.id ? "text-white" : "group-hover:text-primary")}>
                      {item.icon}
                    </span>
                    <span className="font-semibold text-sm tracking-tight">{item.label}</span>
                  </div>
                  {currentView === item.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                </button>
              ))}
            </div>

            <Separator className="bg-slate-800" />

            {/* Vector DB Settings */}
            <div className="space-y-4 px-2">
              <div className="flex items-center space-x-2 mb-3">
                <Sliders className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">챗봇 정확도 설정</h3>
              </div>
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">정확도</span>
                  <Badge className="bg-primary/20 text-primary border-primary/20 font-code">{strictness}%</Badge>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={strictness}
                  onChange={(e) => setStrictness(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>문맥 위주</span>
                  <span>정확 일치</span>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Workspace Footer */}
        <div className="p-6 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">워크스페이스 설정</span>
              <span className="text-[10px] text-slate-500">ID: {user?.uid.slice(0,8)}...</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Global Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 z-10 sticky top-0">
          <div className="flex flex-col">
            <h1 className="text-xl font-headline font-bold text-slate-800 capitalize tracking-tight flex items-center">
              {viewTitles[currentView]}
            </h1>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              <span>워크스페이스</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-primary">테크코프 글로벌 (TechCorp Global)</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Privacy Mode Toggle */}
            <button 
              onClick={() => setPrivacyMode(!privacyMode)}
              className={cn(
                "flex items-center space-x-3 px-4 py-2 rounded-full border transition-all duration-300 group",
                privacyMode 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm" 
                  : "bg-rose-50 border-rose-100 text-rose-700 shadow-sm"
              )}
            >
              {privacyMode ? (
                <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
              ) : (
                <ShieldOff className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider">프라이버시 보호</span>
                <span className="text-[10px] font-medium opacity-80">{privacyMode ? '활성화됨' : '비활성'}</span>
              </div>
              <div className={cn(
                "w-8 h-4 rounded-full relative transition-colors duration-300",
                privacyMode ? 'bg-emerald-500' : 'bg-rose-500'
              )}>
                <div className={cn(
                  "w-2.5 h-2.5 bg-white rounded-full absolute top-0.75 transition-all duration-300 shadow-sm",
                  privacyMode ? 'left-4.5' : 'left-1'
                )} />
              </div>
            </button>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-4 border-l border-slate-200 pl-8 group cursor-pointer focus:outline-none">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">컴플라이언스 관리자</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enterprise User</span>
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border-2 border-primary/20 group-hover:scale-105 transition-all">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">세션 정보</p>
                    <p className="text-xs text-slate-500 font-mono">ID: {user?.uid.slice(0, 12)}...</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => initiateSignOut(auth)}
                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>로그아웃 (세션 종료)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Modules */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {currentView === 'knowledge-base' && <KnowledgeBase />}
            {currentView === 'law-impact' && <LawImpactDetector onRequestRevision={handleRequestRevision} />}
            {currentView === 'revision-drafter' && (
              <RevisionDrafter
                initialRequest={revisionRequest}
                onComplete={handleRevisionComplete}
              />
            )}
            {currentView === 'justification' && <JustificationExtractor />}
            {currentView === 'chatbot' && <ComplianceChatbot strictness={strictness} />}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
        .prose pre {
          font-family: 'Source Code Pro', monospace !important;
        }
      `}</style>
    </div>
  );
}
