# CLAUDE.md

## 프로젝트 소개

**LifeCut** — 빈티지 감성 인생네컷(포토부스) 웹앱. 브라우저에서 바로 네컷사진을 찍고,
"make my frame"으로 내 사진의 누끼를 따서 나만의 프레임을 만들어 친구에게 링크로 공유할 수 있다.
링크를 받은 친구는 그 사람과 "함께" 네컷을 찍는 경험을 하게 된다.

- 프로덕션: https://lifecut.vercel.app (Vercel 프로젝트 `lifecut`, 계정 gjgkwls-8064)
- ⚠️ **이 저장소는 반드시 비공개(private) 유지** — `public/hajin/`에 제작자 얼굴 사진이 들어 있다.
  공개 전환 제안 금지, 얼굴 사진을 다른 곳에 복사·업로드 금지.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 https://localhost:5173 (카메라 권한 때문에 basic-ssl로 https). `/api`는 프로덕션으로 프록시됨 |
| `npm run lint` | oxlint |
| `npm run build` | `tsc -b && vite build` |

**배포**: `npx vercel@58.9.0 deploy --prod --yes --archive=tgz`
- CLI 버전 **58.9.0 고정** — 58.9.2는 로그인돼 있어도 "Not authorized"로 실패한다.
- `--archive=tgz` 필수 — dist에 ~24MB ONNX WASM이 있어 다중 파일 업로드가 멈춘다.
- 작업 순서: 로컬 테스트 → 사용자가 명시적으로 요청할 때만 배포 → 커밋/푸시도 요청 시에만.

## 기술 스택

React 19 + Vite 8 + TypeScript. 라우터 없이 `App.tsx`의 `screen` 상태로 화면 전환.

- `@imgly/background-removal` — 브라우저 내 AI 누끼 (WASM ~24MB는 dist에 포함, 모델 ~40-80MB는 첫 사용 시 CDN에서 다운로드 후 캐시)
- `@vercel/blob` — 공유 프레임 저장 (store `lifecut-frames`, public)
- `@vercel/analytics` — 방문자 통계 (`<Analytics />`가 App.tsx에 있음)

## 구조

```
api/                  Vercel 서버리스 함수 (Web handler: export async function GET/POST)
  blob-upload.ts      클라이언트 직접 업로드용 토큰 발급 — frames/{code}/cut-N.png|meta.json 경로만 허용
  frame.ts            GET ?code= → {name, urls} 공유 프레임 조회
  invite.ts           /i/:code 초대 링크: index.html에 동적 OG 태그를 주입해 반환 (카톡/SNS 미리보기용)
src/
  App.tsx             화면 상태 머신: start → (makeFrame | count) → frame → capture → result
  components/         화면별 컴포넌트 + RetroWindow(레트로 창 공통 프레임)
  hooks/useCamera.ts  getUserMedia 카메라 훅
  utils/
    layouts.ts        LayoutSpec/Slot 정의, LAYOUTS(single/duo/strip4/hajin4/grid4/custom4), FRAMES(배경), customStrip()
    composeStrip.ts   캔버스에 컷+프레임 합성 → 최종 이미지 생성/다운로드
    cutout.ts         누끼 파이프라인: 1200px 축소 → removeBackground → 최대 연결 성분만 유지 → 알파 bbox 크롭
    frameShare.ts     publishFrame(Blob 업로드 → 공유 코드), fetchSharedFrame, shareUrlFor(/i/코드)
public/
  hajin/              ⚠️ 제작자 얼굴 누끼 이미지 (hajin4 레이아웃용) — 절대 외부 유출 금지
  frames/             프레임 배경 이미지 (gingham, star, stripe 등)
vercel.json           /i/:code → /api/invite?code=:code 리라이트
```

## 주요 플로우

1. **일반 네컷**: start → 컷 수 선택 → 프레임 배경 선택 → 촬영 → composeStrip 합성 → 저장.
   촬영 사진은 서버로 전송되지 않고 브라우저 안에서만 처리된다 (마케팅 포인트이자 지켜야 할 원칙).
2. **make my frame**: 이름 입력 → 사진 4장 업로드 → 브라우저 누끼(cutout.ts) → 미리보기(▲▼ 버튼 + 드래그 정렬)
   → 공유 시 `frames/{12자리 base36 코드}/cut-1..4.png + meta.json`을 Blob에 클라이언트 직접 업로드(4.5MB 함수 제한 우회)
   → `/i/{코드}` 공유 링크 발급. 사진 순서·이름이 바뀌면 shareCode를 무효화한다.
3. **초대 흐름**: `/i/코드`(신형) 또는 `?with=코드`(구형, 계속 지원) → App.tsx가 fetchSharedFrame
   → 홈에 "💌 you're invited" + "{이름} frame start" 버튼 → customStrip 레이아웃으로 촬영.
4. **OG 미리보기**: 크롤러가 `/i/코드`를 열면 api/invite.ts가 origin의 index.html을 받아
   `<head>` 맨 앞에 동적 og 태그를 삽입해 반환한다 (같은 property가 중복이면 크롤러는 첫 번째를 사용).
   **이름은 반드시 HTML 이스케이프** — 사용자 입력이 HTML에 들어간다.

## 규칙과 함정

- **언어**: 사용자와는 한국어로 대화. UI 텍스트는 make-my-frame 플로우만 한국어(Noto Serif KR),
  창 타이틀·"← back"/"← home" 버튼·촬영 이후 화면은 영어 유지.
- **폰트**: Playfair Display에는 한글 글리프가 없다 — 한글이 들어가는 곳은 Noto Serif KR을 써야 한다.
- **오버레이 수치 동기화**: App.css의 `.camera-overlay`(너비 65%, 좌하단 정렬, contain)와
  CaptureScreen의 `OVERLAY_MAX_WIDTH = 0.65`는 같은 기하를 표현한다. 하나를 바꾸면 둘 다 바꿀 것.
- **캔버스 오염 방지**: 외부(blob 스토리지) 이미지는 `crossOrigin='anonymous'`로 로드한다 (loadImage 참고).
- **비밀값**: `.env.local`(BLOB_READ_WRITE_TOKEN — 값이 큰따옴표로 감싸져 있어 파싱 시 제거 필요),
  `.vercel/`, `.claude/`는 절대 커밋하지 않는다. 토큰은 셸 변수로만 다루고 출력하지 않는다.
- **터치 드래그**: 컷 정렬 드래그는 마우스는 셀 전체, 터치는 ⠿ 손잡이만 (`touch-action: none`은 손잡이에만 —
  페이지 스크롤과의 충돌 방지). 셀 key는 `key={src}`여야 포인터 캡처가 이동한 DOM을 따라간다.
