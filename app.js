/* =========================================
   방배정 순차 진행 상태별 스타일
   ========================================= */

/* 1) 대기 중인 방: 흐릿하고 반투명하게 */
.room-result.pending-room {
  opacity: 0.35;
  filter: grayscale(0.5) blur(0.2px);
  border: 1.5px dashed #c9c9d6;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: none;
  transition: opacity 0.3s ease;
}
.room-result.pending-room .room-result-title b {
  color: #9a9aa8;
}

/* 2) 셔플 중인 방: 테두리가 무지개처럼 반짝이며 흐르는 효과 */
.room-result.shuffling-room {
  position: relative;
  border: 2px solid transparent;
  border-radius: 14px;
  background-image:
    linear-gradient(#fff, #fff),
    linear-gradient(90deg, #ff2e93, #ffb703, #4dd0e1, #ff2e93);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  background-size: 100% 100%, 300% 100%;
  background-position: 0 0, 0% 0;
  animation: shimmerBorder 1.1s linear infinite;
  box-shadow: 0 0 14px rgba(255, 46, 147, 0.35);
}

@keyframes shimmerBorder {
  0%   { background-position: 0 0, 0% 0; }
  100% { background-position: 0 0, 100% 0; }
}

/* 셔플 중 이름 칩도 살짝 떨리는 느낌 */
.room-result.shuffling-room .person.shuffle-chip {
  animation: chipJitter 0.3s ease-in-out infinite alternate;
}

@keyframes chipJitter {
  from { transform: translateY(0) scale(1); }
  to   { transform: translateY(-1px) scale(1.03); }
}

/* 3) 확정된 방: 도장 찍히는 듯한 등장 효과 */
.room-result.reveal-item-done {
  position: relative;
  overflow: hidden;
  animation: stampIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes stampIn {
  0%   { transform: scale(1.5) rotate(-6deg); opacity: 0; }
  60%  { transform: scale(0.96) rotate(1.5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

/* 도장 느낌을 살리는 '완료' 스탬프 뱃지 */
.room-result.reveal-item-done::after {
  content: '완료';
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #ff2e93;
  border: 2px solid #ff2e93;
  border-radius: 6px;
  padding: 1px 7px;
  transform: rotate(-12deg);
  opacity: 0;
  pointer-events: none;
  animation: stampMark 0.4s ease-out 0.15s forwards;
}

@keyframes stampMark {
  0%   { opacity: 0; transform: rotate(-12deg) scale(2.2); }
  70%  { opacity: 1; transform: rotate(-12deg) scale(0.85); }
  100% { opacity: 1; transform: rotate(-12deg) scale(1); }
}
