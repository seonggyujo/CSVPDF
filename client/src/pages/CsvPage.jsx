import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/common/Card';
import FileDropZone from '../components/common/FileDropZone';
import { useToast } from '../context/ToastContext';
import './CsvPage.css';

// Security limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 50000;
const MAX_COLUMNS = 100;

// 인코딩 옵션
const ENCODING_OPTIONS = [
  { value: 'auto', label: '자동 감지' },
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'CP949', label: 'CP949 (한글 Windows)' },
  { value: 'EUC-KR', label: 'EUC-KR (한글 레거시)' },
];

// 인코딩 감지 및 UTF-8 변환 함수
const decodeFileToUtf8 = (arrayBuffer, forceEncoding = null) => {
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // 0. 강제 인코딩이 지정된 경우
  if (forceEncoding) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using forced encoding:', forceEncoding);
    }
    return iconv.decode(Buffer.from(uint8Array), forceEncoding);
  }
  
  // 1. BOM 확인 (UTF-8 BOM: EF BB BF)
  if (uint8Array.length >= 3 && 
      uint8Array[0] === 0xEF && 
      uint8Array[1] === 0xBB && 
      uint8Array[2] === 0xBF) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('UTF-8 BOM detected');
    }
    return iconv.decode(Buffer.from(uint8Array), 'UTF-8');
  }
  
  // 2. UTF-8로 먼저 시도 (유효성 검사 - 깨진 문자가 있으면 실패)
  try {
    const utf8Text = new TextDecoder('utf-8', { fatal: true }).decode(uint8Array);
    // replacement character (�)가 없으면 UTF-8로 판단
    if (!/\uFFFD/.test(utf8Text)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Valid UTF-8 detected');
      }
      return utf8Text;
    }
  } catch {
    // UTF-8 아님 - 계속 진행
  }
  
  // 3. 샘플링: 처음 10KB만 사용하여 인코딩 감지 (대용량 파일 대응)
  const sampleSize = Math.min(uint8Array.length, 10000);
  const sample = uint8Array.slice(0, sampleSize);
  
  const detected = jschardet.detect(Buffer.from(sample));
  let encoding = (detected.encoding || 'CP949').toUpperCase();
  
  // 4. 신뢰도가 낮거나 잘못 감지된 경우 CP949로 처리
  const lowConfidenceEncodings = ['ISO-8859-1', 'WINDOWS-1252', 'ASCII', 'TIS-620', 'ISO-8859-2'];
  if (detected.confidence < 0.7 || lowConfidenceEncodings.includes(encoding)) {
    encoding = 'CP949';
  }
  
  // 5. EUC-KR → CP949 통합 (CP949가 EUC-KR의 확장)
  if (encoding === 'EUC-KR') {
    encoding = 'CP949';
  }
  
  // 6. 디버그 로깅 (개발 환경)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Encoding detected:', detected.encoding, 'confidence:', detected.confidence, '→ using:', encoding);
  }
  
  try {
    return iconv.decode(Buffer.from(uint8Array), encoding);
  } catch {
    // 7. 실패 시 CP949 → UTF-8 순서로 fallback
    try {
      return iconv.decode(Buffer.from(uint8Array), 'CP949');
    } catch {
      return new TextDecoder('utf-8').decode(uint8Array);
    }
  }
};

