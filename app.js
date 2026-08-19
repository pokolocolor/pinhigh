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

function shuffleGroupsPreview() {
  const shuffledPeople = shuffle(people);
  const shuffledRoomsPreview = shuffle(rooms);
  const sizes = getGroupSizes(shuffledRoomsPreview.length, shuffledPeople.length);
  let idx = 0;
  return shuffledRoomsPreview.map((room, i) => {
    const count = sizes[i] || 2;
    const members = shuffledPeople.slice(idx, idx + count);
    idx += count;
    return { room, people: members };
  });
}

function renderPreview(groups) {
  $('result').innerHTML = `
    <div class="result-card shuffling">
      <div class="result-head"><strong>🎲 방배정 중...</strong><span>두근두근...</span></div>
      <div class="assignment">
        ${groups.map(g => `
          <div class="room-result preview">
            <div class="room-result-title"><b>🏌️ ${esc(g.room.name)}번 방</b></div>
            <div class="result-people">${g.people.map(p => `<span class="person shuffle-chip">${esc(p.name)}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderFinalResult(groups) {
  $('result').innerHTML = `
    <div class="result-card">
      <div class="result-head"><strong>🎉 방배정 완료</strong><span>${people.length}명 · ${groups.length}개 방</span></div>
      <div class="assignment">
        ${groups.map((g, i) => `
          <div class="room-result reveal-item" style="animation-delay: ${i * 0.18}s">
            <div class="room-result-title"><b>🏌️ ${esc(g.room.name)}번 방</b><span>${g.people.length}명${g.room.left ? ' · 좌타방' : ''}</span></div>
            <div class="result-people">${g.people.map(p => `
              <span class="person${p.left ? ' left' : ''}">${esc(p.name)}${leftTag(p.left)}</span>
            `).join('')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

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

  $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });

  const shuffleDuration = 1600;
  const shuffleInterval = 100;
  let elapsed = 0;

  renderPreview(shuffleGroupsPreview());
  const timer = setInterval(() => {
    renderPreview(shuffleGroupsPreview());
    elapsed += shuffleInterval;
    if (elapsed >= shuffleDuration) {
      clearInterval(timer);
      renderFinalResult(groups);
      btn.disabled = false;
      btn.classList.remove('drawing');
      btn.innerHTML = originalHTML;
      isDrawing = false;
      $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, shuffleInterval);
}

$('addRoomBtn').addEventListener('click', addRoom);
$('addPersonBtn').addEventListener('click', addPersonFromInput);
$('drawBtn').addEventListener('click', draw);
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
