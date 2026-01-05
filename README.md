# Data Tools (CSVPDF)

CSV 뷰어, PPT to PDF 변환, PDF 서명 웹 애플리케이션

**URL**: https://csvpdf.duckdns.org

## 기능

### 1. CSV Viewer (`/csv`)
- CSV 파일 업로드 (드래그 & 드롭)
- 인코딩 자동 감지 및 수동 선택
- 데이터 요약 (행/열 수, 결측치)
- 숫자 컬럼 차트 시각화

### 2. PPT to PDF (`/convert`)
- PPT/PPTX → PDF 변환
- LibreOffice headless 기반
- 실시간 변환 상태 표시

### 3. PDF Sign (`/sign`)
- 서명 그리기 (캔버스)
- 도장 생성 (텍스트 기반)
- 이미지 업로드
- 다중 페이지 서명 복사
- 서명 위치/크기 조절

## 기술 스택

### Frontend
- React 18
- Webpack 5
- PapaParse (CSV 파싱)
- Recharts (차트)
- pdfjs-dist (PDF 렌더링)
- pdf-lib (PDF 편집)

### Backend
- Go 1.21+
- Gin (HTTP 프레임워크)
- LibreOffice (PDF 변환)

## 폴더 구조

```
csvpdf/
├── client/                  # React 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # 공통 컴포넌트 (NavBar, Card, Toast 등)
│   │   │   └── sign/        # PDF 서명 컴포넌트
│   │   ├── pages/           # 페이지 (CsvPage, ConvertPage, SignPage)
│   │   ├── context/         # React Context
│   │   └── styles/          # 글로벌 CSS
│   ├── public/              # 정적 파일
│   └── webpack.*.js         # Webpack 설정
├── server/                  # Go 백엔드
│   ├── main.go              # 엔트리포인트
│   ├── routes/              # API 라우트
│   ├── middleware/          # 미들웨어 (보안, 로깅)
│   └── utils/               # 유틸리티
└── README.md
```

## 라이선스

MIT
