# 카페 매니지먼트 서비스

QR/NFC 테이블 주문 + 계좌이체 결제 + 실시간 제조현황을 지원하는 멀티테넌시(여러 업장) 카페 관리 서비스.
자세한 설계는 초기 플랜 문서 참고 (`C:\Users\parks\.claude\plans\vivid-wibbling-marble.md`).

## 구성

- `backend/` — FastAPI + SQLAlchemy (async). 로컬은 SQLite, 배포는 Neon(Postgres) 사용.
- `frontend/` — React + Vite + Tailwind. 3개 페이지: 주문(`/order`), 관리자(`/admin/*`), 제조현황(`/display`).
- `phone-automation/` — 입금 자동매칭용 Termux 스크립트. 사장님 폰에 직접 설치 필요, `phone-automation/README.md` 참고.

## 로컬 실행

### 백엔드

```bash
cd backend
python -m venv venv
venv/Scripts/pip install -r requirements.txt   # mac/linux는 venv/bin/pip
cp .env.example .env
venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

super_admin 계정은 회원가입 화면으로 만들 수 없습니다 (의도적). 별도 생성:

```bash
venv/Scripts/python -m scripts.create_super_admin admin <password>
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:5173` 접속. `.env.development`에서 `VITE_API_BASE_URL`로 백엔드 주소 지정(기본 `http://localhost:8000`).

## 페이지 경로

- 주문: `/#/order?venue=<slug>&table=<번호>` — QR/NFC가 여는 실제 URL
- 관리자: `/#/login` → `/#/admin/orders`, `/#/admin/menu`, `/#/admin/tables`, `/#/admin/settings`
- 제조현황: `/#/display?venue=<slug>` — 매장 모니터에 상시 노출용, 로그인 불필요

## 배포

- 프론트엔드: `.github/workflows/deploy-pages.yml`이 `main` 브랜치 push 시 GitHub Pages로 자동 배포. 리포지토리 Settings → Secrets and variables → Actions → **Variables**에 `VITE_API_BASE_URL`(배포된 백엔드 URL)을 설정해야 함.
- 백엔드: Render(추천) 등에 `backend/`를 배포하고 `DATABASE_URL`을 Neon 연결 문자열로, `CORS_ORIGINS`를 GitHub Pages 도메인으로 설정.
- DB: [Neon](https://neon.tech)에서 Postgres 프로젝트 생성 후 연결 문자열을 `postgresql+asyncpg://...` 형태로 `DATABASE_URL`에 설정.

## 아직 안 된 것 (Phase 2)

- 입금 자동 대조 웹훅(`/api/webhook/deposit/{slug}`)과 폰 자동화 스크립트(`phone-automation/`)는 준비돼 있으나, 사장님 폰에 Termux 설치/설정은 직접 해야 함.
- NFC 태그 실물 프로그래밍.
- QR 코드 일괄 생성: `backend/scripts/generate_qr.py` 참고.
