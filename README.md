# 핀하이 정모 방뽑기

모바일 최적화 순수 HTML/CSS/JavaScript 웹앱입니다. GitHub Pages에 그대로 업로드할 수 있습니다.

## 주요 기능
- 방 번호 입력: 모바일 숫자 키패드(`type=tel`, `inputmode=numeric`) 사용
- 방 표시: `1번 방`, `2번 방` 형식
- 좌타방 / 좌타자 설정
- 참가자 데이터베이스: 최초 등록 이름을 기기에 저장하고 다음 모임에서 이름 버튼을 눌러 재등록
- 참가자 DB는 현재 모임 초기화와 별도로 유지
- 랜덤 방배정: **모든 등록 방에 반드시 2명 또는 3명** 배정
- 참가자 수가 `방 수 × 2` 미만이면 참가자 부족 알럿
- 참가자 수가 `방 수 × 3` 초과이면 방 부족 알럿
- 방 또는 참석자가 없으면 알럿
- 데이터는 브라우저 `localStorage`에 저장

## GitHub Pages
저장소 루트에 `index.html`, `app.js`, `style.css`, `assets/`를 업로드한 뒤
GitHub 저장소의 `Settings → Pages → Deploy from a branch → main / (root)`로 설정하세요.

## 주의
참가자 DB는 서버 DB가 아니라 **현재 사용하는 휴대폰/브라우저의 localStorage**입니다. 다른 기기와 공유되는 중앙 DB가 필요하다면 Firebase/Supabase 같은 백엔드를 추가해야 합니다.
