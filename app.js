const $ = id => document.getElementById(id);

const STORAGE = {
  rooms: 'pinhigh_rooms_v3',
  people: 'pinhigh_people_v4',
  database: 'pinhigh_participant_database_v4'
};

let participantDB = normalizePeople(readJSON(STORAGE.database));
let rooms = normalizeRooms(readJSON(STORAGE.rooms));
let people = normalizePeople(readJSON(STORAGE.people));

function readJSON(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
}

function normalizePeople(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach(p => {
    if (typeof p === 'string') {
      const name = p.trim();
      if (name) map.set(name, { name, left: false });
    } else if (p && typeof p === 'object') {
      const name = String(p.name || '').trim();
      if (name) map.set(name, { name, left: !!p.left });
    }
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

function roomNumber(room) {
  return Number.parseInt(String(room?.name ?? '').replace(/\D/g, ''), 10);
}

function compareRooms(a, b) {
  const na = roomNumber(a), nb = roomNumber(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  if (Number.isFinite(na)) return -1;
  if (Number.isFinite(nb)) return 1;
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'ko', { numeric: true });
}

function normalizeRooms(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach(r => {
    const name = typeof r === 'string' ? r.replace(/\D/g, '') : String(r?.name || '').replace(/\D/g, '');
    if (name) map.set(name, { name, left: !!r?.left });
  });
  return [...map.values()].sort(compareRooms);
}

function saveCurrent() {
  rooms = normalizeRooms(rooms);
  people = normalizePeople(people);
  localStorage.setItem(STORAGE.rooms, JSON.stringify(rooms));
  localStorage.setItem(STORAGE.people, JSON.stringify(people));
}

function saveDatabaseLocal() {
  participantDB = normalizePeople(participantDB);
  localStorage.setItem(STORAGE.database, JSON.stringify(participantDB));
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove('show'), 2600);
}

function alertUser(msg) { window.alert(msg); }

function esc(s) {
  return String(s).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function leftTag(isLeft) {
  return isLeft ? '<small class="left-tag">좌타</small>' : '';
}

function render() {
  rooms = normalizeRooms(rooms);
  people = normalizePeople(people);
  participantDB = normalizePeople(participantDB);

  $('roomCount').textContent = `${rooms.length}개`;
  $('personCount').textContent = `${people.length}명`;
  $('databaseCount').textContent = `${participantDB.length}명`;
  $('roomEmpty').style.display = rooms.length ? 'none' : 'block';
  $('personEmpty').style.display = people.length ? 'none' : 'block';
  $('databaseEmpty').style.display = participantDB.length ? 'none' : 'block';

  $('roomList').innerHTML = rooms.map((r, i) => `
    <div class="chip">
      <span>${esc(r.name)}번 방</span>
      ${leftTag(r.left)}
      <button type="button" onclick="removeRoom(${i})" aria-label="${esc(r.name)}번 방 삭제">×</button>
    </div>
  `).join('');

  $('personList').innerHTML = people.map((p, i) => `
    <div class="chip">
      <span>${esc(p.name)}</span>
      ${leftTag(p.left)}
      <button type="button" onclick="removePerson(${i})" aria-label="${esc(p.name)} 삭제">×</button>
    </div>
  `).join('');

  const currentNames = new Set(people.map(p => p.name));
  $('databaseList').innerHTML = participantDB.map((p, i) => {
    const selected = currentNames.has(p.name);
    return `
      <div class="db-row">
        <button type="button" class="db-person-btn ${selected ? 'selected' : ''}" onclick="addPersonFromDB(${i})" ${selected ? 'disabled' : ''}>
          <span class="db-name">${esc(p.name)}</span>
          ${leftTag(p.left)}
          <span class="db-action">${selected ? '등록됨' : '+ 등록'}</span>
        </button>
        <button type="button" class="db-delete" onclick="removeFromDB(${i})" aria-label="${esc(p.name)} DB 삭제">×</button>
      </div>
    `;
  }).join('');
}

function addRoom() {
  const raw = $('roomInput').value.trim();
  const name = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!name) {
    alertUser('방 번호를 숫자로 입력해주세요.');
    $('roomInput').focus();
    return;
  }
  if (rooms.some(r => r.name === name)) {
    alertUser(`${name}번 방은 이미 등록되어 있습니다.`);
    return;
  }
  rooms.push({ name, left: $('leftRoomToggle').checked });
  rooms = normalizeRooms(rooms);
  $('roomInput').value = '';
  $('leftRoomToggle').checked = false;
  saveCurrent();
  render();
  $('roomInput').focus();
}

function addPerson(name) {
  name = String(name || '').trim();
  const left = $('leftPersonToggle').checked;
  if (!name) {
    alertUser('참석자 이름을 입력해주세요.');
    $('personInput').focus();
    return false;
  }
  if (people.some(p => p.name === name)) {
    alertUser(`${name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return false;
  }

  people.push({ name, left });
  participantDB = normalizePeople([...participantDB, { name, left }]);
  saveCurrent();
  saveDatabaseLocal();
  render();
  toast(`${name}${left ? ' (좌타)' : ''}님을 참석자로 등록했습니다.`);
  return true;
}

function addPersonFromInput() {
  const name = $('personInput').value.trim();
  if (addPerson(name)) {
    $('personInput').value = '';
    $('leftPersonToggle').checked = false;
    $('personInput').focus();
  }
}

function addPersonFromDB(index) {
  const entry = participantDB[index];
  if (!entry) return;
  if (people.some(p => p.name === entry.name)) {
    alertUser(`${entry.name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return;
  }
  people.push({ name: entry.name, left: entry.left });
  saveCurrent();
  render();
  toast(`${entry.name}${entry.left ? ' (좌타)' : ''}님을 참석자로 등록했습니다.`);
}

function removeRoom(i) {
  const room = rooms[i];
  if (!room) return;
  if (!window.confirm(`${room.name}번 방을 삭제할까요?`)) return;
  rooms.splice(i, 1);
  saveCurrent();
  render();
}

function removePerson(i) {
  const p = people[i];
  if (!p) return;
  if (!window.confirm(`${p.name}님을 이번 모임에서 삭제할까요?\n참가자 DB에서는 삭제되지 않습니다.`)) return;
  people.splice(i, 1);
  saveCurrent();
  render();
}

function removeFromDB(i) {
  const p = participantDB[i];
  if (!p) return;
  if (!window.confirm(`${p.name}님을 참가자 DB에서도 삭제할까요?`)) return;
  participantDB.splice(i, 1);
  saveDatabaseLocal();
  render();
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getGroupSizes(roomCount, personCount) {
  const min = roomCount * 2;
  const extra = personCount - min;
  const sizes = Array(roomCount).fill(2);
  shuffle(Array.from({ length: roomCount }, (_, i) => i)).slice(0, extra).forEach(i => { sizes[i] = 3; });
  return sizes;
}

function buildAssignments() {
  const shuffledRooms = shuffle(normalizeRooms(rooms));
  const sizes = getGroupSizes(shuffledRooms.length, people.length);
  const groups = shuffledRooms.map((room, i) => ({ room, capacity: sizes[i], people: [] }));

  const leftPeople = shuffle(people.filter(p => p.left));
  const rightPeople = shuffle(people.filter(p => !p.left));

  const leftRoomGroups = shuffle(groups.filter(g => g.room.left));
  let li = 0;
  leftRoomGroups.forEach(group => {
    while (group.people.length < group.capacity && li < leftPeople.length) {
      group.people.push(leftPeople[li++]);
    }
  });

  const remaining = shuffle([...rightPeople, ...leftPeople.slice(li)]);
  let cursor = 0;
  groups.forEach(group => {
    while (group.people.length < group.capacity) {
      group.people.push(remaining[cursor++]);
    }
  });

  return groups;
}

function validateForDraw() {
  const roomCount = rooms.length;
  const personCount = people.length;
  if (!roomCount) { alertUser('방이 등록되지 않았습니다.\n먼저 방을 등록해주세요.'); return false; }
  if (!personCount) { alertUser('참석자가 등록되지 않았습니다.\n먼저 참석자를 등록해주세요.'); return false; }
  const minPeople = roomCount * 2;
  const maxPeople = roomCount * 3;
  if (personCount < minPeople) {
    alertUser(`참석자가 부족합니다.\n\n현재: ${personCount}명\n필요: 최소 ${minPeople}명\n방 ${roomCount}개 × 최소 2명`);
    return false;
  }
  if (personCount > maxPeople) {
    alertUser(`방이 부족합니다.\n\n현재: ${personCount}명\n수용 가능: 최대 ${maxPeople}명\n방 ${roomCount}개 × 최대 3명\n\n방을 추가하거나 참석자를 줄여주세요.`);
    return false;
  }
  return true;
}

let isDrawing = false;

function draw() {
  if (isDrawing) return;
  if (!validateForDraw()) return;

  const groups = buildAssignments();
  if (!groups.every(g => g.people.length >= 2 && g.people.length <= 3)) {
    alertUser('방배정 조건을 만족하는 결과를 만들지 못했습니다. 다시 시도해주세요.');
    return;
  }
  groups.sort((a, b) => compareRooms(a.room, b.room));

  isDrawing = true;
  const btn = $('drawBtn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('drawing');
  btn.innerHTML = '<span class="dice-spin">🎲</span> 방배정 중...';

  const totalRooms = groups.length;

  $('result').innerHTML = `
    <div class="result-card">
      <div class="result-head">
        <strong>🎲 방배정 중...</strong>
        <span id="progressLabel">0/${totalRooms}개 방 완료</span>
      </div>
      <div class="assignment" id="assignmentArea">
        <div id="revealedList"></div>
        <div id="currentRoomSlot"></div>
        <div id="pendingList"></div>
      </div>
    </div>
  `;

  $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

  const shuffleDurationPerRoom = 2000;
  const shuffleInterval = 100;
  const pauseBetweenRooms = 300;

  let roomIndex = 0;
  const revealedNames = new Set();

  function renderPending() {
    const pendingCount = Math.max(0, totalRooms - roomIndex - 1);
    $('pendingList').innerHTML = Array.from({ length: pendingCount }).map(() => `
      <div class="room-result pending-room">
        <div class="room-result-title"><b>🏌️ 대기 중...</b></div>
      </div>
    `).join('');
  }

  function startRoom() {
    if (roomIndex >= totalRooms) {
      finishAll();
      return;
    }

    const currentGroup = groups[roomIndex];
    const pool = people.filter(p => !revealedNames.has(p.name));

    $('currentRoomSlot').innerHTML = `
      <div class="room-result shuffling-room">
        <div class="room-result-title"><b>🏌️ ${esc(currentGroup.room.name)}번 방</b><span>배정 중...</span></div>
        <div class="result-people" id="shuffleChips"></div>
      </div>
    `;
    renderPending();

    let elapsed = 0;
    const chipsEl = $('shuffleChips');

    function tick() {
      const previewPeople = shuffle(pool).slice(0, currentGroup.people.length);
      chipsEl.innerHTML = previewPeople.map(p => `<span class="person shuffle-chip">${esc(p.name)}</span>`).join('');
      elapsed += shuffleInterval;
      if (elapsed >= shuffleDurationPerRoom) {
        clearInterval(timer);
        finalizeRoom(currentGroup);
      }
    }

    tick();
    var timer = setInterval(tick, shuffleInterval);
  }

  function finalizeRoom(currentGroup) {
    currentGroup.people.forEach(p => revealedNames.add(p.name));
    $('currentRoomSlot').innerHTML = '';

    $('revealedList').insertAdjacentHTML('beforeend', `
      <div class="room-result reveal-item-done">
        <div class="room-result-title"><b>🏌️ ${esc(currentGroup.room.name)}번 방</b><span>${currentGroup.people.length}명${currentGroup.room.left ? ' · 좌타방' : ''}</span></div>
        <div class="result-people">${currentGroup.people.map(p => `
          <span class="person${p.left ? ' left' : ''}">${esc(p.name)}${leftTag(p.left)}</span>
        `).join('')}</div>
      </div>
    `);

    roomIndex++;
    $('progressLabel').textContent = `${roomIndex}/${totalRooms}개 방 완료`;
    setTimeout(startRoom, pauseBetweenRooms);
  }

  function finishAll() {
    $('result').querySelector('.result-head strong').textContent = '🎉 방배정 완료';
    $('progressLabel').textContent = `${people.length}명 · ${totalRooms}개 방`;
    btn.disabled = false;
    btn.classList.remove('drawing');
    btn.innerHTML = originalHTML;
    isDrawing = false;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  startRoom();
}

// =========================================================
// 여기부터 신규 기능: 핸디 균형 배정
// 기존 랜덤 배정(draw) 로직은 위에서 전혀 수정하지 않았습니다.
// =========================================================

function currentAssignMode() {
  const checked = document.querySelector('input[name="assignMode"]:checked');
  return checked ? checked.value : 'random';
}

function updateModeUI() {
  const isHandicap = currentAssignMode() === 'handicap';
  $('handicapModeSection').style.display = isHandicap ? 'block' : 'none';
  $('modeDesc').textContent = isHandicap
    ? '입력한 핸디를 기준으로 각 방의 실력이 최대한 균형 있게 배정됩니다.'
    : '참석자를 완전히 무작위로 각 방에 배정합니다. 핸디는 배정에 영향을 주지 않습니다.';
}

document.querySelectorAll('input[name="assignMode"]').forEach(radio => {
  radio.addEventListener('change', updateModeUI);
});

// ---- 참가자(닉네임+핸디) 입력 행 관리 ----

function addHandicapRow(prefillName = '') {
  const row = document.createElement('div');
  row.className = 'handicap-row';
  row.innerHTML = `
    <input type="text" class="handicap-name" placeholder="닉네임" value="${esc(prefillName)}">
    <input type="number" class="handicap-value" placeholder="핸디" inputmode="decimal" step="0.1">
    <button type="button" class="handicap-remove" aria-label="참가자 삭제">×</button>
  `;
  row.querySelector('.handicap-remove').addEventListener('click', () => row.remove());
  $('handicapRows').appendChild(row);
}

function initHandicapRows(count = 6) {
  $('handicapRows').innerHTML = '';
  for (let i = 0; i < count; i++) addHandicapRow();
}

$('addHandicapRowBtn').addEventListener('click', () => addHandicapRow());

$('loadFromPeopleBtn').addEventListener('click', () => {
  if (!people.length) {
    alertUser('먼저 참석자를 등록해주세요.');
    return;
  }
  $('handicapRows').innerHTML = '';
  people.forEach(p => addHandicapRow(p.name));
  toast('현재 참석자 명단을 불러왔습니다. 각 참가자의 핸디를 입력해주세요.');
});

// 입력된 행들을 검증하며 { name, handicap } 배열로 변환.
// 완전히 빈 행은 조용히 무시하고, 일부만 채워진 행은 사용자에게 안내 후 중단.
function collectHandicapEntries() {
  const rows = [...document.querySelectorAll('#handicapRows .handicap-row')];
  const entries = [];

  for (const row of rows) {
    const nameInput = row.querySelector('.handicap-name');
    const handiInput = row.querySelector('.handicap-value');
    const name = nameInput.value.trim();
    const handiRaw = handiInput.value.trim();

    if (!name && !handiRaw) continue; // 빈 행은 건너뜀

    if (!name) {
      alertUser('닉네임이 입력되지 않은 참가자가 있습니다.\n모든 참가자의 닉네임을 입력해주세요.');
      nameInput.focus();
      return null;
    }

    const handicap = Number(handiRaw);
    if (handiRaw === '' || !Number.isFinite(handicap)) {
      alertUser(`${name}님의 핸디 값이 올바르지 않습니다.\n숫자로 입력해주세요.`);
      handiInput.focus();
      return null;
    }

    entries.push({ name, handicap });
  }

  if (entries.length === 0) {
    alertUser('참가자를 한 명 이상 입력해주세요.');
    return null;
  }

  return entries;
}

// ---- 핸디 균형 배정 알고리즘 ----
// 참가자를 핸디 내림차순으로 정렬한 뒤, 매번 "현재 총합이 가장 낮은 방"에
// 우선 배정하는 그리디 방식입니다. 특정 방에 상급자/하급자가 몰리는 것을
// 방지하고, 방별 총합·평균 핸디를 최대한 균등하게 맞춥니다.
function assignByHandicap(entries, roomCount) {
  const n = entries.length;
  const base = Math.floor(n / roomCount);
  const remainder = n % roomCount;

  // 나머지 인원이 어느 방에 배정될지는 무작위로 결정 (편향 방지)
  let capacities = Array.from({ length: roomCount }, (_, i) => base + (i < remainder ? 1 : 0));
  capacities = shuffle(capacities);

  const groups = capacities.map(cap => ({ capacity: cap, people: [], sum: 0 }));

  const sorted = entries.slice().sort((a, b) => b.handicap - a.handicap);

  sorted.forEach(person => {
    let target = null;
    for (const g of groups) {
      if (g.people.length >= g.capacity) continue;
      if (!target || g.sum < target.sum) target = g;
    }
    target.people.push(person);
    target.sum += person.handicap;
  });

  // 실제 방 번호는 무작위로 매칭한 뒤, 화면에는 번호 순으로 정렬해서 보여줌
  const shuffledRoomRefs = shuffle(rooms.slice(0, roomCount));
  const result = groups.map((g, i) => ({
    room: shuffledRoomRefs[i],
    people: g.people,
    sum: g.sum,
    avg: g.people.length ? g.sum / g.people.length : 0
  }));

  result.sort((a, b) => compareRooms(a.room, b.room));
  return result;
}

function renderHandicapLoading() {
  $('result').innerHTML = `
    <div class="result-card shuffling">
      <div class="result-head">
        <strong><span class="calc-spin">⚖️</span> 핸디 균형 계산 중...</strong>
        <span>참가자 실력을 분석하고 있어요...</span>
      </div>
    </div>
  `;
}

function renderHandicapResult(groups) {
  const allPeople = groups.flatMap(g => g.people);
  const totalSum = allPeople.reduce((s, p) => s + p.handicap, 0);
  const totalAvg = allPeople.length ? totalSum / allPeople.length : 0;
  const maxAvg = Math.max(...groups.map(g => g.avg), 1);

  $('result').innerHTML = `
    <div class="result-card">
      <div class="result-head">
        <strong>🎉 핸디 균형 배정 완료</strong>
        <span>${allPeople.length}명 · ${groups.length}개 방</span>
      </div>

      <div class="handicap-overview">
        <div class="overview-item"><span>전체 참가자</span><b>${allPeople.length}명</b></div>
        <div class="overview-item"><span>전체 총합 핸디</span><b>${totalSum}</b></div>
        <div class="overview-item"><span>전체 평균 핸디</span><b>${totalAvg.toFixed(2)}</b></div>
      </div>

      <div class="assignment">
        ${groups.map((g, i) => {
          const dev = g.avg - totalAvg;
          const devAbs = Math.abs(dev);
          const devClass = devAbs < 0.5 ? 'dev-good' : (devAbs < 1.5 ? 'dev-ok' : 'dev-warn');
          const barPct = maxAvg ? (g.avg / maxAvg) * 100 : 0;
          return `
            <div class="room-result reveal-item-done handicap-room" style="animation-delay: ${i * 0.15}s">
              <div class="room-result-title">
                <b>🏌️ ${esc(g.room.name)}번 방</b>
                <span>${g.people.length}명</span>
              </div>
              <div class="result-people">
                ${g.people.map(p => `
                  <span class="person">${esc(p.name)} <small class="handi-badge">핸디 ${p.handicap}</small></span>
                `).join('')}
              </div>
              <div class="handicap-stats">
                <span class="stat-chip">총합 핸디 <b>${g.sum}</b></span>
                <span class="stat-chip">평균 핸디 <b>${g.avg.toFixed(2)}</b></span>
                <span class="stat-chip ${devClass}">전체 평균과 편차 ${dev >= 0 ? '+' : ''}${dev.toFixed(2)}</span>
              </div>
              <div class="balance-bar-track">
                <div class="balance-bar-fill" style="width:${barPct}%"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

let isDrawingHandicap = false;

function drawHandicap() {
  if (isDrawingHandicap) return;

  if (!rooms.length) {
    alertUser('방이 등록되지 않았습니다.\n먼저 방을 등록해주세요.');
    return;
  }

  const entries = collectHandicapEntries();
  if (!entries) return;

  if (entries.length < rooms.length) {
    alertUser(`참가자 수가 부족합니다.\n\n현재: ${entries.length}명\n필요: 최소 ${rooms.length}명 (방 1개당 최소 1명 이상 필요)`);
    return;
  }

  isDrawingHandicap = true;
  const btn = $('drawBtn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('drawing');
  btn.innerHTML = '<span class="calc-spin">⚖️</span> 계산 중...';

  const groups = assignByHandicap(entries, rooms.length);

  renderHandicapLoading();
  $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    renderHandicapResult(groups);
    btn.disabled = false;
    btn.classList.remove('drawing');
    btn.innerHTML = originalHTML;
    isDrawingHandicap = false;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 1200);
}

// =========================================================
// 이벤트 바인딩
// =========================================================

$('addRoomBtn').addEventListener('click', addRoom);
$('addPersonBtn').addEventListener('click', addPersonFromInput);

// 방배정 버튼: 선택된 모드에 따라 기존 draw() 또는 신규 drawHandicap()으로 분기
$('drawBtn').addEventListener('click', () => {
  if (currentAssignMode() === 'handicap') {
    drawHandicap();
  } else {
    draw();
  }
});

$('roomInput').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
$('roomInput').addEventListener('keydown', e => { if (e.key === 'Enter') addRoom(); });
$('personInput').addEventListener('keydown', e => { if (e.key === 'Enter') addPersonFromInput(); });
$('helpBtn').addEventListener('click', () => $('helpDialog').showModal());
$('closeHelp').addEventListener('click', () => $('helpDialog').close());
$('clearDatabaseBtn').addEventListener('click', () => {
  if (!participantDB.length) { alertUser('삭제할 참가자 DB가 없습니다.'); return; }
  if (!window.confirm('저장된 참가자 DB를 모두 삭제할까요?\n현재 모임 참석자는 삭제되지 않습니다.')) return;
  participantDB = [];
  saveDatabaseLocal();
  render();
});
$('resetBtn').addEventListener('click', () => {
  if (!window.confirm('현재 모임의 방과 참석자를 초기화할까요?\n참가자 DB는 유지됩니다.')) return;
  rooms = [];
  people = [];
  saveCurrent();
  $('result').innerHTML = '';
  render();
  toast('현재 모임을 초기화했습니다. 참가자 DB는 유지됩니다.');
});

render();
updateModeUI();
initHandicapRows(6);
