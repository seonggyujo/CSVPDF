# Data Tools (CSVPDF)

CSV 뷰어 및 PPT to PDF 변환 웹 애플리케이션

## 주소

- **Production**: https://csvpdf.duckdns.org

## 기능

### 1. CSV Viewer (`/csv`)
- CSV 파일 업로드 (드래그 & 드롭 지원)
- 데이터 요약 (행 수, 열 수, 결측치)
- 테이블 미리보기 (상위 100행)
- 숫자 컬럼 자동 감지 및 차트 시각화

### 2. PPT to PDF Converter (`/convert`)
- PPT/PPTX 파일 업로드
- LibreOffice를 이용한 PDF 변환
- 변환 상태 표시 및 다운로드

## 기술 스택

### Frontend
- React 18
- React Router DOM v6
- PapaParse (CSV 파싱)
- Recharts (차트)
- Webpack 5 (번들링)

### Backend
- Node.js + Express
- Multer (파일 업로드)
- LibreOffice headless (PDF 변환)

## 설치 및 실행

### 사전 요구사항

1. **Node.js** v18 이상
2. **LibreOffice** (PDF 변환용)

```bash
# Ubuntu
sudo apt update
sudo apt install libreoffice-common libreoffice-impress

# 설치 확인
soffice --version
```

### 로컬 개발

```bash
# 1. 저장소 클론
git clone https://github.com/YOUR_USERNAME/csvpdf.git
cd csvpdf

# 2. 의존성 설치
npm run install:all

# 3. 개발 서버 실행
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### 프로덕션 빌드 및 배포

```bash
# 1. 클라이언트 빌드
npm run build

# 2. 서버 실행
npm start
```

## 서버 배포 (Ubuntu + PM2)

### 1. 서버에 프로젝트 설치

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/csvpdf.git
cd csvpdf
npm run install:all
npm run build
```

### 2. PM2로 실행

```bash
pm2 start ecosystem.config.js
pm2 save
```

### 3. Nginx 설정

`/etc/nginx/sites-available/csvpdf`:

```nginx
server {
    listen 80;
    server_name csvpdf.duckdns.org;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 파일 업로드 크기 제한
        client_max_body_size 50M;
    }
}
```

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/csvpdf /etc/nginx/sites-enabled/

# 설정 테스트 및 재시작
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL 인증서 발급 (Let's Encrypt)

```bash
sudo certbot --nginx -d csvpdf.duckdns.org
```

## 업데이트 방법

```bash
cd /home/ubuntu/csvpdf
git pull
npm run install:all
npm run build
pm2 restart csvpdf
```

## 폴더 구조

```
csvpdf/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # 공통 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── context/        # React Context
│   │   └── styles/         # 글로벌 CSS
│   ├── public/             # 정적 파일
│   ├── webpack.*.js        # Webpack 설정
│   └── package.json
├── server/                 # Express 백엔드
│   ├── src/
│   │   ├── routes/         # API 라우트
│   │   ├── middleware/     # 미들웨어
│   │   └── utils/          # 유틸리티
│   └── package.json
├── package.json            # 루트 스크립트
├── ecosystem.config.js     # PM2 설정
└── README.md
```

## API

### POST `/api/convert/ppt-to-pdf`

PPT/PPTX 파일을 PDF로 변환

- **Content-Type**: `multipart/form-data`
- **Body**: `file` (PPT/PPTX 파일)
- **Response**: PDF 파일 (application/pdf)
- **제한**: 최대 50MB, .ppt/.pptx만 허용

### GET `/api/health`

서버 상태 확인

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 4000 | 서버 포트 |
| `NODE_ENV` | development | 환경 (production/development) |

## 라이선스

MIT
