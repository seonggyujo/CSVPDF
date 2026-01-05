import { useState, useRef, useEffect, useCallback } from 'react';

function StampGenerator({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [shape, setShape] = useState('circle'); // circle, rectangle
  const [color, setColor] = useState('#e74c3c');
  const [borderWidth, setBorderWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Noto Sans KR');
  const [includeDate, setIncludeDate] = useState(false);
  const previewCanvasRef = useRef(null);

  // 오늘 날짜 포맷
  const getFormattedDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 도장 미리보기 렌더링 (3배 해상도로 고화질 생성)
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const displaySize = 150;  // 화면 표시 크기
    const scale = 3;          // 3배 해상도
    const size = displaySize * scale;  // 실제 캔버스 크기: 450
    
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
    
    // 스케일 적용 (이후 모든 좌표는 displaySize 기준으로 작성)
    ctx.scale(scale, scale);
    
    // 배경 클리어 (투명)
    ctx.clearRect(0, 0, displaySize, displaySize);
    
    const centerX = displaySize / 2;
    const centerY = displaySize / 2;
    const radius = displaySize / 2 - borderWidth - 5;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = borderWidth;
    ctx.fillStyle = color;
    
    // 도장 모양 그리기
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const rectSize = radius * 1.6;
      ctx.strokeRect(
        centerX - rectSize / 2,
        centerY - rectSize / 2,
        rectSize,
        rectSize
      );
    }
    
    // 텍스트 그리기
    ctx.font = `bold ${fontSize}px "${fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (name) {
      if (includeDate) {
        // 이름과 날짜를 두 줄로
        ctx.font = `bold ${fontSize}px "${fontFamily}"`;
        ctx.fillText(name, centerX, centerY - fontSize / 2);
        
        ctx.font = `${fontSize * 0.5}px "${fontFamily}"`;
        ctx.fillText(getFormattedDate(), centerX, centerY + fontSize / 2);
      } else {
        // 이름만
        ctx.fillText(name, centerX, centerY);
      }
    }
  }, [name, shape, color, borderWidth, fontSize, fontFamily, includeDate]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // 저장
  const handleSave = () => {
    if (!name.trim()) return;
    
    const canvas = previewCanvasRef.current;
    onSave(canvas.toDataURL('image/png'));
  };

  // 폰트 옵션
  const fontOptions = [
    { value: 'Noto Sans KR', label: 'Noto Sans KR' },
    { value: 'serif', label: '명조체 (Serif)' },
    { value: 'sans-serif', label: '고딕체 (Sans-serif)' },
    { value: 'cursive', label: '필기체 (Cursive)' }
  ];

  return (
    <>
      <div className="tool-panel-overlay" onClick={onClose} />
      <div className="tool-panel">
        <div className="tool-panel-header">
          <h2>도장 생성</h2>
          <button className="tool-panel-close" onClick={onClose}>×</button>
        </div>
        
        {/* 미리보기 */}
        <div className="stamp-preview">
          <canvas ref={previewCanvasRef} style={{ border: '1px dashed #ccc', borderRadius: '8px' }} />
        </div>
        
        {/* 설정 폼 */}
        <div className="stamp-form">
          <div className="form-row">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="도장에 들어갈 이름"
              maxLength={5}
            />
          </div>
          
          <div className="form-row">
            <label>모양</label>
            <select value={shape} onChange={(e) => setShape(e.target.value)}>
              <option value="circle">원형</option>
              <option value="rectangle">사각형</option>
            </select>
          </div>
          
          <div className="form-row">
            <label>색상</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '13px' }}>{color}</span>
          </div>
          
          <div className="form-row">
            <label>테두리</label>
            <input
              type="number"
              value={borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
              min={1}
              max={10}
            />
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '13px' }}>px</span>
          </div>
          
          <div className="form-row">
            <label>글자 크기</label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              min={12}
              max={48}
            />
            <span style={{ marginLeft: '8px', color: '#666', fontSize: '13px' }}>px</span>
          </div>
          
          <div className="form-row">
            <label>폰트</label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {fontOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-row">
            <label>날짜 추가</label>
            <input
              type="checkbox"
              checked={includeDate}
              onChange={(e) => setIncludeDate(e.target.checked)}
            />
            {includeDate && (
              <span style={{ marginLeft: '8px', color: '#666', fontSize: '13px' }}>
                {getFormattedDate()}
              </span>
            )}
          </div>
        </div>
        
        <div className="signature-actions" style={{ marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!name.trim()}
          >
            사용하기
          </button>
        </div>
      </div>
    </>
  );
}

export default StampGenerator;
