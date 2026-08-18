# 핀하이 정모 방뽑기

모바일 최적화 순수 HTML/CSS/JavaScript 웹앱입니다. GitHub Pages에 그대로 업로드할 수 있습니다.

## 주요 기능
- 방 번호 입력: 모바일 숫자 키패드(`type=tel`, `inputmode=numeric`) 사용
- 방 표시: `1번 방`, `2번 방` 형식
- 좌타방 / 좌타자 설정
- 참가자 데이터베이스: 이름을 한 번 등록하면 DB에 저장하고 다음 모임에서 이름 버튼을 눌러 재등록
- 랜덤 방배정: 모든 등록 방에 반드시 2명 또는 3명 배정
- 참가자 수가 `방 수 × 2` 미만이면 참가자 부족 알럿
- 참가자 수가 `방 수 × 3` 초과이면 방 부족 알럿
- 방 또는 참석자가 없으면 알럿
- **방배정 결과는 방 번호 오름차순으로 표시**
- 현재 모임 데이터는 브라우저 localStorage에 저장
- **공유 참가자 DB는 GitHub의 `data/participants.json`을 원본으로 사용**

## GitHub Pages 공유 참가자 DB

이 프로젝트에는 `data/participants.json`이 포함되어 있습니다. GitHub Pages로 배포하면 모든 사용자가 이 파일을 읽어 동일한 참가자 DB를 볼 수 있습니다.

### 다른 사용자가 DB를 사용하는 방법

별도 설정이 필요하지 않습니다. 페이지를 열면 `data/participants.json`을 자동으로 읽습니다.

### 참가자를 GitHub DB에 저장하는 방법

GitHub 저장소에 직접 쓰려면 GitHub API 인증이 필요합니다.

1. GitHub에서 해당 저장소에 대한 **Fine-grained Personal Access Token**을 발급합니다.
2. Repository access를 해당 저장소로 제한합니다.
3. Repository permissions에서 **Contents → Read and write**를 허용합니다.
4. 웹앱의 `참가자 데이터베이스 → GitHub 공유 DB 설정`에 다음을 입력합니다.
   - GitHub 사용자/조직명
   - 저장소 이름
   - 브랜치(기본 `main`)
   - Fine-grained Token
5. `설정 저장` 후 `GitHub에 저장`을 누르면 `data/participants.json`이 GitHub에 커밋됩니다.
6. 다른 사용자는 페이지를 새로 열거나 `공유 DB 새로고침`을 누르면 업데이트된 참가자 DB를 볼 수 있습니다.

### 보안 주의

GitHub Token은 저장소 코드에 포함하지 않습니다. 웹앱에서는 입력한 Token을 해당 브라우저의 localStorage에만 저장합니다. **여러 사람이 사용하는 공개 웹사이트에서 관리자 Token을 일반 사용자에게 공개하지 않는 것이 중요합니다.** 가장 안전한 운영 방식은 일반 사용자는 DB를 읽기만 하고, DB 저장은 관리자 기기에서 수행하는 것입니다.

## GitHub Pages 배포

저장소 루트에 아래 구조가 유지되어야 합니다.

```text
index.html
app.js
style.css
assets/team-pinhigh.jpg
data/participants.json
```

GitHub 저장소의 `Settings → Pages → Deploy from a branch → main / (root)`로 설정하세요.

## 참가자 DB 파일 형식

`data/participants.json`은 다음과 같은 배열 형식입니다.

```json
[
  { "name": "홍길동", "left": false },
  { "name": "김철수", "left": true }
]
```
