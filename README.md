# 2026 관리툴 (Next.js)

## 요구사항

- Node.js / npm
- PostgreSQL (이미 존재하는 DB 사용)

## 배포 (Git 이용)

### 1. Git 원격 저장소 연결

```bash
# 원격이 아직 없다면
git remote add origin <저장소-URL>

# 커밋 후 푸시
git add .
git commit -m "배포 준비"
git push -u origin main
```

### 2. 배포 플랫폼 선택 (Git 연동)

- **Vercel** (Next.js 권장): [vercel.com](https://vercel.com) → Import Git Repository → 이 저장소 선택
- **Netlify**: [netlify.com](https://netlify.com) → Add new site → Import from Git

### 3. 배포 시 설정

- **Build Command**: `npm run build` (기본값 사용)
- **Output Directory**: Next.js는 자동 감지
- **환경 변수**: 대시보드에서 반드시 설정
  - `DATABASE_URL`: PostgreSQL 연결 문자열 (예: `postgresql://user:pass@host:5432/dbname`)

### 4. 주의사항

- `.env` 파일은 Git에 포함되지 않습니다. 배포 서비스의 환경 변수 설정에 직접 입력하세요.
- DB가 외부(클라우드)가 아니라면, 배포 서버에서 해당 DB로 접근 가능한지(방화벽/보안 그룹) 확인하세요.

## 실행

1) 환경변수 설정

`.env` 또는 `.env.local`에 `DATABASE_URL`을 설정합니다.

예시: `.env.example`

2) Prisma Client 생성

```bash
npx prisma generate
```

3) 개발 서버 실행

```bash
npm run dev
```

## 페이지

- `/twitter-manual`: 트위터 수동수집대상 등록 (`xxx_pjlist1`)
- `/multi-broadcast`: 다중 방송국 등록 (`grp_pclass`)
- `/multi-weekday`: 프로그램-다중요일 등록 (`project.service_day`)
- `/dcgallery`: DC갤러리-프로그램 등록 (`dcgallery`)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
