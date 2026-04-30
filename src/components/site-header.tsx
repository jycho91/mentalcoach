"use client";

import Link from "next/link";
import { Shield, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";

export function SiteHeader() {
  const { configured, user, loading } = useAuth();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Shield className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">RegulMate</div>
            <div className="text-[11px] font-medium text-muted-foreground">
              실시간 법령-사내규정 동기화
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {demoMode ? (
            <Badge variant="warning" className="gap-1">
              <FlaskConical className="h-3 w-3" />
              Demo Mode
            </Badge>
          ) : null}
          {configured ? (
            <Badge variant="success">
              {loading ? "인증 중…" : user ? "로그인됨" : "로그아웃"}
            </Badge>
          ) : (
            <Badge variant="secondary">In-Memory</Badge>
          )}
        </div>
      </div>
    </header>
  );
}
