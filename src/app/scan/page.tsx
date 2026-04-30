import Link from "next/link";
import {
  ArrowLeft,
  ScanLine,
  AlertTriangle,
  ArrowRight,
  Scale,
  Clock,
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
import { Progress } from "@/components/ui/progress";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  MOCK_DEMO_SCAN,
  MOCK_LAW_CHANGES,
  getLawChange,
} from "@/lib/mock-data";
import { formatDateKO, formatDateTimeKO, pct } from "@/lib/utils";

export default function ScanResultsPage() {
  const scan = MOCK_DEMO_SCAN;

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            대시보드
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-2xl font-extrabold tracking-tight">스캔 결과</h1>
      </div>

      {/* 상단 요약 */}
      <Alert variant="warning" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          {scan.affected.length}건의 영향받는 규정 발견
        </AlertTitle>
        <AlertDescription>
          최근 {MOCK_LAW_CHANGES.length}건의 법령 개정 이벤트를 분석해, 사내 규정 중
          개정이 필요한 조문을 매칭했습니다. 우선순위에 따라 검토 후 개정안 추천을
          실행하세요.
        </AlertDescription>
      </Alert>

      {/* 메타 정보 */}
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetaCard
          icon={<ScanLine className="h-4 w-4" />}
          label="스캔 종료"
          value={formatDateTimeKO(scan.finishedAt)}
        />
        <MetaCard
          icon={<Scale className="h-4 w-4" />}
          label="검사 법령"
          value={`${scan.lawChanges.length}건`}
        />
        <MetaCard
          icon={<Clock className="h-4 w-4" />}
          label="소요 시간"
          value={`${Math.round((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)}초`}
        />
      </div>

      {/* 영향 규정 리스트 */}
      <h2 className="mb-3 text-lg font-bold tracking-tight">
        영향받는 규정 (선택 → 개정안 추천)
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {scan.affected.map((aff) => {
          const law = getLawChange(aff.lawChangeId);
          return (
            <Card
              key={aff.ruleId}
              className="overflow-hidden transition-all hover:border-accent/40 hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {aff.articleNumber}
                      </Badge>
                      <span>{aff.articleTitle}</span>
                    </div>
                    <CardTitle className="text-xl">{aff.ruleTitle}</CardTitle>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="warning" className="font-bold">
                      매칭 {pct(aff.similarity)}
                    </Badge>
                    {law ? (
                      <span className="text-[11px] text-muted-foreground">
                        {law.lawName} {law.articleNumber} ·{" "}
                        {formatDateKO(law.effectiveDate)} 시행
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Progress value={aff.similarity * 100} />

                {/* 사유 */}
                <div className="rounded-md border bg-secondary/40 p-4">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    개정 필요 사유
                  </div>
                  <p className="text-sm leading-relaxed">{aff.rationale}</p>
                </div>

                {/* 근거 법 */}
                <div className="flex items-start gap-2 text-sm">
                  <Scale className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="text-xs font-bold text-muted-foreground">
                      법적 근거
                    </span>
                    <p className="text-foreground">{aff.legalBasis}</p>
                  </div>
                </div>

                {/* 액션 */}
                <div className="flex justify-end">
                  <Button asChild>
                    <Link href={`/amendments/${aff.ruleId}`}>
                      개정안 추천
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-bold uppercase tracking-wider">
            {label}
          </CardDescription>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="text-base font-extrabold tracking-tight">{value}</div>
      </CardHeader>
    </Card>
  );
}
