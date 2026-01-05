import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import Card from '../components/common/Card';
import FileDropZone from '../components/common/FileDropZone';
import PdfViewer from '../components/sign/PdfViewer';
import SignatureCanvas from '../components/sign/SignatureCanvas';
import StampGenerator from '../components/sign/StampGenerator';
import ImageUploader from '../components/sign/ImageUploader';
import { useToast } from '../context/ToastContext';
import './SignPage.css';

function SignPage() {
  const { showToast } = useToast();
  
  // PDF 관련 상태
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPages, setSelectedPages] = useState([]);
  
  // 서명 관련 상태
  const [signatures, setSignatures] = useState([]);
  const [selectedSignature, setSelectedSignature] = useState(null);
  
  // 렌더링 스케일 정보
  const [scaleInfo, setScaleInfo] = useState(null);
  
  // 모달 상태
  const [activeTool, setActiveTool] = useState(null); // 'draw', 'stamp', 'image'
  
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);

  // PDF 파일 선택
  const handleFileSelect = useCallback(async (file) => {
    if (!file.type.includes('pdf')) {
      showToast('PDF 파일만 업로드할 수 있습니다.', 'error');
      return;
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfBytes(new Uint8Array(arrayBuffer));
      setPdfFile(file);
      setCurrentPage(1);
      setSelectedPages([1]); // 기본적으로 첫 페이지 선택
      setSignatures([]);
      setSelectedSignature(null);
    } catch (error) {
      console.error('PDF 로드 실패:', error);
      showToast('PDF 파일을 읽을 수 없습니다.', 'error');
    }
  }, [showToast]);

  // PDF 로드 완료 콜백
  const handlePdfLoad = useCallback((numPages) => {
    setTotalPages(numPages);
  }, []);

  // 스케일 정보 업데이트 콜백
  const handleScaleChange = useCallback((info) => {
    setScaleInfo(info);
  }, []);

  // 서명 추가 (이미지 원본 비율 유지)
  const addSignature = useCallback((imageData) => {
    if (!scaleInfo) {
      showToast('PDF가 로드되지 않았습니다.', 'error');
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      let displayWidth = 150;
      let displayHeight = displayWidth / aspectRatio;
      
      // 최소/최대 크기 제한
      const minSize = 30;
      const maxSize = 300;
      
      if (displayHeight < minSize) {
        displayHeight = minSize;
        displayWidth = displayHeight * aspectRatio;
      } else if (displayHeight > maxSize) {
        displayHeight = maxSize;
        displayWidth = displayHeight * aspectRatio;
      }
      
      const newSignature = {
        id: Date.now(),
        imageData,
        page: currentPage,
        x: 100,
        y: 100,
        width: displayWidth,
        height: displayHeight,
        scale: scaleInfo.scale  // 생성 시점의 scale 저장
      };
      
      setSignatures(prev => [...prev, newSignature]);
      setSelectedSignature(newSignature.id);
      setActiveTool(null);
      showToast('서명이 추가되었습니다. 드래그하여 위치를 조정하세요.', 'success');
    };
    
    img.onerror = () => {
      showToast('이미지를 로드할 수 없습니다.', 'error');
    };
    
    img.src = imageData;
  }, [currentPage, scaleInfo, showToast]);

  // 서명 이동
  const handleSignatureMove = useCallback((id, x, y) => {
    setSignatures(prev => prev.map(sig => 
      sig.id === id ? { ...sig, x, y } : sig
    ));
  }, []);

  // 서명 리사이즈
  const handleSignatureResize = useCallback((id, width, height) => {
    setSignatures(prev => prev.map(sig => 
      sig.id === id ? { ...sig, width, height } : sig
    ));
  }, []);

  // 서명 삭제
  const handleSignatureDelete = useCallback((id) => {
    setSignatures(prev => prev.filter(sig => sig.id !== id));
    setSelectedSignature(null);
  }, []);

  // 선택한 페이지들에 서명 복사
  const applyToSelectedPages = useCallback(() => {
    if (selectedPages.length <= 1) {
      showToast('2개 이상의 페이지를 선택해주세요.', 'warning');
      return;
    }
    
    const currentPageSignatures = signatures.filter(s => s.page === currentPage);
    if (currentPageSignatures.length === 0) {
      showToast('현재 페이지에 서명이 없습니다.', 'warning');
      return;
    }
    
    // 다른 선택된 페이지에 서명 복사
    const newSignatures = [];
    selectedPages.forEach(pageNum => {
      if (pageNum !== currentPage) {
        currentPageSignatures.forEach(sig => {
          newSignatures.push({
            ...sig,
            id: Date.now() + Math.random(),
            page: pageNum
          });
        });
      }
    });
    
    setSignatures(prev => [...prev, ...newSignatures]);
    showToast(`${selectedPages.length - 1}개 페이지에 서명이 복사되었습니다.`, 'success');
  }, [signatures, currentPage, selectedPages, showToast]);

  // PDF 저장
  const handleSave = useCallback(async () => {
    if (!pdfBytes || signatures.length === 0) {
      showToast('저장할 서명이 없습니다.', 'warning');
      return;
    }
    
    if (!scaleInfo) {
      showToast('PDF 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      // 각 서명을 해당 페이지에 추가
      for (const sig of signatures) {
        const page = pages[sig.page - 1];
        if (!page) continue;
        
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Base64 이미지 타입 확인
        const isJpeg = sig.imageData.startsWith('data:image/jpeg') || 
                       sig.imageData.startsWith('data:image/jpg');
        
        // Base64 이미지를 ArrayBuffer로 변환 (fetch 대신 직접 디코딩 - CSP 호환)
        const base64Data = sig.imageData.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const image = isJpeg 
          ? await pdfDoc.embedJpg(imageBytes)
          : await pdfDoc.embedPng(imageBytes);
        
        // 캔버스 좌표를 PDF 좌표로 변환
        // 각 서명이 생성될 때 저장된 scale 사용 (멀티페이지 복사 시 정확한 좌표 계산)
        const sigScale = sig.scale;
        
        // PDF 좌표계는 좌하단이 원점, Y축이 위로 증가
        const pdfX = sig.x / sigScale;
        const pdfWidth = sig.width / sigScale;
        const pdfHeight = sig.height / sigScale;
        // Y 좌표: 캔버스는 위에서 아래로, PDF는 아래에서 위로
        const pdfY = pageHeight - (sig.y / sigScale) - pdfHeight;
        
        page.drawImage(image, {
          x: pdfX,
          y: pdfY,
          width: pdfWidth,
          height: pdfHeight
        });
      }
      
      const modifiedPdfBytes = await pdfDoc.save();
      
      // 다운로드
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFile.name.replace('.pdf', '_signed.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('서명된 PDF가 저장되었습니다.', 'success');
    } catch (error) {
      console.error('PDF 저장 실패:', error);
      showToast('PDF 저장에 실패했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [pdfBytes, pdfFile, signatures, scaleInfo, showToast]);

  // 새 파일 선택
  const handleReset = useCallback(() => {
    setPdfFile(null);
    setPdfBytes(null);
    setTotalPages(0);
    setCurrentPage(1);
    setSelectedPages([]);
    setSignatures([]);
    setSelectedSignature(null);
  }, []);

  return (
    <div className="sign-page">
      {!pdfFile ? (
        // 파일 업로드 화면
        <Card>
          <div className="card-header">
            <h2 className="card-title">PDF 서명</h2>
          </div>
          <div className="card-body">
            <FileDropZone accept=".pdf" onFileSelect={handleFileSelect}>
              <div className="file-drop-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M14 4h20v8h8v32H6V4h8z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M34 4l8 8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 24h16M16 32h12" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
                </svg>
              </div>
              <p className="file-drop-text">PDF 파일을 드래그하거나 클릭하여 업로드</p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                서명, 도장, 이미지를 추가할 수 있습니다
              </p>
            </FileDropZone>
          </div>
        </Card>
      ) : (
        // 편집 화면
        <>
          {/* 툴바 */}
          <div className="sign-toolbar">
            <div className="toolbar-group">
              <button 
                className="toolbar-btn"
                onClick={() => setActiveTool('draw')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M12.146.854a.5.5 0 0 1 .708 0l2.292 2.292a.5.5 0 0 1 0 .708l-9.5 9.5a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l9.5-9.5zM11.207 2L2 11.207V12.5l.5.5h1.293L14 3.793 11.207 2z"/>
                </svg>
                서명 그리기
              </button>
              <button 
                className="toolbar-btn"
                onClick={() => setActiveTool('stamp')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                도장 생성
              </button>
              <button 
                className="toolbar-btn"
                onClick={() => setActiveTool('image')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
                  <path d="M1 11l4-4 3 3 4-4 3 3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
                이미지 업로드
              </button>
            </div>
            
            <div className="toolbar-group">
              <button 
                className="toolbar-btn"
                onClick={applyToSelectedPages}
                disabled={selectedPages.length <= 1 || signatures.filter(s => s.page === currentPage).length === 0}
              >
                선택 페이지에 복사
              </button>
            </div>
            
            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={handleReset}>
                새 파일
              </button>
              <button 
                className="toolbar-btn active"
                onClick={handleSave}
                disabled={isSaving || signatures.length === 0}
              >
                {isSaving ? '저장 중...' : 'PDF 저장'}
              </button>
            </div>
          </div>
          
          {/* PDF 뷰어 */}
          <PdfViewer
            file={pdfFile}
            currentPage={currentPage}
            selectedPages={selectedPages}
            onPageChange={setCurrentPage}
            onPageSelect={setSelectedPages}
            onPdfLoad={handlePdfLoad}
            onScaleChange={handleScaleChange}
            signatures={signatures}
            onSignatureMove={handleSignatureMove}
            onSignatureResize={handleSignatureResize}
            onSignatureDelete={handleSignatureDelete}
            selectedSignature={selectedSignature}
            onSignatureSelect={setSelectedSignature}
          />
          
          {/* 하단 정보 */}
          <div className="sign-actions">
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
              {pdfFile.name} | {totalPages}페이지 | 서명 {signatures.length}개
              {selectedPages.length > 0 && ` | 선택된 페이지: ${selectedPages.join(', ')}`}
            </span>
          </div>
        </>
      )}
      
      {/* 도구 모달 */}
      {activeTool === 'draw' && (
        <SignatureCanvas
          onSave={addSignature}
          onClose={() => setActiveTool(null)}
        />
      )}
      
      {activeTool === 'stamp' && (
        <StampGenerator
          onSave={addSignature}
          onClose={() => setActiveTool(null)}
        />
      )}
      
      {activeTool === 'image' && (
        <ImageUploader
          onSave={addSignature}
          onClose={() => setActiveTool(null)}
        />
      )}
    </div>
  );
}

export default SignPage;
