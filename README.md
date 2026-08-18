# 핀하이 정모 방뽑기

모바일 최적화 순수 HTML/CSS/JavaScript 웹앱입니다. GitHub Pages에 그대로 업로드할 수 있습니다.

## 이번 버전의 핵심 기능
- 방 번호 입력: 모바일 숫자 키패드(`type=tel`, `inputmode=numeric`)
- 방 표시 및 방 목록: `1번 방`, `2번 방`, `10번 방`처럼 **숫자 기준 오름차순**
- 랜덤 방배정: 모든 방에 반드시 2명 또는 3명
- 참석자 수가 부족/초과하면 실제 브라우저 알럿으로 중단
- 참가자는 **이름만** 입력/저장
- 참가자 DB도 이름만 저장
- 참가자 DB는 GitHub `data/participants.json`을 모든 사용자가 공유
- 기존 GitHub DB에 같은 이름이 있으면 **추가 PUT을 하지 않음**
- 신규 참가자 입력 시 관리자 브라우저에서 GitHub DB를 확인한 뒤 **자동 등록**
- GitHub DB 저장 전 최신 SHA를 조회하여 동시 등록 충돌도 재확인
- iPhone 홈 화면 추가용 `apple-touch-icon`으로 `pinhigh.jpg` 사용
- Android/기타 브라우저용 Web App Manifest에서도 `pinhigh.jpg` 사용

## GitHub 설정
GitHub Pages는 정적 웹사이트이므로 GitHub 저장소 파일을 브라우저에서 수정하려면 인증 토큰이 필요합니다.

1. GitHub 저장소의 `data/participants.json`을 준비합니다.
2. Fine-grained Personal Access Token을 만들고 해당 저장소에 `Contents: Read and write` 권한을 부여합니다.
3. 웹사이트의 `GitHub 공유 DB 설정`에서 아래를 입력합니다.
   - GitHub 사용자/조직명
   - 저장소 이름
   - 브랜치 (보통 `main`)
   - Fine-grained Token
4. 설정을 저장하면 이후 **신규 참가자 이름을 등록할 때 GitHub DB로 자동 등록**됩니다.
5. GitHub에 이미 같은 이름이 있으면 중복 등록하지 않습니다.

### 보안 주의
브라우저에 입력한 GitHub Token은 해당 브라우저의 localStorage에 저장됩니다. 여러 사람에게 토큰을 공유하는 방식은 권장하지 않습니다. 일반 사용자는 공개된 `data/participants.json`을 읽을 수 있지만, 자동 등록은 쓰기 권한을 가진 관리자 브라우저에서 수행하는 것이 안전합니다.

## GitHub Pages
저장소 루트에 `index.html`, `app.js`, `style.css`, `pinhigh.jpg`, `manifest.webmanifest`, `assets/`, `data/`를 업로드한 뒤
`Settings → Pages → Deploy from a branch → main / (root)`로 설정하세요.
