"use client"

import { AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AiDisclaimerDialogProps {
  /** 팝업 표시 여부 */
  open: boolean
  /** 닫기 콜백 */
  onClose: () => void
  /** 상황별 문구 약간 다르게 (스캔/개정안) */
  context?: "scan" | "draft"
}

/**
 * AI 결과물에 대한 면책/주의 안내 팝업.
 * 스캔 결과 및 개정안 생성 결과가 나올 때 띄운다.
 */
export function AiDisclaimerDialog({ open, onClose, context = "scan" }: AiDisclaimerDialogProps) {
  const target = context === "draft" ? "개정안" : "분석 결과"

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            AI 생성 결과 이용 시 유의사항
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left leading-relaxed pt-2">
            <span className="block">
              본 {target}은 AI가 법령정보를 분석하여 생성한 <b>참고용 자료</b>입니다.
            </span>
            <span className="block">
              AI 특성상 실제 법령·판례의 내용과 다르거나 일부 누락·오류가 있을 수 있으므로,
              <b> 반드시 국가법령정보센터 등 공식 출처의 원문과 대조·확인</b>한 후 활용하시기 바랍니다.
            </span>
            <span className="block">
              본 결과는 법률 자문이 아니며, 이를 근거로 한 의사결정의 책임은 이용자에게 있습니다.
              중요한 사안은 변호사·노무사 등 전문가의 검토를 권장합니다.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>확인했습니다</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
