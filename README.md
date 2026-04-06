# Solo Rank Dashboard

솔로랭크 내기 점수를 실시간으로 집계하고 송출용 오버레이를 제공하는 웹 플랫폼.

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Database / Auth / Realtime:** Supabase (PostgreSQL + Realtime + Google OAuth)
- **Styling:** Tailwind CSS + Framer Motion
- **Hosting:** Vercel
- **Rate Limit:** Upstash Redis
- **DDoS:** Cloudflare

## Features

- Google OAuth 로그인
- 방 생성 / 이메일 일괄 초대 / 초대 수락·거절 / 퇴장
- 승/패 클릭 시 랜덤 점수 + 연승/연패 보너스 자동 계산
- 범용 가감점 (프리셋 + 직접 입력)
- 취침 모드
- 방 설정 실시간 수정 (팀명, 목표점수, 점수 범위, 연승/연패 규칙)
- 팀 배치 (미배정 / A팀 / B팀)
- 개인별 점수 변동 로그
- 내기 종료 시 승패 자동 판정
- 송출용 오버레이 (324x310, 미니맵 크기, Supabase Realtime 자동 갱신)
- 다크/라이트 모드 (시스템 설정 기본값 + 토글)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in Supabase URL and anon key

# Run development server
npm run dev
```

## Database Setup

1. Supabase 프로젝트 생성
2. Google OAuth Provider 활성화
3. `supabase/migrations/` 폴더의 SQL 파일을 순서대로 SQL Editor에서 실행

## Pages

| Route | Description |
|---|---|
| `/` | 랜딩 (Google 로그인) |
| `/dashboard` | 내 계정, 방 목록, 방 만들기 |
| `/room/[id]` | 방 상세 (점수 입력, 설정, 초대, 팀 배치) |
| `/room/[id]/overlay` | 송출용 오버레이 (OBS 브라우저 소스) |
