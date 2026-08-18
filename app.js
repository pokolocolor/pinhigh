const $ = id => document.getElementById(id);

let rooms = JSON.parse(localStorage.getItem('pinhigh_rooms') || '[]');
let people = JSON.parse(localStorage.getItem('pinhigh_people') || '[]');
let participantDB = JSON.parse(localStorage.getItem('pinhigh_participant_db') || '[]');

function save(){
  localStorage.setItem('pinhigh_rooms', JSON.stringify(rooms));
  localStorage.setItem('pinhigh_people', JSON.stringify(people));
  localStorage.setItem('pinhigh_participant_db', JSON.stringify(participantDB));
}

function toast(msg){
  const el=$('toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>el.classList.remove('show'),2000);
}

function alertMessage(msg){
  window.alert(msg);
}

function esc(s){
  return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function render(){
  $('roomCount').textContent=`${rooms.length}개`;
  $('personCount').textContent=`${people.length}명`;
  $('dbCount').textContent=`${participantDB.length}명`;

  $('roomEmpty').style.display=rooms.length?'none':'block';
  $('personEmpty').style.display=people.length?'none':'block';
  $('dbEmpty').style.display=participantDB.length?'none':'block';

  $('roomList').innerHTML=rooms.map((r,i)=>
    `<div class="chip"><span>${esc(r.name)}번 방</span> ${r.left?'<small>좌타</small>':''}<button onclick="removeRoom(${i})" aria-label="방 삭제">×</button></div>`
  ).join('');

  $('personList').innerHTML=people.map((p,i)=>
    `<div class="chip"><span>${esc(p.name)}</span> ${p.left?'<small>좌타</small>':''}<button onclick="removePerson(${i})" aria-label="참석자 삭제">×</button></div>`
  ).join('');

  $('dbList').innerHTML=participantDB.map((p,i)=>{
    const registered=people.some(x=>x.name===p.name);
    return `<button class="db-person ${registered?'selected':''}" onclick="selectDBPerson(${i})" ${registered?'disabled':''}>
      <span>${esc(p.name)}</span>${p.left?'<small>좌타</small>':''}${registered?'<b>등록됨</b>':''}
    </button>`;
  }).join('');
}

function addRoom(){
  const input=$('roomInput');
  const name=input.value.trim();
  if(!/^\d+$/.test(name)){
    alertMessage('방 번호는 숫자로 입력해주세요.');
    input.focus();
    return;
  }
  const normalized=String(parseInt(name,10));
  if(rooms.some(r=>r.name===normalized)){
    alertMessage(`${normalized}번 방은 이미 등록되어 있습니다.`);
    return;
  }
  rooms.push({name:normalized,left:$('leftRoomToggle').checked});
  input.value='';
  $('leftRoomToggle').checked=false;
  save();
  render();
  input.focus();
}

function addPerson(nameOverride=null, leftOverride=null){
  const input=$('personInput');
  const name=(nameOverride ?? input.value).trim();
  if(!name){
    alertMessage('이름을 입력해주세요.');
    if(!nameOverride) input.focus();
    return;
  }
  if(people.some(p=>p.name===name)){
    alertMessage(`${name}님은 이미 이번 모임에 등록되어 있습니다.`);
    return;
  }

  const left=leftOverride === null ? $('leftPersonToggle').checked : !!leftOverride;
  people.push({name,left});

  // 한번 등록한 사람은 참가자 DB에 영구 저장합니다.
  const dbIndex=participantDB.findIndex(p=>p.name===name);
  if(dbIndex===-1){
    participantDB.push({name,left});
  }else if(leftOverride !== null){
    participantDB[dbIndex].left=left;
  }else{
    participantDB[dbIndex].left=left;
  }

  input.value='';
  $('leftPersonToggle').checked=false;
  save();
  render();
}

function selectDBPerson(i){
  const person=participantDB[i];
  if(!person) return;
  if(people.some(p=>p.name===person.name)){
    toast('이미 이번 모임에 등록된 참가자입니다.');
    return;
  }
  addPerson(person.name, person.left);
  toast(`${person.name}님을 참가자로 등록했습니다.`);
}

function removeRoom(i){
  rooms.splice(i,1);
  save();
  render();
}

function removePerson(i){
  people.splice(i,1);
  save();
  render();
}

function removeDBPerson(i){
  const person=participantDB[i];
  if(!person) return;
  if(!confirm(`${person.name}님을 참가자 DB에서도 삭제할까요?`)) return;
  participantDB.splice(i,1);
  save();
  render();
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

// 각 방에 반드시 2~3명이 들어가도록 랜덤 배정합니다.
// 좌타자는 가능한 한 좌타방에 먼저 배정하고, 남는 자리는 일반 방으로 채웁니다.
function buildAssignment(){
  const roomOrder=shuffle(rooms.map(r=>({room:r,people:[]})));
  const n=roomOrder.length;
  const total=people.length;
  if(total < n*2 || total > n*3) return null;

  // 먼저 모든 방을 2명으로 채우고, 남은 인원은 최대 1명씩 추가합니다.
  const shuffledPeople=shuffle(people.slice());
  const leftPeople=shuffle(shuffledPeople.filter(p=>p.left));
  const normalPeople=shuffle(shuffledPeople.filter(p=>!p.left));

  // 좌타방에 좌타자를 우선 배치하되, 각 방 최대 3명.
  const leftRooms=shuffle(roomOrder.filter(x=>x.room.left));
  const normalRooms=shuffle(roomOrder.filter(x=>!x.room.left));
  let leftQueue=leftPeople.slice();
  let normalQueue=normalPeople.slice();

  function put(person, candidates){
    const available=candidates.filter(x=>x.people.length<3);
    if(!available.length) return false;
    const min=Math.min(...available.map(x=>x.people.length));
    const target=shuffle(available.filter(x=>x.people.length===min))[0];
    target.people.push(person);
    return true;
  }

  // 좌타자는 좌타방을 우선으로 합니다.
  leftQueue.forEach(p=>{
    if(!put(p,leftRooms) && !put(p,roomOrder)) put(p,roomOrder);
  });

  // 남은 일반 참가자를 균등하게 채웁니다.
  normalQueue.forEach(p=>put(p,roomOrder));

  // 위 방식으로 좌타자 우선 배치 후에도 2명 미만 방이 생길 수 있으므로,
  // 최종적으로 전체 참가자를 다시 섞어 2명씩 보장하는 안정적인 패스 수행.
  const assigned=roomOrder.flatMap(x=>x.people.map(p=>({p,room:x})));
  const unassigned=shuffledPeople.filter(p=>!assigned.some(a=>a.p.name===p.name));
  unassigned.forEach(p=>put(p,roomOrder));

  // 최소 인원 보장을 위해 빈자리를 2명까지 채우는 재배치.
  for(const target of roomOrder){
    while(target.people.length<2){
      const donor=roomOrder.find(x=>x.people.length>2);
      if(!donor) break;
      // 가능하면 좌타방/좌타자 규칙을 크게 깨지 않는 범위에서 이동
      const idx=donor.people.findIndex(p=>!p.left || !target.room.left);
      const moveIndex=idx>=0?idx:donor.people.length-1;
      target.people.push(donor.people.splice(moveIndex,1)[0]);
    }
  }

  return roomOrder;
}

function draw(){
  if(!rooms.length){
    alertMessage('방이 없습니다. 먼저 방을 등록해주세요.');
    return;
  }
  if(!people.length){
    alertMessage('참가자가 없습니다. 먼저 참가자를 등록해주세요.');
    return;
  }

  const minPeople=rooms.length*2;
  const maxPeople=rooms.length*3;
  if(people.length<minPeople || people.length>maxPeople){
    alertMessage(`방 ${rooms.length}개에는 참가자 ${minPeople}~${maxPeople}명이 필요합니다.\n현재 참가자: ${people.length}명`);
    return;
  }

  const assignment=buildAssignment();
  if(!assignment || assignment.some(x=>x.people.length<2 || x.people.length>3)){
    alertMessage('모든 방에 2~3명이 배정될 수 있도록 방과 참가자 수를 확인해주세요.');
    return;
  }

  $('result').innerHTML=`<div class="result-card">
    <div class="result-head"><strong>🎉 방배정 완료</strong><span>${people.length}명 · ${assignment.length}개 방</span></div>
    <div class="assignment">${assignment.map(g=>`<div class="room-result">
      <b>🏌️ ${esc(g.room.name)}번 방 ${g.room.left?'· 좌타방':''}</b>
      ${g.people.map(p=>`<span class="person ${p.left?'left':''}">${esc(p.name)}${p.left?' · 좌타':''}</span>`).join('')}
    </div>`).join('')}</div>
  </div>`;
  $('result').scrollIntoView({behavior:'smooth',block:'center'});
}

$('addRoomBtn').onclick=addRoom;
$('addPersonBtn').onclick=()=>addPerson();
$('drawBtn').onclick=draw;
$('roomInput').addEventListener('keydown',e=>{if(e.key==='Enter')addRoom()});
$('personInput').addEventListener('keydown',e=>{if(e.key==='Enter')addPerson()});
$('helpBtn').onclick=()=>$('helpDialog').showModal();
$('closeHelp').onclick=()=>$('helpDialog').close();
$('resetBtn').onclick=()=>{
  if(confirm('이번 모임의 방과 참가자 등록을 모두 초기화할까요?\n참가자 DB는 유지됩니다.')){
    rooms=[];
    people=[];
    save();
    $('result').innerHTML='';
    render();
    toast('이번 모임 등록을 초기화했습니다. 참가자 DB는 유지됩니다.');
  }
};

render();
