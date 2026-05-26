"use client"

import { useMemo, useCallback } from "react"
import {
  Book, Scale, PenTool, MessageSquare, FileSearch,
  Shield, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ChevronRight, BarChart3, Activity, Zap, Gauge, ArrowRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useSession } from "@/contexts/session-context"
import type { SessionScanImpact } from "@/contexts/session-context"
import { cn } from "@/lib/utils"

type NavigableView = 'knowledge-base' | 'law-impact' | 'revision-drafter' | 'justification' | 'chatbot'

interface DashboardProps {
  onNavigate: (view: NavigableView) => void
}

// ─── 날짜 포맷 헬퍼 ──────────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

// ─── 영향도 배지 색상 ─────────────────────────────────────────────────────────
function impactBadgeClass(level: "HIGH" | "MEDIUM" | "LOW") {
  return {
    HIGH: "bg-rose-100 text-rose-700 border-rose-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    LOW: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }[level]
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export function Dashboard({ onNavigate }: DashboardProps) {
  const { regulations, drafts, scans } = useSession()

  // 최근 활동: 스캔 + 초안을 합쳐 최신순 5개
  const recentActivity = useMemo(() => {
    type ActivityItem =
      | { kind: "scan"; id: string; title: string; subtitle: string; at: string; badge?: string; badgeClass?: string }
      | { kind: "draft"; id: string; title: string; subtitle: string; at: string }

    const scanItems: ActivityItem[] = scans.map((s) => ({
      kind: "scan",
      id: s.id,
      title: s.lawName ? `법령 스캔: ${s.lawName}` : "법령 영향 스캔 완료",
      subtitle: `${s.regulationCount}개 규정 검토 · ${s.impactedCount}개 영향 감지`,
      at: s.scannedAt,
      badge: s.impactedCount > 0 ? `${s.impactedCount}건 영향` : "이상 없음",
      badgeClass:
        s.impactedCount > 0
          ? "bg-rose-100 text-rose-700 border-rose-200"
          : "bg-emerald-100 text-emerald-700 border-emerald-200",
    }))

    const draftItems: ActivityItem[] = drafts.map((d) => ({
      kind: "draft",
      id: d.id,
      title: `개정안 작성: ${d.regulationName}`,
      subtitle: `v${d.iterations.length} · ${d.initialDirective.slice(0, 30)}…`,
      at: d.updatedAt,
    }))

    return [...scanItems, ...draftItems]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5)
  }, [scans, drafts])

  // 영향 심각도별 집계
  const impactCounts = useMemo(() => {
    const all = scans.flatMap((s) => s.impacts)
    return {
      high: all.filter((i) => i.impactLevel === "HIGH").length,
      medium: all.filter((i) => i.impactLevel === "MEDIUM").length,
      low: all.filter((i) => i.impactLevel === "LOW").length,
      total: all.length,
    }
  }, [scans])

  // 최고 위험 규정 (HIGH impact 스캔에서 추출)
  const highRiskCount = impactCounts.high

  // 컴플라이언스 건강도 점수 (0-100): HIGH는 -15, MEDIUM은 -5, LOW는 -2
  const healthScore = useMemo(() => {
    if (regulations.length === 0) return null
    const penalty =
      impactCounts.high * 15 + impactCounts.medium * 5 + impactCounts.low * 2
    return Math.max(0, 100 - penalty)
  }, [regulations.length, impactCounts])

  const healthLabel = (score: number) => {
    if (score >= 80) return { text: "양호", color: "text-emerald-600", bar: "bg-emerald-500" }
    if (score >= 60) return { text: "주의", color: "text-amber-600", bar: "bg-amber-500" }
    if (score >= 40) return { text: "경고", color: "text-orange-600", bar: "bg-orange-500" }
    return { text: "위험", color: "text-rose-600", bar: "bg-rose-500" }
  }

  // ─── 스캔 커버리지 (스캔된 규정 / 전체 규정) ─────────────────────────────────
  const scanCoverage = useMemo(() => {
    if (regulations.length === 0) return null
    const scannedIds = new Set(scans.flatMap((s) => s.impacts.map((i) => i.regulationId)))
    const covered = regulations.filter((r) => scannedIds.has(r.id)).length
    return { covered, total: regulations.length, pct: Math.round((covered / regulations.length) * 100) }
  }, [regulations, scans])

  // ─── 상위 위험 규정 (HIGH > MEDIUM, 최대 3개) ─────────────────────────────────
  const topRisks = useMemo((): (SessionScanImpact & { lawName: string })[] => {
    const all = scans.flatMap((s) =>
      s.impacts.map((i) => ({ ...i, lawName: s.lawName ?? "알 수 없는 법령" }))
    )
    const sorted = all.sort((a, b) => {
      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return rank[a.impactLevel] - rank[b.impactLevel]
    })
    // deduplicate by regulationId — keep highest severity
    const seen = new Set<string>()
    return sorted.filter((item) => {
      if (seen.has(item.regulationId)) return false
      seen.add(item.regulationId)
      return true
    }).slice(0, 3)
  }, [scans])

  // ─── 키보드 네비게이션 핸들러 ──────────────────────────────────────────────
  const handleKeyNav = useCallback((e: React.KeyboardEvent, view: NavigableView) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onNavigate(view)
    }
  }, [onNavigate])

  // ─── 통계 카드 데이터 ───────────────────────────────────────────────────────
  const stats = [
    {
      label: "등록 규정",
      value: regulations.length,
      icon: <Book className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      sub: regulations.length > 0 ? `최근 업로드: ${formatRelativeTime(regulations[regulations.length - 1].uploadedAt)}` : "아직 등록된 규정 없음",
      action: { label: "규정 추가", view: "knowledge-base" as NavigableView },
    },
    {
      label: "법령 스캔",
      value: scans.length,
      icon: <Scale className="w-5 h-5" />,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      sub: scans.length > 0 ? `마지막: ${formatRelativeTime(scans[scans.length - 1].scannedAt)}` : "스캔 이력 없음",
      action: { label: "스캔 시작", view: "law-impact" as NavigableView },
    },
    {
      label: "작성 중 초안",
      value: drafts.length,
      icon: <PenTool className="w-5 h-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      sub: drafts.length > 0 ? `최근 수정: ${formatRelativeTime(drafts[drafts.length - 1].updatedAt)}` : "진행 중인 초안 없음",
      action: { label: "초안 보기", view: "revision-drafter" as NavigableView },
    },
    {
      label: "고위험 영향",
      value: highRiskCount,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: highRiskCount > 0 ? "text-rose-600" : "text-emerald-600",
      bg: highRiskCount > 0 ? "bg-rose-50" : "bg-emerald-50",
      border: highRiskCount > 0 ? "border-rose-100" : "border-emerald-100",
      sub: highRiskCount > 0 ? "즉시 검토가 필요한 규정이 있습니다" : "현재 고위험 항목 없음",
      action: { label: "영향 보기", view: "law-impact" as NavigableView },
    },
  ]

  // ─── 빠른 실행 메뉴 ─────────────────────────────────────────────────────────
  const quickActions = [
    { icon: <Book className="w-5 h-5" />, label: "규정 라이브러리", desc: "사내 규정 파일 업로드 및 관리", view: "knowledge-base" as NavigableView, color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
    { icon: <Scale className="w-5 h-5" />, label: "법령 영향 스캔", desc: "개정 법령이 규정에 미치는 영향 분석", view: "law-impact" as NavigableView, color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100" },
    { icon: <PenTool className="w-5 h-5" />, label: "개정안 추천", desc: "영향 분석 기반 개정 초안 자동 생성", view: "revision-drafter" as NavigableView, color: "text-amber-600", bg: "bg-amber-50 hover:bg-amber-100" },
    { icon: <MessageSquare className="w-5 h-5" />, label: "컴플라이언스 챗봇", desc: "규정·판례 기반 실시간 질의응답", view: "chatbot" as NavigableView, color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100" },
    { icon: <FileSearch className="w-5 h-5" />, label: "개정 근거 추출", desc: "신구조문대비표 및 법적 근거 추출", view: "justification" as NavigableView, color: "text-slate-600", bg: "bg-slate-50 hover:bg-slate-100" },
  ]

  return (
    <div className="space-y-8">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-headline font-bold text-slate-800 tracking-tight">컴플라이언스 대시보드</h2>
          <p className="text-sm text-slate-500 mt-1">현재 세션의 규정 관리 현황을 한눈에 확인하세요.</p>
        </div>
        {scans.length === 0 && regulations.length === 0 && (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
            <Zap className="w-4 h-4" />
            <span>규정을 등록하고 법령 스캔을 시작해 보세요</span>
          </div>
        )}
      </div>

      {/* ── 통계 카드 ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn("rounded-2xl border p-5 space-y-3 bg-white shadow-sm hover:shadow-md transition-shadow", s.border)}
          >
            <div className="flex items-center justify-between">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                <span className={s.color}>{s.icon}</span>
              </div>
              <button
                onClick={() => onNavigate(s.action.view)}
                className={cn("text-xs font-semibold px-3 py-1 rounded-full transition-colors", s.bg, s.color, "hover:opacity-80")}
              >
                {s.action.label}
              </button>
            </div>
            <div>
              <div className={cn("text-3xl font-bold font-headline", s.color)}>{s.value}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 컴플라이언스 건강도 미터 ── */}
      {healthScore !== null && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-slate-700 text-sm">컴플라이언스 건강도</h3>
            </div>
            <span className={cn("text-2xl font-headline font-bold", healthLabel(healthScore).color)}>
              {healthScore}점
            </span>
          </div>

          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={cn("h-full rounded-full transition-all duration-700", healthLabel(healthScore).bar)}
              style={{ width: `${healthScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mb-5">
            <span>위험 (0)</span>
            <span className={cn("font-bold", healthLabel(healthScore).color)}>
              {healthLabel(healthScore).text}
            </span>
            <span>양호 (100)</span>
          </div>

          {/* 영향도 분포 */}
          {impactCounts.total > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "고위험 (HIGH)", count: impactCounts.high, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
                { label: "중위험 (MEDIUM)", count: impactCounts.medium, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                { label: "저위험 (LOW)", count: impactCounts.low, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              ].map((item) => (
                <div key={item.label} className={cn("rounded-xl p-3 border text-center", item.bg, item.border)}>
                  <div className={cn("text-2xl font-bold font-headline", item.color)}>{item.count}</div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">{item.label}</div>
                  {impactCounts.total > 0 && (
                    <div className="mt-2">
                      <Progress
                        value={Math.round((item.count / impactCounts.total) * 100)}
                        className="h-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 하단 2열 레이아웃 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* 최근 활동 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-slate-700 text-sm">최근 활동</h3>
            </div>
            <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] font-bold uppercase tracking-wider">
              {recentActivity.length}건
            </Badge>
          </div>

          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 px-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Clock className="w-7 h-7 text-slate-300" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-600">아직 활동 내역이 없습니다</p>
                <p className="text-xs text-slate-400">아래 단계에 따라 RegulMate를 시작해 보세요</p>
              </div>
              <div className="w-full space-y-2 pt-1">
                {[
                  { step: "1", text: "규정 라이브러리에서 사내 규정 파일을 업로드하세요", view: "knowledge-base" as NavigableView },
                  { step: "2", text: "법령 영향 스캔으로 개정 법령의 영향을 분석하세요", view: "law-impact" as NavigableView },
                  { step: "3", text: "개정안 추천에서 수정안 초안을 자동 생성하세요", view: "revision-drafter" as NavigableView },
                ].map((item) => (
                  <button
                    key={item.step}
                    onClick={() => onNavigate(item.view)}
                    onKeyDown={(e) => handleKeyNav(e, item.view)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={item.text}
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{item.step}</span>
                    <span className="text-xs text-slate-600">{item.text}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      item.kind === "scan" ? "bg-violet-50" : "bg-amber-50"
                    )}>
                      {item.kind === "scan"
                        ? <Scale className="w-4 h-4 text-violet-500" />
                        : <PenTool className="w-4 h-4 text-amber-500" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1.5 flex-shrink-0 ml-3">
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatRelativeTime(item.at)}</span>
                    {item.kind === "scan" && item.badge && (
                      <Badge className={cn("text-[10px] font-bold border px-2 py-0", item.badgeClass)}>
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 빠른 실행 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center space-x-2 px-6 py-4 border-b border-slate-100">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-slate-700 text-sm">빠른 실행</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {quickActions.map((a) => (
              <li key={a.view}>
                <button
                  onClick={() => onNavigate(a.view)}
                  onKeyDown={(e) => handleKeyNav(e, a.view)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  aria-label={`${a.label}으로 이동`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", a.bg)}>
                      <span className={a.color}>{a.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{a.label}</p>
                      <p className="text-xs text-slate-400">{a.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 스캔 커버리지 + 상위 위험 규정 ── */}
      {(scanCoverage !== null || topRisks.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* 스캔 커버리지 */}
          {scanCoverage !== null && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-slate-700 text-sm">스캔 커버리지</h3>
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-0 text-xs font-bold">
                  {scanCoverage.covered}/{scanCoverage.total}개 규정
                </Badge>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>법령 스캔된 규정</span>
                  <span className="font-bold text-slate-700">{scanCoverage.pct}%</span>
                </div>
                <Progress value={scanCoverage.pct} className="h-2" />
              </div>
              <p className="text-xs text-slate-400">
                {scanCoverage.pct < 100
                  ? `${scanCoverage.total - scanCoverage.covered}개 규정이 아직 법령 스캔 대상에 포함되지 않았습니다.`
                  : "모든 등록 규정이 법령 스캔에 포함되었습니다."}
              </p>
              {scanCoverage.pct < 100 && (
                <button
                  onClick={() => onNavigate("law-impact")}
                  onKeyDown={(e) => handleKeyNav(e, "law-impact")}
                  className="flex items-center space-x-1 text-xs font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="법령 영향 스캔으로 이동"
                >
                  <span>스캔 시작하기</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* 상위 위험 규정 */}
          {topRisks.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-slate-700 text-sm">주요 위험 규정</h3>
                </div>
                <button
                  onClick={() => onNavigate("law-impact")}
                  onKeyDown={(e) => handleKeyNav(e, "law-impact")}
                  className="text-xs font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label="법령 영향 스캔 전체 보기"
                >
                  전체 보기
                </button>
              </div>
              <ul className="divide-y divide-slate-50">
                {topRisks.map((risk) => (
                  <li key={risk.regulationId} className="px-6 py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{risk.regulationName}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{risk.lawName}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{risk.reason}</p>
                    </div>
                    <Badge className={cn("text-[10px] font-bold border flex-shrink-0 mt-0.5", impactBadgeClass(risk.impactLevel))}>
                      {risk.impactLevel}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 컴플라이언스 상태 요약 ── */}
      {(scans.length > 0 || regulations.length > 0) && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">컴플라이언스 현황 요약</h3>
              </div>
              <p className="text-xl font-headline font-bold mt-2">
                {highRiskCount > 0
                  ? `${highRiskCount}개 규정에 즉각 조치가 필요합니다`
                  : "현재 고위험 컴플라이언스 이슈 없음"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {regulations.length}개 규정 등록 · {scans.length}회 법령 스캔 완료 · {drafts.length}개 초안 작성 중
              </p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {highRiskCount > 0 ? (
                <div className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>조치 필요</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>정상</span>
                </div>
              )}
            </div>
          </div>
          {scans.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>마지막 스캔: {formatRelativeTime(scans[scans.length - 1].scannedAt)}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                <span>총 {scans.reduce((a, s) => a + s.impactedCount, 0)}건 영향 감지됨</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
