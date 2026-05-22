"use client"

import { useState, useRef } from "react"
import { Book, UploadCloud, RefreshCw, Trash2, FileText, Search, Loader2, Plus, FileUp, AlertCircle, CheckSquare, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { useFirestore, useCollection, useUser, useMemoFirebase, addDocument, deleteDocument } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import * as pdfjs from 'pdfjs-dist'
import { useToast } from "@/hooks/use-toast"

// Worker 설정 (CDN 사용)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function KnowledgeBase() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; fileName?: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New Regulation Form State
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const regulationsRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "regulations");
  }, [db, user]);
  
  const { data: regulations, isLoading } = useCollection(regulationsRef);

  const filtered = regulations?.filter(reg => 
    reg.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.content?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(reg => reg.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(" ") + "\n";
    }
    return fullText;
  };

  const handleManualUpload = async () => {
    if (!newTitle.trim() || !newContent.trim() || !user || !regulationsRef) return;

    setIsUploading(true);
    setUploadStatus("저장 중...");
    const regulationData = {
      fileName: newTitle,
      content: newContent,
      version: "v1.0",
      status: "활성",
      uploadedAt: new Date().toISOString(),
      uploadedByUserId: user.uid
    };

    try {
      await addDocument(regulationsRef, regulationData);
      setIsDialogOpen(false);
      setNewTitle("");
      setNewContent("");
      toast({
        title: "업로드 완료",
        description: "텍스트 규정이 성공적으로 등록되었습니다."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: "규정 저장 중 오류가 발생했습니다. 권한 또는 네트워크를 확인해 주세요.",
      });
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !regulationsRef) return;

    setIsUploading(true);
    const totalFiles = files.length;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf') {
        failed++;
        continue;
      }

      setUploadStatus(`${file.name} 분석 중... (${i + 1}/${totalFiles})`);
      setUploadProgress(((i) / totalFiles) * 100);

      try {
        const text = await extractTextFromPdf(file);
        const regulationData = {
          fileName: file.name,
          content: text,
          version: "v1.0",
          status: "활성",
          uploadedAt: new Date().toISOString(),
          uploadedByUserId: user.uid
        };
        await addDocument(regulationsRef, regulationData);
        succeeded++;
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
        failed++;
      }
    }

    setUploadProgress(100);
    setUploadStatus("완료!");
    setTimeout(() => {
      setIsUploading(false);
      setIsDialogOpen(false);
      setUploadProgress(0);
      setUploadStatus("");
      if (succeeded > 0) {
        toast({
          title: "업로드 완료",
          description: `${succeeded}개 성공${failed > 0 ? ` / ${failed}개 실패` : ''}`,
        });
      } else if (failed > 0) {
        toast({
          variant: "destructive",
          title: "업로드 실패",
          description: `${failed}개 파일 처리에 실패했습니다.`,
        });
      }
    }, 1000);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const results = await Promise.allSettled(
      deleteTarget.ids.map(id => deleteDocument(doc(db, "regulations", id)))
    );
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;

    setDeleteTarget(null);
    setSelectedIds([]);

    if (failed === 0) {
      toast({
        title: "삭제 완료",
        description: `${succeeded}개의 규정이 라이브러리에서 제거되었습니다.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "삭제 불가",
        description: "규정 삭제는 시스템 관리자만 처리할 수 있습니다. 삭제가 필요하시면 관리자에게 문의해 주세요.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">규정 라이브러리</h2>
          <p className="text-slate-500">기업의 규정 및 정책을 관리합니다. PDF를 업로드하면 AI가 내용을 자동으로 분석합니다.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive"
              onClick={() => setDeleteTarget({ ids: selectedIds })}
              className="shadow-lg animate-in fade-in zoom-in-95 duration-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              선택 삭제 ({selectedIds.length})
            </Button>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                새 규정 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>규정 데이터 등록</DialogTitle>
                <DialogDescription>
                  PDF 파일을 직접 업로드하거나 텍스트를 직접 입력하여 라이브러리에 추가할 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold uppercase tracking-wider text-slate-500">PDF 파일 업로드 (다중 선택 가능)</label>
                  </div>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".pdf" 
                      multiple 
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileUp className="w-8 h-8 text-slate-400 group-hover:text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">클릭하여 PDF 파일 선택</p>
                    <p className="text-xs text-slate-400 mt-1">여러 개의 파일을 한 번에 선택할 수 있습니다.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">OR</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500">직접 텍스트 입력</label>
                  <div className="space-y-3">
                    <Input 
                      placeholder="규정 명칭 (예: 2024 인사 규정)" 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      disabled={isUploading}
                    />
                    <Textarea 
                      placeholder="규정의 상세 내용을 입력하세요..."
                      className="min-h-[120px]"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      <span>{uploadStatus}</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isUploading}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleManualUpload}
                  disabled={isUploading || !newTitle || !newContent}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                  텍스트 규정 저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border shadow-sm">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <Input 
          placeholder="문서 명칭 또는 내용으로 검색..." 
          className="border-none shadow-none focus-visible:ring-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-slate-500 font-medium">데이터베이스 로드 중...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-12 px-4">
                  <Checkbox 
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[40%]">파일명</TableHead>
                <TableHead>내용 요약</TableHead>
                <TableHead>최종 수정일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                    {searchTerm ? "검색 결과가 없습니다." : "등록된 규정이 없습니다. PDF 파일을 업로드해보세요!"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((reg) => (
                  <TableRow key={reg.id} className="group transition-colors">
                    <TableCell className="px-4">
                      <Checkbox 
                        checked={selectedIds.includes(reg.id)}
                        onCheckedChange={() => toggleSelect(reg.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{reg.fileName}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">VERSION {reg.version}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">
                        {reg.content?.substring(0, 100)}...
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {reg.uploadedAt ? new Date(reg.uploadedAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="삭제"
                          className="h-9 w-9 text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-all rounded-full"
                          onClick={() => setDeleteTarget({ ids: [reg.id], fileName: reg.fileName })}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>규정 파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.ids.length === 1 
                ? `'${deleteTarget.fileName}' 파일을 라이브러리에서 삭제하시겠습니까?`
                : `선택한 ${deleteTarget?.ids.length}개의 파일을 라이브러리에서 일괄 삭제하시겠습니까?`}
              <br />
              삭제된 규정은 챗봇 분석 및 개정안 추천 데이터에서 즉시 제외됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              네, 삭제합니다
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {!isLoading && filtered.length > 0 && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <p className="font-bold">지식 베이스 준비 완료!</p>
            <p className="opacity-80">업로드된 규정들을 바탕으로 <b>컴플라이언스 챗봇</b>에서 질문하거나, <b>개정안 추천</b> 서비스에서 활용할 수 있습니다.</p>
          </div>
        </div>
      )}
    </div>
  )
}