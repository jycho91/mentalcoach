import Link from "next/link";
import {
  ScanLine,
  ArrowRight,
  Sparkles,
  FileText,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScanRunner } from "@/components/scan-runner";

import { MOCK_RULES } from "@/lib/mock-data";
import { formatDateKO } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  HR: "인사",
  PRIVACY: "개인정보",
  SAFETY: "안전보건",
  SECURITY: "보안",
  FINANCE: "재무",
  PROCUREMENT: "구매",
  ETHICS: "윤리",
  OTHER: "기타",
};

export default function Home() {
  return (
    <div className="container py-8">
      {/* Hero */}
      <section className="mb-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="accent" className="mb-3">
              <Sparkles className="mr-1 h-3 w-3" />
              Korea Law MCP · 실시간 연동 (P0 MVP)
            </Badge>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              사내 규정 컴플라이언스 워크스페이스
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              현재 등록된 사내 규정 {MOCK_RULES.length}건. <b>최근 법령 개정 스캔</b>을
              실행하면 영향받는 조문과 그 사유를 자동으로 찾아 드립니다.
            </p>
          </div>
          <ScanRunner />
        </div>
      </section>

      <Separator className="mb-8" />

      {/* Rules grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">
            <FileText className="mr-2 inline-block h-4 w-4 text-muted-foreground" />
            사내 규정 ({MOCK_RULES.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            데모용 사전 로드 데이터
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_RULES.map((rule) => (
            <Card
              key={rule.id}
              className="group transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    {CATEGORY_LABEL[rule.category] ?? rule.category}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateKO(rule.lastRevisedAt)}
                  </span>
                </div>
                <CardTitle className="mt-2">{rule.title}</CardTitle>
                <CardDescription className="line-clamp-2 leading-relaxed">
                  {rule.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {rule.ownerDept}
                  </span>
                  <span>{rule.articles.length}개 조문</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <Separator className="my-12" />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StepCard
          stepNo="STEP 1"
          icon={<ScanLine className="h-4 w-4" />}
          title="📡 디텍팅 (스캔 모드)"
          desc="Korea Law MCP가 국가법령정보센터를 폴링하고, 임베딩 매칭으로 영향받는 사내 규정과 조문을 추려냅니다."
        />
        <StepCard
          stepNo="USER"
          icon={<ArrowRight className="h-4 w-4" />}
          title="🧑‍⚖️ 실무자가 선택"
          desc="영향 규정 리스트에서 어떤 규정을 먼저 손볼지 의사결정. 자동화 위에 사람의 판단이 들어옵니다."
        />
        <StepCard
          stepNo="STEP 2"
          icon={<Sparkles className="h-4 w-4" />}
          title="📝 개정안 + 판례 검증"
          desc="개정 사유 / 주요 골자 / 신구조문대비표 / 대법원 판례 검증 — 결재용 패키지 4종을 한번에."
        />
      </section>

      <div className="mt-8 rounded-lg border border-warning/30 bg-warning/5 p-5">
        <div className="text-sm font-semibold text-warning">🎯 설계 원칙</div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/80">
          AI가 알아서 다 바꾸는 게 아니라 — <b>AI가 찾아주고, 사람이 선택하고, AI가 작성</b>합니다.
          마지막 결재는 항상 사람의 손에. 실무 신뢰도와 기술 현실성을 동시에.
        </p>
      </div>

      <footer className="mt-12 flex flex-col items-center gap-1 border-t pt-8 text-center text-xs text-muted-foreground">
        <div>© 2026 RegulMate · MBA Term Project</div>
        <Link href="/marketing.html" className="hover:underline">
          마케팅 페이지 보기 →
        </Link>
      </footer>
    </div>
  );
}

function StepCard({
  stepNo,
  icon,
  title,
  desc,
}: {
  stepNo: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full bg-primary px-2.5 text-[11px] font-bold tracking-wider text-primary-foreground">
            {stepNo}
          </span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <CardTitle className="mt-2 text-base">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}
