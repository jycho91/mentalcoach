import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  GitCompare,
  Scale,
  Sparkles,
  Printer,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { DiffTable } from "@/components/diff-table";

import {
  getAmendmentPackage,
  getRule,
  getLawChange,
  getAffectedRule,
} from "@/lib/mock-data";
import { formatDateTimeKO, pct } from "@/lib/utils";

export default async function AmendmentPage({
  params,
}: {
  params: Promise<{ ruleId: string }>;
}) {
  const { ruleId } = await params;
  const pkg = getAmendmentPackage(ruleId);
  const rule = getRule(ruleId);
  const affected = getAffectedRule(ruleId);
  const law = affected ? getLawChange(affected.lawChangeId) : undefined;

  if (!pkg || !rule || !law) {
    notFound();
  }

  return (
    <div className="container py-8">
      {/* Top nav */}
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/scan">
            <ArrowLeft className="h-4 w-4" />
            스캔 결과
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <h1 className="text-2xl font-extrabold tracking-tight">개정안 패키지</h1>
      </div>

      {/* Header card */}
      <Card className="mb-8 overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-warning text-warning-foreground">
              <Sparkles className="mr-1 h-3 w-3" />
              결재용 패키지
            </Badge>
            <Badge variant="outline" className="border-white/30 text-white">
              신뢰도 {pct(pkg.confidence)}
            </Badge>
            {pkg.source === "MOCK" ? (
              <Badge variant="outline" className="border-white/30 text-white">
                Demo / Pre-generated
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/30 text-white">
                Gemini 2.5 Flash
              </Badge>
            )}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">{rule.title}</h2>
          <p className="mt-1 text-sm text-primary-foreground/80">
            {law.lawName} {law.articleNumber} · {pkg.lawChangeSummary}
          </p>
          <p className="mt-3 text-xs text-primary-foreground/60">
            생성 시각: {formatDateTimeKO(pkg.generatedAt)}
          </p>
        </div>
      </Card>

      {/* 4-section package */}
      <Tabs defaultValue="reasoning" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="reasoning">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            개정 사유
          </TabsTrigger>
          <TabsTrigger value="highlights">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            주요 골자
          </TabsTrigger>
          <TabsTrigger value="diff">
            <GitCompare className="mr-1.5 h-3.5 w-3.5" />
            신구조문대비표
          </TabsTrigger>
          <TabsTrigger value="precedents">
            <Scale className="mr-1.5 h-3.5 w-3.5" />
            판례 검증
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reasoning">
          <Card>
            <CardHeader>
              <CardTitle>개정 사유</CardTitle>
              <CardDescription>
                결재 라인에 첨부될 사유서 본문 (서술형)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {pkg.reasoning}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights">
          <Card>
            <CardHeader>
              <CardTitle>주요 골자</CardTitle>
              <CardDescription>
                결재 슬라이드에 그대로 들어갈 한 줄 요약 ({pkg.highlights.length}건)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pkg.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-md border bg-secondary/30 p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diff">
          <Card>
            <CardHeader>
              <CardTitle>신구조문대비표</CardTitle>
              <CardDescription>
                현행 vs 개정안 — 한 줄씩 변경 포인트 표기
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiffTable rows={pkg.diffTable} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="precedents">
          <Card>
            <CardHeader>
              <CardTitle>판례 교차 검증</CardTitle>
              <CardDescription>
                대법원 판례 DB와 RAG 교차 — 본 개정안과의 직접 관련성 분석
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pkg.precedents.map((p, i) => (
                <Card key={i} className="border-accent/20 bg-accent/5">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent">{p.caseId}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {p.date}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        판례 요지
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{p.summary}</p>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-warning">
                        본 개정안과의 관련성
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">
                        {p.relevance}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action bar */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-secondary/30 p-4">
        <div className="text-sm text-muted-foreground">
          본 패키지는 <b>결재용 초안</b>입니다. 검토 후 승인 / 수정 / 반려 결정은 사람이 합니다.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <Printer className="h-4 w-4" />
            DOCX 다운로드
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/scan">다른 규정 보기</Link>
          </Button>
          <Button size="sm">결재 상신</Button>
        </div>
      </div>
    </div>
  );
}
