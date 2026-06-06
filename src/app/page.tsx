"use client"

import { useState, useEffect } from "react"
import {
  Book, PenTool, FileSearch, MessageSquare, Shield,
  User, ChevronDown, Sliders, Settings, Loader2,
  RefreshCw, AlertTriangle, LogOut, Scale, Lock, X, LayoutDashboard, Compass, Swords
} from "lucide-react"
import { Dashboard } from "@/components/dashboard"
import { KnowledgeBase } from "@/components/knowledge-base"
import { RevisionDrafter } from "@/components/revision-drafter"
import { JustificationExtractor } from "@/components/justification-extractor"
import { ComplianceChatbot } from "@/components/compliance-chatbot"
import { LawImpactDetector } from "@/components/law-impact-detector"
import { PolicyAlignment } from "@/components/policy-alignment"
import { ConflictDetector } from "@/components/conflict-detector"
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
import { useSession } from "@/contexts/session-context"

type View = 'dashboard' | 'knowledge-base' | 'law-impact' | 'revision-drafter' | 'justification' | 'chatbot' | 'policy-alignment' | 'conflict-detector';

interface RevisionRequest {
  regulationId: string;
  regulationName: string;
  reason: string;
  sourceArticle: string;
  diff: string;
}

export default function RegulMateApp() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [strictness, setStrictness] = useState(75);
  const [showSecurityBanner, setShowSecurityBanner] = useState(true);
  const [revisionRequest, setRevisionRequest] = useState<RevisionRequest | null>(null);

  const { regulations, drafts, scans } = useSession();

  const handleRequestRevision = (data: RevisionRequest) => {
    setRevisionRequest(data);
    setCurrentView('revision-drafter');
  };

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
      const id = setTimeout(() => setAuthTimeout(false), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setAuthTimeout(true), 8000);
    return () => clearTimeout(id);
  }, [isUserLoading]);

  // 데이터가 있을 때 페이지 이탈 시 경고 (브라우저 네이티브 다이얼로그)
  useEffect(() => {
    const hasData = regulations.length > 0 || drafts.length > 0 || scans.length > 0;
    if (!hasData) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [regulations.length, drafts.length, scans.length]);

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
    { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: '대시보드' },
    { id: 'knowledge-base', icon: <Book className="w-5 h-5" />, label: '규정 라이브러리' },
    { id: 'law-impact', icon: <Scale className="w-5 h-5" />, label: '법령 영향 스캔' },
    { id: 'revision-drafter', icon: <PenTool className="w-5 h-5" />, label: '개정안 추천' },
    { id: 'chatbot', icon: <MessageSquare className="w-5 h-5" />, label: '컴플라이언스 챗봇' },
    { id: 'justification', icon: <FileSearch className="w-5 h-5" />, label: '개정 근거 추출' },
  ];

  const viewTitles: Record<View, string> = {
    'dashboard': '대시보드',
    'knowledge-base': '규정 라이브러리',
    'law-impact': '법령 영향 스캔',
    'revision-drafter': '개정안 추천 서비스',
    'justification': '개정 근거 추출',
    'chatbot': '컴플라이언스 챗봇',
    'policy-alignment': '경영 방향성 규정 정렬',
    'conflict-detector': '규정 충돌 탐지',
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900">

      {/* Left Sidebar */}
      <aside className="w-80 bg-slate-900 text-slate-100 flex flex-col justify-between flex-shrink-0 z-20 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-headline font-bold tracking-tight text-white">RegulMate</span>
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

            {/* 경영 전략 모듈 */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">경영 전략 모듈</div>
              <button
                onClick={() => setCurrentView('policy-alignment')}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group",
                  currentView === 'policy-alignment'
                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className={cn("transition-colors duration-300", currentView === 'policy-alignment' ? "text-white" : "group-hover:text-primary")}>
                    <Compass className="w-5 h-5" />
                  </span>
                  <span className="font-semibold text-sm tracking-tight">경영 방향성 정렬</span>
                </div>
                {currentView === 'policy-alignment' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
              </button>
              <button
                onClick={() => setCurrentView('conflict-detector')}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group",
                  currentView === 'conflict-detector'
                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className={cn("transition-colors duration-300", currentView === 'conflict-detector' ? "text-white" : "group-hover:text-primary")}>
                    <Swords className="w-5 h-5" />
                  </span>
                  <span className="font-semibold text-sm tracking-tight">규정 충돌 탐지</span>
                </div>
                {currentView === 'conflict-detector' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
              </button>
            </div>

            <Separator className="bg-slate-800" />

            {/* 챗봇 정확도 설정 */}
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

            {/* 보안 정책 안내 */}
            <div className="px-2">
              <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em]">보안 세션 활성화</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  업로드 파일 및 작업 내용은 브라우저 메모리에만 저장됩니다. 사이트 이탈 시 모든 데이터가 자동으로 완전 삭제됩니다.
                </p>
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
              <span className="text-[10px] text-slate-500">ID: {user?.uid.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Global Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 z-10 sticky top-0">
          <div className="flex flex-col">
            <h1 className="text-xl font-headline font-bold text-slate-800 capitalize tracking-tight">
              {viewTitles[currentView]}
            </h1>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              <span>워크스페이스</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-primary">테크코프 글로벌 (TechCorp Global)</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* 세션 보안 배지 */}
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm">
              <Lock className="w-4 h-4" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-bold uppercase tracking-wider">세션 전용 보안</span>
                <span className="text-[10px] font-medium opacity-70">이탈 시 자동 삭제</span>
              </div>
            </div>

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

        {/* 보안 안내 배너 */}
        {showSecurityBanner && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-10 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                <span className="font-bold">보안 세션 모드:</span> 업로드된 규정 파일과 모든 작업 내용은 서버에 저장되지 않으며, 브라우저를 닫거나 페이지를 이탈하면 즉시 삭제됩니다.
                결과물을 보관하려면 <span className="font-bold">개정안 다운로드</span> 기능을 이용하세요.
              </p>
            </div>
            <button
              onClick={() => setShowSecurityBanner(false)}
              className="ml-4 p-1 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0"
              title="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Modules */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {currentView === 'dashboard' && <Dashboard onNavigate={(v) => setCurrentView(v)} />}
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
            {currentView === 'policy-alignment' && <PolicyAlignment />}
            {currentView === 'conflict-detector' && <ConflictDetector />}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        .prose pre { font-family: 'Source Code Pro', monospace !important; }
      `}</style>
    </div>
  );
}
