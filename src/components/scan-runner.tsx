"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ScanLine, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ScanRunner() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [running, setRunning] = React.useState(false);

  async function onScan() {
    setRunning(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      // 단순화를 위해 결과는 서버 mock으로 동일 → /scan 페이지가 다시 fetch
      startTransition(() => router.push("/scan"));
    } catch (err) {
      console.error(err);
      alert("스캔 실패. 콘솔을 확인해주세요.");
    } finally {
      setRunning(false);
    }
  }

  const busy = running || pending;

  return (
    <Button
      size="lg"
      onClick={onScan}
      disabled={busy}
      className="shadow-md"
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          스캔 중…
        </>
      ) : (
        <>
          <ScanLine className="h-4 w-4" />
          최근 법령 개정 스캔
        </>
      )}
    </Button>
  );
}
