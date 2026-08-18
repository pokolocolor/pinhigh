const $ = id => document.getElementById(id);

const STORAGE = {
  rooms: 'pinhigh_rooms_v2',
  people: 'pinhigh_people_v2',
  database: 'pinhigh_participant_database_v2',
  github: 'pinhigh_github_db_settings_v1'
};

const SHARED_DB_PATH = 'data/participants.json';
let githubSettings = readObject(STORAGE.github, { owner: '', repo: '', branch: 'main', token: '' });
let sharedDatabaseLoaded = false;

function readJSON(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function readObject(key, fallback = {}) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

let rooms = readJSON(STORAGE.rooms);
let people = readJSON(STORAGE.people);
let participantDB = readJSON(STORAGE.database);

// 기존 버전 데이터가 있으면 참가자 DB로 자동 이전합니다.
if (!participantDB.length) {
  const oldPeople = readJSON('pinhigh_people');
  if (oldPeople.length) {
    participantDB = oldPeople.map(p => ({ name: String(p.name || '').trim(), left: !!p.left }))
      .filter(p => p.name);
    localStorage.setItem(STORAGE.database, JSON.stringify(participantDB));
  }
}

function saveCurrent() {
  localStorage.setItem(STORAGE.rooms, JSON.stringify(rooms));
  localStorage.setItem(STORAGE.people, JSON.stringify(people));
}

function saveDatabase() {
  localStorage.setItem(STORAGE.database, JSON.stringify(participantDB));
}

function saveGithubSettings() {
  localStorage.setItem(STORAGE.github, JSON.stringify(githubSettings));
}

function normalizePeople(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach(p => {
    const name = String(p?.name || '').trim();
    if (name) map.set(name, { name, left: !!p.left });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

function githubConfigured() {
  return !!(githubSettings.owner && githubSettings.repo && githubSettings.branch);
}

function setSyncStatus(message, good = false) {
  const el = $('syncStatus');
  if (!el) return;
  el.textContent = message;
  el.style.color = good ? '#d9b9ff' : '';
}

async function loadSharedDatabase() {
  setSyncStatus('GitHub 공유 DB 불러오는 중...');
  try {
    const url = `${SHARED_DB_PATH}?v=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('participants.json 형식 오류');
    participantDB = normalizePeople(data);
    saveDatabase();
    sharedDatabaseLoaded = true;
    setSyncStatus(`공유 DB 연결됨 · ${participantDB.length}명`, true);
    render();
  } catch (error) {
    sharedDatabaseLoaded = false;
    setSyncStatus('공유 DB를 불러오지 못했습니다 · 이 브라우저의 저장 DB를 사용합니다.');
  }
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function saveDatabaseToGithub() {
  if (!githubConfigured()) {
    alertUser('먼저 GitHub 공유 DB 설정에서 사용자/조직명, 저장소, 브랜치를 입력해주세요.');
    document.querySelector('.github-settings')?.setAttribute('open', '');
    return;
  }
  if (!githubSettings.token) {
    alertUser('GitHub에 저장하려면 Fine-grained Token이 필요합니다.');
    document.querySelector('.github-settings')?.setAttribute('open', '');
    return;
  }

  const base = `https://api.github.com/repos/${encodeURIComponent(githubSettings.owner)}/${encodeURIComponent(githubSettings.repo)}/contents/${SHARED_DB_PATH}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${githubSettings.token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    setSyncStatus('GitHub에 참가자 DB 저장 중...');
    const getResponse = await fetch(`${base}?ref=${encodeURIComponent(githubSettings.branch)}`, { headers, cache: 'no-store' });
    let sha = null;
    if (getResponse.ok) {
      const file = await getResponse.json();
      sha = file.sha;
    } else if (getResponse.status !== 404) {
      throw new Error(`조회 실패 (${getResponse.status})`);
    }

    const content = JSON.stringify(normalizePeople(participantDB), null, 2) + '\n';
    const payload = {
      message: `Update participant database (${new Date().toISOString()})`,
      content: utf8ToBase64(content),
      branch: githubSettings.branch
    };
    if (sha) payload.sha = sha;

    const putResponse = await fetch(base, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!putResponse.ok) {
      const detail = await putResponse.text();
      throw new Error(`저장 실패 (${putResponse.status}) ${detail.slice(0, 160)}`);
    }

    sharedDatabaseLoaded = true;
    setSyncStatus(`GitHub 저장 완료 · ${participantDB.length}명`, true);
    toast('참가자 DB를 GitHub에 저장했습니다.');
  } catch (error) {
    console.error(error);
    setSyncStatus('GitHub 저장 실패');
    alertUser(`GitHub 저장에 실패했습니다.\n\n${error.message}`);
  }
}

function updateGithubFields() {
  $('githubOwnerInput').value = githubSettings.owner || '';
  $('githubRepoInput').value = githubSettings.repo || '';
  $('githubBranchInput').value = githubSettings.branch || 'main';
  $('githubTokenInput').value = githubSettings.token || '';
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.classList.remove('show'), 2200);
}

function alertUser(msg) {
  window.alert(msg);
}

function esc(s) {
  return String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function render() {
  $('roomCount').textContent = `${rooms.length}개`;
  $('personCount').textContent = `${people.length}명`;
  $('databaseCount').textContent = `${participantDB.length}명`;

  $('roomEmpty').style.display = rooms.length ? 'none' : 'block';
  $('personEmpty').style.display = people.length ? 'none' : 'block';
  $('databaseEmpty').style.display = participantDB.length ? 'none' : 'block';

  $('roomList').innerHTML = rooms.map((r, i) => `
    <div class="chip">
      <span>${esc(r.name)}번 방</span>
      ${r.left ? '<small>좌타</small>' : ''}
      <button type="button" onclick="removeRoom(${i})" aria-label="${esc(r.name)}번 방 삭제">×</button>
    </div>
  `).join('');

  $('personList').innerHTML = people.map((p, i) => `
    <div class="chip">
      <span>${esc(p.name)}</span>
      ${p.left ? '<small>좌타</small>' : ''}
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
          ${p.left ? '<span class="db-badge">좌타</span>' : ''}
          <span class="db-action">${selected ? '등록됨' : '+ 등록'}</span>
        </button>
        <button type="button" class="db-delete" onclick="removeFromDB(${i})" aria-label="${esc(p.name)} DB 삭제">×</button>
      </div>
    `;
  }).join('');
}

function addRoom() {
  // 방 번호는 숫자만 허용합니다. 모바일에서 숫자 키패드를 띄우기 위해 inputmode=numeric을 사용합니다.
  const raw = $('roomInput').value.trim();
  const name = raw.replace(/\D/g, '');
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
  $('roomInput').value = '';
  $('leftRoomToggle').checked = false;
  saveCurrent();
  render();
  $('roomInput').focus();
}

function upsertDatabase(name, left) {
  const index = participantDB.findIndex(p => p.name === name);
  if (index === -1) participantDB.push({ name, left });
  else participantDB[index].left = left;
  participantDB = normalizePeople(participantDB);
  saveDatabase();
}

function addPerson(name, left) {
  name = String(name || '').trim();
  if (!name) {
    alertUser('참석자 이름을 입력해주세요.');
    $('personInput').focus();
    return false;
  }
  if (people.some(p => p.name === name)) {
    alertUser(`${name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return false;
  }

  people.push({ name, left: !!left });
  upsertDatabase(name, !!left);
  saveCurrent();
  render();
  return true;
}

function addPersonFromInput() {
  const name = $('personInput').value.trim();
  const left = $('leftPersonToggle').checked;
  if (addPerson(name, left)) {
    $('personInput').value = '';
    $('leftPersonToggle').checked = false;
    $('personInput').focus();
  }
}

function addPersonFromDB(index) {
  const person = participantDB[index];
  if (!person) return;
  if (people.some(p => p.name === person.name)) {
    alertUser(`${person.name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return;
  }
  if (addPerson(person.name, person.left)) {
    toast(`${person.name}님을 참석자로 등록했습니다.`);
  }
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
  const person = people[i];
  if (!person) return;
  if (!window.confirm(`${person.name}님을 이번 모임에서 삭제할까요?\n참가자 DB에서는 삭제되지 않습니다.`)) return;
  people.splice(i, 1);
  saveCurrent();
  render();
}

function removeFromDB(i) {
  const person = participantDB[i];
  if (!person) return;
  if (!window.confirm(`${person.name}님을 참가자 DB에서도 삭제할까요?`)) return;
  participantDB.splice(i, 1);
  saveDatabase();
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
  // extra는 0..roomCount 범위. extra개의 방만 3명, 나머지는 2명.
  const sizes = Array(roomCount).fill(2);
  shuffle(Array.from({ length: roomCount }, (_, i) => i))
    .slice(0, extra)
    .forEach(i => { sizes[i] = 3; });
  return sizes;
}

function buildAssignments() {
  const shuffledRooms = shuffle(rooms);
  const sizes = getGroupSizes(shuffledRooms.length, people.length);
  const groups = shuffledRooms.map((room, i) => ({
    room,
    capacity: sizes[i],
    people: []
  }));

  const leftPeople = shuffle(people.filter(p => p.left));
  const normalPeople = shuffle(people.filter(p => !p.left));

  // 1순위: 좌타자는 좌타방에 우선 배정. 좌타방의 남는 자리는 일반 참석자가 채웁니다.
  const leftGroups = shuffle(groups.filter(g => g.room.left));
  const otherGroups = shuffle(groups.filter(g => !g.room.left));
  const remainingSlots = () => groups.reduce((sum, g) => sum + (g.capacity - g.people.length), 0);

  for (const person of leftPeople) {
    const target = leftGroups.find(g => g.people.length < g.capacity);
    if (target) target.people.push(person);
    else {
      const fallback = shuffle(groups.filter(g => g.people.length < g.capacity))[0];
      fallback.people.push(person);
    }
  }

  for (const person of normalPeople) {
    const candidates = shuffle(groups.filter(g => g.people.length < g.capacity));
    candidates.sort((a, b) => {
      const aLeftNeed = a.room.left ? 0 : 1;
      const bLeftNeed = b.room.left ? 0 : 1;
      return aLeftNeed - bLeftNeed || (a.people.length - b.people.length);
    });
    candidates[0].people.push(person);
  }

  return groups;
}

function validateForDraw() {
  const roomCount = rooms.length;
  const personCount = people.length;

  if (!roomCount) {
    alertUser('방이 등록되지 않았습니다.\n먼저 방을 등록해주세요.');
    return false;
  }
  if (!personCount) {
    alertUser('참석자가 등록되지 않았습니다.\n먼저 참석자를 등록해주세요.');
    return false;
  }

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

function draw() {
  if (!validateForDraw()) return;

  const groups = buildAssignments();
  const valid = groups.length === rooms.length && groups.every(g => g.people.length >= 2 && g.people.length <= 3);

  if (!valid) {
    alertUser('방배정 조건을 만족하는 결과를 만들지 못했습니다.\n다시 한 번 시도해주세요.');
    return;
  }

  // 배정 결과는 항상 방 번호 오름차순으로 표시합니다.
  groups.sort((a, b) => {
    const na = Number(a.room.name);
    const nb = Number(b.room.name);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.room.name).localeCompare(String(b.room.name), 'ko', { numeric: true });
  });

  $('result').innerHTML = `
    <div class="result-card">
      <div class="result-head">
        <strong>🎉 방배정 완료</strong>
        <span>${people.length}명 · ${groups.length}개 방</span>
      </div>
      <div class="assignment">
        ${groups.map(g => `
          <div class="room-result">
            <div class="room-result-title">
              <b>🏌️ ${esc(g.room.name)}번 방</b>
              <span>${g.people.length}명 ${g.room.left ? '· 좌타방' : ''}</span>
            </div>
            <div class="result-people">
              ${g.people.map(p => `<span class="person ${p.left ? 'left' : ''}">${esc(p.name)}${p.left ? ' · 좌타' : ''}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

$('addRoomBtn').addEventListener('click', addRoom);
$('addPersonBtn').addEventListener('click', addPersonFromInput);
$('drawBtn').addEventListener('click', draw);
$('roomInput').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });
$('roomInput').addEventListener('keydown', e => { if (e.key === 'Enter') addRoom(); });
$('personInput').addEventListener('keydown', e => { if (e.key === 'Enter') addPersonFromInput(); });
$('helpBtn').addEventListener('click', () => $('helpDialog').showModal());
$('closeHelp').addEventListener('click', () => $('helpDialog').close());
$('reloadDatabaseBtn').addEventListener('click', loadSharedDatabase);
$('saveDatabaseGithubBtn').addEventListener('click', saveDatabaseToGithub);
$('saveGithubSettingsBtn').addEventListener('click', () => {
  githubSettings = {
    owner: $('githubOwnerInput').value.trim(),
    repo: $('githubRepoInput').value.trim(),
    branch: $('githubBranchInput').value.trim() || 'main',
    token: $('githubTokenInput').value.trim()
  };
  saveGithubSettings();
  setSyncStatus(githubConfigured() ? 'GitHub 설정이 저장되었습니다.' : 'GitHub 저장소 정보를 입력해주세요.');
  toast('GitHub 공유 DB 설정을 저장했습니다.');
});
$('clearDatabaseBtn').addEventListener('click', () => {
  if (!participantDB.length) {
    alertUser('삭제할 참가자 DB가 없습니다.');
    return;
  }
  if (!window.confirm('저장된 참가자 DB를 모두 삭제할까요?\n현재 모임 참석자는 삭제되지 않습니다.')) return;
  participantDB = [];
  saveDatabase();
  render();
  setSyncStatus('참가자 DB를 비웠습니다. GitHub에 반영하려면 저장 버튼을 눌러주세요.');
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

updateGithubFields();
render();
loadSharedDatabase();
