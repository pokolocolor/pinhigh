# 핀하이 정모 방뽑기

## GitHub 참가자 DB 자동저장

GitHub Pages는 정적 웹사이트라 GitHub 파일을 브라우저에서 직접 수정하려면 GitHub 인증이 필요합니다. 이 버전은 **관리자 1회 설정 후 신규 참가자 등록 시 자동 저장**합니다.

### 관리자 1회 설정
1. GitHub에서 Fine-grained Personal Access Token을 만듭니다.
2. 대상 저장소를 선택합니다.
3. Repository permissions에서 **Contents: Read and write**를 부여합니다.
4. 사이트의 `GitHub 자동저장 설정`에 사용자/조직명, 저장소, `main`, Token을 입력하고 `설정 저장`을 누릅니다.
5. 이후 새 참가자 이름을 등록하면 `data/participants.json`에 자동으로 저장됩니다.

이미 GitHub DB에 있는 이름은 다시 저장하지 않습니다. 동시 등록으로 충돌이 생겨도 최신 GitHub DB를 다시 확인해 중복을 피합니다.

### 보안
Token을 소스 코드에 넣지 않습니다. 설정값은 해당 관리자 브라우저의 localStorage에만 저장됩니다. 여러 사람이 쓰는 공용 기기에는 Token을 저장하지 마세요.
