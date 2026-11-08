# 세이프랜딩 (safe-landing)

동아리원이 경험을 기록하고 자소서 문항과 연결하는 서비스. 기획은 상위 폴더의 `기획서.md`를 따른다.

현재 구현 범위 (12월 단계 + 마이페이지·탈퇴, 자격증·교육, 선배 아카이브): 구글 로그인, 가입 정보 입력·개인정보 동의, 승인 대기, 관리자 가입 승인·거절·회원 관리, 정지 방지 Cron, 개인정보 처리방침(초안), 활동 관리, 경험 카드(질문 흐름·임시 저장·공개 범위), 문항 유형·역량 태그 연결과 관리자 목록 관리.

## 처음 설정하기

### 1. 준비물
- Node.js 22 이상 (supabase-js가 Node 20 지원을 중단함)

### 2. Supabase 프로젝트
1. 동아리 Supabase **조직**에서 새 프로젝트를 만든다. 지역은 **Northeast Asia (Seoul)**. DB 비밀번호는 임원진 보관함에 저장한다.
2. DB 구조 적용 (둘 중 하나):
   - 대시보드 **SQL Editor**에 `supabase/migrations/` 안의 SQL 파일을 순서대로 붙여 넣고 실행한다.
   - 또는 CLI: `npx supabase login` → `npx supabase link --project-ref <프로젝트 ref>` → `npx supabase db push`
3. 적용 후 대시보드 **Advisors(보안 진단)** 에서 경고가 없는지 확인한다.

### 3. 구글 로그인
1. Google Cloud 콘솔(동아리 공용 계정)에서 OAuth 클라이언트(웹 애플리케이션)를 만든다.
   - 승인된 리디렉션 URI: `https://<프로젝트 ref>.supabase.co/auth/v1/callback`
2. OAuth 동의 화면을 **게시(Publish)** 상태로 바꾼다. 테스트 상태는 등록한 100명만 로그인할 수 있다.
3. Supabase **Authentication → Providers → Google**을 켜고 클라이언트 ID·비밀번호를 넣는다.
4. Supabase **Authentication → URL Configuration**
   - Site URL: `https://<배포 주소>.vercel.app`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://<배포 주소>.vercel.app/auth/callback`

### 4. 내 컴퓨터에서 실행
```bash
cp .env.example .env.local   # 값 채우기 (Supabase → Project Settings → API Keys)
npm install
npm run dev
```

### 5. 첫 관리자 지정
처음에는 관리자가 없어서 아무도 승인할 수 없다. 학회장이 먼저 가입 신청을 한 뒤, SQL Editor에서 한 번만 실행한다.
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = '학회장 구글 이메일');
```
그다음부터는 화면에서 승인하고, 관리자 권한도 화면에서 넘긴다. 마지막 관리자는 DB가 해제를 막는다.

### 6. Vercel 배포
1. 동아리 **전용 Vercel 계정**으로 GitHub의 **공개** 저장소를 가져온다 (무료 플랜은 조직의 비공개 저장소를 배포하지 못함).
2. 환경 변수 4개(`.env.example` 참고)를 넣는다. `CRON_SECRET`은 긴 임의 문자열.
3. `vercel.json`이 함수 지역(서울 `icn1`)과 매일 1회 정지 방지 Cron(한국 시각 새벽 3시)을 설정한다. 배포 후 Vercel 대시보드의 Cron Jobs에서 실행 기록을 확인한다.

## 점검
```bash
npm run test:db   # DB 보안 규칙 자체 점검 (PGlite, 실제 DB 불필요)
npm run lint
npm run build
```

## 보안 주의
- `.env.local`은 절대 커밋하지 않는다 (`.gitignore`에 들어 있음). 저장소가 공개라서 한 번이라도 올라가면 그대로 노출된다.
- `SUPABASE_SECRET_KEY`에는 `NEXT_PUBLIC_`을 붙이지 않는다. 붙이면 브라우저로 전송된다.
- 새 테이블은 Data API에 자동으로 열리지 않는다. 마이그레이션에서 `grant`와 RLS 규칙을 함께 쓴다.