function CsvPage() {
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [encoding, setEncoding] = useState('auto');
  const [rawArrayBuffer, setRawArrayBuffer] = useState(null);
  const { showToast } = useToast();

  // 인코딩으로 파싱하는 함수
  const parseWithEncoding = (arrayBuffer, selectedEncoding) => {
    try {
      const forceEncoding = selectedEncoding === 'auto' ? null : selectedEncoding;
      const text = decodeFileToUtf8(arrayBuffer, forceEncoding);
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Security: Check column limit
          const fields = results.meta.fields || [];
          if (fields.length > MAX_COLUMNS) {
            showToast(`열 수는 ${MAX_COLUMNS}개를 초과할 수 없습니다`, 'error');
            setIsLoading(false);
            return;
          }

          // Security: Check row limit (불변성 유지)
          let parsedData = results.data;
          if (parsedData.length > MAX_ROWS) {
            showToast(`행 수가 ${MAX_ROWS.toLocaleString()}개를 초과합니다. 처음 ${MAX_ROWS.toLocaleString()}행만 표시합니다`, 'warning');
            parsedData = parsedData.slice(0, MAX_ROWS);
          }

          if (results.errors.length > 0 && process.env.NODE_ENV !== 'production') {
            console.error('Parse errors:', results.errors);
          }
          
          setHeaders(fields);
          setData(parsedData);
          setIsLoading(false);
          
          if (selectedEncoding === 'auto') {
            showToast('CSV 파일을 성공적으로 불러왔습니다', 'success');
          } else {
            showToast(`${selectedEncoding} 인코딩으로 다시 불러왔습니다`, 'success');
          }
        },
        error: () => {
          showToast('파일을 읽는 중 오류가 발생했습니다', 'error');
          setIsLoading(false);
        }
      });
    } catch {
      showToast('파일 인코딩 변환 중 오류가 발생했습니다', 'error');
      setIsLoading(false);
    }
  };

  // 인코딩 변경 핸들러
  const handleEncodingChange = (newEncoding) => {
    if (!rawArrayBuffer) return;
    
    setEncoding(newEncoding);
    setIsLoading(true);
    
    // 약간의 딜레이로 UI 업데이트 후 파싱
    setTimeout(() => {
      parseWithEncoding(rawArrayBuffer, newEncoding);
    }, 50);
  };

  // Parse CSV file
  const handleFileSelect = (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('CSV 파일만 업로드 가능합니다', 'error');
      return;
    }

    // Security: File size limit
    if (file.size > MAX_FILE_SIZE) {
      showToast(`파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다`, 'error');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    setEncoding('auto');

    // FileReader로 ArrayBuffer 읽기
    const reader = new FileReader();
    
    reader.onload = (e) => {
      // 원본 ArrayBuffer 저장 (인코딩 재시도용)
      setRawArrayBuffer(e.target.result);
      parseWithEncoding(e.target.result, 'auto');
    };
    
    reader.onerror = () => {
      showToast('파일을 읽는 중 오류가 발생했습니다', 'error');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const rowCount = data.length;
    const colCount = headers.length;
    
    // Count missing values
    let missingCount = 0;
    data.forEach(row => {
      headers.forEach(header => {
        if (row[header] === null || row[header] === undefined || row[header] === '') {
          missingCount++;
        }
      });
    });

    return { rowCount, colCount, missingCount };
  }, [data, headers]);

  // Detect numeric columns for chart
  const numericColumns = useMemo(() => {
    if (!data || data.length === 0 || headers.length === 0) return [];

    return headers.filter(header => {
      const values = data.slice(0, 100).map(row => row[header]);
      const numericValues = values.filter(v => !isNaN(parseFloat(v)) && v !== '');
      return numericValues.length > values.length * 0.5;
    });
  }, [data, headers]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || numericColumns.length === 0) return null;

    const firstNumericCol = numericColumns[0];
    const labelCol = headers.find(h => !numericColumns.includes(h)) || headers[0];

    return data.slice(0, 20).map((row, index) => ({
      name: row[labelCol] || `Item ${index + 1}`,
      value: parseFloat(row[firstNumericCol]) || 0
    }));
  }, [data, headers, numericColumns]);

  const resetData = () => {
    setData(null);
    setHeaders([]);
    setFileName('');
    setEncoding('auto');
    setRawArrayBuffer(null);
  };

  // 차트 폰트 설정
  const chartFontFamily = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  return (
    <div className="csv-page">
      <div className="page-header">
        <h1 className="page-title">CSV Viewer</h1>
        <p className="page-subtitle">CSV 파일을 업로드하여 데이터를 분석하고 시각화합니다</p>
      </div>

      {!data ? (
        <Card>
          <FileDropZone
            accept=".csv"
            onFileSelect={handleFileSelect}
            disabled={isLoading}
          >
            <div className="file-drop-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M14 18h20M14 26h20M14 34h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="file-drop-text">
              {isLoading ? '파일을 불러오는 중...' : 'CSV 파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="file-drop-hint">.csv 파일만 지원 (최대 10MB, 50,000행)</p>
          </FileDropZone>
        </Card>
      ) : (
        <>
          {/* File Info & Reset */}
          <div className="file-header">
            <div className="file-info-bar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 012-2h8l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
              </svg>
              <span className="file-name">{fileName}</span>
              
              {/* 인코딩 선택 UI */}
              <div className="encoding-helper">
                <span className="encoding-helper-label">인코딩:</span>
                <select 
                  value={encoding} 
                  onChange={(e) => handleEncodingChange(e.target.value)}
                  className="encoding-select"
                  disabled={isLoading}
                >
                  {ENCODING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={resetData}>
              다른 파일 선택
            </button>
          </div>

          {/* Summary Cards */}
          {stats && (
            <div className="summary-cards">
              <Card className="summary-card">
                <div className="summary-label">행 수</div>
                <div className="summary-value">{stats.rowCount.toLocaleString()}</div>
              </Card>
              <Card className="summary-card">
                <div className="summary-label">열 수</div>
                <div className="summary-value">{stats.colCount.toLocaleString()}</div>
              </Card>
              <Card className="summary-card">
                <div className="summary-label">결측치</div>
                <div className="summary-value">{stats.missingCount.toLocaleString()}</div>
              </Card>
            </div>
          )}

          {/* Chart */}
          {chartData && chartData.length > 0 && (
            <Card className="chart-card">
              <h3 className="ios-card-title">데이터 시각화</h3>
              <p className="ios-card-subtitle">
                {numericColumns[0]} 컬럼 기준 (상위 20개)
              </p>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11, fontFamily: chartFontFamily }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12, fontFamily: chartFontFamily }} />
                    <Tooltip 
                      contentStyle={{ 
                        fontFamily: chartFontFamily,
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar dataKey="value" fill="#007aff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Data Table */}
          <Card className="table-card">
            <h3 className="ios-card-title">데이터 미리보기</h3>
            <p className="ios-card-subtitle">
              상위 100행 표시 중 (전체 {data.length.toLocaleString()}행)
            </p>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 100).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="row-number">{rowIndex + 1}</td>
                      {headers.map((header, colIndex) => (
                        <td key={colIndex}>{row[header] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default CsvPage;
