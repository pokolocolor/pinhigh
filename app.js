const $ = id => document.getElementById(id);

const STORAGE = {
  rooms: 'pinhigh_rooms_v3',
  people: 'pinhigh_people_v3',
  database: 'pinhigh_participant_database_v3',
  github: 'pinhigh_github_db_settings_v2'
};

const SHARED_DB_PATH = 'data/participants.json';
let githubSettings = readObject(STORAGE.github, { owner: '', repo: '', branch: 'main', token: '' });
let participantDB = [];
let rooms = normalizeRooms(readJSON(STORAGE.rooms));
let people = normalizePeople(readJSON(STORAGE.people));

function readJSON(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
}

function readObject(key, fallback = {}) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
}

function normalizePeople(list) {
  const names = new Map();
  (Array.isArray(list) ? list : []).forEach(p => {
    const name = typeof p === 'string' ? p.trim() : String(p?.name || '').trim();
    if (name) names.set(name, name);
  });
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'ko'));
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

function saveGithubSettings() {
  localStorage.setItem(STORAGE.github, JSON.stringify(githubSettings));
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

function githubApiUrl() {
  return `https://api.github.com/repos/${encodeURIComponent(githubSettings.owner)}/${encodeURIComponent(githubSettings.repo)}/contents/${SHARED_DB_PATH}`;
}

function githubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (githubSettings.token) headers.Authorization = `Bearer ${githubSettings.token}`;
  return headers;
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

async function fetchGithubDatabase() {
  if (!githubConfigured()) throw new Error('GitHub 저장소 설정이 없습니다.');
  const response = await fetch(`${githubApiUrl()}?ref=${encodeURIComponent(githubSettings.branch)}&t=${Date.now()}`, {
    headers: githubHeaders(), cache: 'no-store'
  });
  if (response.status === 404) return { names: [], sha: null };
  if (!response.ok) throw new Error(`GitHub DB 조회 실패 (${response.status})`);
  const file = await response.json();
  const names = normalizePeople(JSON.parse(base64ToUtf8(file.content || 'W10=')));
  return { names, sha: file.sha || null };
}

async function loadSharedDatabase(showAlert = false) {
  // 공개 GitHub Pages에서는 raw 파일을 읽어 모든 사용자에게 같은 DB를 보여줍니다.
  setSyncStatus('GitHub 공유 DB 불러오는 중...');
  try {
    let names = [];
    if (githubConfigured()) {
      const result = await fetchGithubDatabase();
      names = result.names;
    } else {
      const response = await fetch(`${SHARED_DB_PATH}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      names = normalizePeople(await response.json());
    }
    participantDB = names;
    saveDatabaseLocal();
    setSyncStatus(`공유 DB 연결됨 · ${participantDB.length}명`, true);
    render();
    return true;
  } catch (error) {
    console.error(error);
    const cached = normalizePeople(readJSON(STORAGE.database));
    participantDB = cached;
    saveDatabaseLocal();
    setSyncStatus('공유 DB를 불러오지 못했습니다 · 저장된 DB를 표시합니다.');
    if (showAlert) alertUser(`GitHub 참가자 DB를 불러오지 못했습니다.\n\n${error.message}`);
    render();
    return false;
  }
}

async function writeGithubDatabase(names, sha = null) {
  if (!githubConfigured()) throw new Error('GitHub 사용자/조직명, 저장소, 브랜치를 먼저 설정해주세요.');
  if (!githubSettings.token) throw new Error('GitHub 자동 등록을 위해 Fine-grained Token이 필요합니다.');

  const content = JSON.stringify(normalizePeople(names), null, 2) + '\n';
  const payload = {
    message: 'Update participant database',
    content: utf8ToBase64(content),
    branch: githubSettings.branch
  };
  if (sha) payload.sha = sha;

  const response = await fetch(githubApiUrl(), {
    method: 'PUT',
    headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub 저장 실패 (${response.status}) ${detail.slice(0, 180)}`);
  }
}

async function autoRegisterParticipant(name) {
  if (!githubConfigured() || !githubSettings.token) {
    setSyncStatus('참가자 등록 완료 · GitHub 자동등록 설정 필요');
    return { registered: false, reason: 'not-configured' };
  }

  setSyncStatus(`GitHub에서 ${name}님 중복 확인 중...`);
  try {
    // 항상 GitHub의 최신 파일을 다시 읽고 비교합니다. 이미 있으면 PUT을 하지 않습니다.
    let remote = await fetchGithubDatabase();
    if (remote.names.some(existing => existing === name)) {
      participantDB = remote.names;
      saveDatabaseLocal();
      setSyncStatus(`GitHub DB에 이미 등록됨 · ${participantDB.length}명`, true);
      render();
      return { registered: false, duplicate: true };
    }

    const merged = normalizePeople([...remote.names, name]);
    try {
      await writeGithubDatabase(merged, remote.sha);
    } catch (error) {
      // 동시에 다른 사용자가 등록해 SHA가 바뀐 경우 최신 파일을 한 번 더 읽고 중복이면 종료합니다.
      if (String(error.message).includes('409')) {
        remote = await fetchGithubDatabase();
        if (remote.names.includes(name)) {
          participantDB = remote.names;
          saveDatabaseLocal();
          setSyncStatus(`GitHub DB에 이미 등록됨 · ${participantDB.length}명`, true);
          render();
          return { registered: false, duplicate: true };
        }
        await writeGithubDatabase(normalizePeople([...remote.names, name]), remote.sha);
      } else throw error;
    }

    participantDB = merged.includes(name) ? merged : normalizePeople([...remote.names, name]);
    saveDatabaseLocal();
    setSyncStatus(`GitHub 자동등록 완료 · ${participantDB.length}명`, true);
    render();
    return { registered: true };
  } catch (error) {
    console.error(error);
    setSyncStatus('참석자는 등록됐지만 GitHub 자동등록에 실패했습니다.');
    alertUser(`${name}님은 이번 모임에 등록됐습니다.\n\n다만 GitHub 자동등록에 실패했습니다.\n${error.message}`);
    return { registered: false, error };
  }
}

async function saveDatabaseToGithub() {
  if (!githubConfigured() || !githubSettings.token) {
    alertUser('GitHub 공유 DB 설정에서 사용자/조직명, 저장소, 브랜치와 Fine-grained Token을 입력해주세요.');
    document.querySelector('.github-settings')?.setAttribute('open', '');
    return;
  }
  try {
    setSyncStatus('GitHub DB 최신 상태 확인 중...');
    const remote = await fetchGithubDatabase();
    const merged = normalizePeople([...remote.names, ...participantDB]);
    await writeGithubDatabase(merged, remote.sha);
    participantDB = merged;
    saveDatabaseLocal();
    setSyncStatus(`GitHub 저장 완료 · ${participantDB.length}명`, true);
    render();
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
  window.__toast = setTimeout(() => el.classList.remove('show'), 2600);
}

function alertUser(msg) { window.alert(msg); }

function esc(s) {
  return String(s).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
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

  // 방 목록 자체도 숫자 오름차순으로 정렬합니다. 1, 2, 10 순서가 보장됩니다.
  $('roomList').innerHTML = rooms.map((r, i) => `
    <div class="chip">
      <span>${esc(r.name)}번 방</span>
      ${r.left ? '<small>좌타</small>' : ''}
      <button type="button" onclick="removeRoom(${i})" aria-label="${esc(r.name)}번 방 삭제">×</button>
    </div>
  `).join('');

  $('personList').innerHTML = people.map((name, i) => `
    <div class="chip"><span>${esc(name)}</span><button type="button" onclick="removePerson(${i})" aria-label="${esc(name)} 삭제">×</button></div>
  `).join('');

  const currentNames = new Set(people);
  $('databaseList').innerHTML = participantDB.map((name, i) => {
    const selected = currentNames.has(name);
    return `
      <div class="db-row">
        <button type="button" class="db-person-btn ${selected ? 'selected' : ''}" onclick="addPersonFromDB(${i})" ${selected ? 'disabled' : ''}>
          <span class="db-name">${esc(name)}</span>
          <span class="db-action">${selected ? '등록됨' : '+ 등록'}</span>
        </button>
        <button type="button" class="db-delete" onclick="removeFromDB(${i})" aria-label="${esc(name)} DB 삭제">×</button>
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

async function addPerson(name) {
  name = String(name || '').trim();
  if (!name) {
    alertUser('참석자 이름을 입력해주세요.');
    $('personInput').focus();
    return false;
  }
  if (people.includes(name)) {
    alertUser(`${name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return false;
  }

  people.push(name);
  saveCurrent();
  render();

  // 신규 참가자 입력 즉시 GitHub의 최신 DB를 확인하고, 없을 때만 자동 등록합니다.
  await autoRegisterParticipant(name);
  return true;
}

async function addPersonFromInput() {
  const name = $('personInput').value.trim();
  if (await addPerson(name)) {
    $('personInput').value = '';
    $('personInput').focus();
  }
}

async function addPersonFromDB(index) {
  const name = participantDB[index];
  if (!name) return;
  if (people.includes(name)) {
    alertUser(`${name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return;
  }
  people.push(name);
  saveCurrent();
  render();
  toast(`${name}님을 참석자로 등록했습니다.`);
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
  const name = people[i];
  if (!name) return;
  if (!window.confirm(`${name}님을 이번 모임에서 삭제할까요?\n참가자 DB에서는 삭제되지 않습니다.`)) return;
  people.splice(i, 1);
  saveCurrent();
  render();
}

function removeFromDB(i) {
  const name = participantDB[i];
  if (!name) return;
  if (!window.confirm(`${name}님을 참가자 DB에서도 삭제할까요?`)) return;
  participantDB.splice(i, 1);
  saveDatabaseLocal();
  render();
  setSyncStatus('DB에서 삭제했습니다. GitHub에 반영하려면 GitHub 저장을 눌러주세요.');
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
  // 방의 실제 랜덤 배정은 유지하되, 결과 표시 전에는 반드시 오름차순 정렬합니다.
  const shuffledRooms = shuffle(normalizeRooms(rooms));
  const sizes = getGroupSizes(shuffledRooms.length, people.length);
  const groups = shuffledRooms.map((room, i) => ({ room, capacity: sizes[i], people: [] }));
  const shuffledPeople = shuffle(people);
  let cursor = 0;
  groups.forEach(group => {
    group.people = shuffledPeople.slice(cursor, cursor + group.capacity);
    cursor += group.capacity;
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

function draw() {
  if (!validateForDraw()) return;
  const groups = buildAssignments();
  if (!groups.every(g => g.people.length >= 2 && g.people.length <= 3)) {
    alertUser('방배정 조건을 만족하는 결과를 만들지 못했습니다. 다시 시도해주세요.');
    return;
  }

  // 핵심: 표시용 배열을 다시 숫자 기준으로 정렬합니다. 1, 2, 3, 10, 11...
  groups.sort(compareRooms);

  $('result').innerHTML = `
    <div class="result-card">
      <div class="result-head"><strong>🎉 방배정 완료</strong><span>${people.length}명 · ${groups.length}개 방</span></div>
      <div class="assignment">
        ${groups.map(g => `
          <div class="room-result">
            <div class="room-result-title"><b>🏌️ ${esc(g.room.name)}번 방</b><span>${g.people.length}명${g.room.left ? ' · 좌타방' : ''}</span></div>
            <div class="result-people">${g.people.map(name => `<span class="person">${esc(name)}</span>`).join('')}</div>
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
$('reloadDatabaseBtn').addEventListener('click', () => loadSharedDatabase(true));
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
  if (githubConfigured()) loadSharedDatabase(false);
});
$('clearDatabaseBtn').addEventListener('click', async () => {
  if (!participantDB.length) { alertUser('삭제할 참가자 DB가 없습니다.'); return; }
  if (!window.confirm('저장된 참가자 DB를 모두 삭제할까요?\n현재 모임 참석자는 삭제되지 않습니다.')) return;
  participantDB = [];
  saveDatabaseLocal();
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
participantDB = normalizePeople(readJSON(STORAGE.database));
render();
loadSharedDatabase(false);
