const $ = id => document.getElementById(id);
let rooms = JSON.parse(localStorage.getItem('pinhigh_rooms') || '[]');
let people = JSON.parse(localStorage.getItem('pinhigh_people') || '[]');

function save(){
  localStorage.setItem('pinhigh_rooms', JSON.stringify(rooms));
  localStorage.setItem('pinhigh_people', JSON.stringify(people));
}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1800)}
function render(){
  $('roomCount').textContent=`${rooms.length}개`; $('personCount').textContent=`${people.length}명`;
  $('roomEmpty').style.display=rooms.length?'none':'block'; $('personEmpty').style.display=people.length?'none':'block';
  $('roomList').innerHTML=rooms.map((r,i)=>`<div class="chip">${esc(r.name)} ${r.left?'<small>좌타</small>':''}<button onclick="removeRoom(${i})" aria-label="삭제">×</button></div>`).join('');
  $('personList').innerHTML=people.map((p,i)=>`<div class="chip">${esc(p.name)} ${p.left?'<small>좌타</small>':''}<button onclick="removePerson(${i})" aria-label="삭제">×</button></div>`).join('');
}
function esc(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function addRoom(){const name=$('roomInput').value.trim();if(!name)return toast('방 번호를 입력해주세요.');if(rooms.some(r=>r.name===name))return toast('이미 등록된 방입니다.');rooms.push({name,left:$('leftRoomToggle').checked});$('roomInput').value='';$('leftRoomToggle').checked=false;save();render();}
function addPerson(){const name=$('personInput').value.trim();if(!name)return toast('이름을 입력해주세요.');if(people.some(p=>p.name===name))return toast('이미 등록된 참석자입니다.');people.push({name,left:$('leftPersonToggle').checked});$('personInput').value='';$('leftPersonToggle').checked=false;save();render();}
function removeRoom(i){rooms.splice(i,1);save();render()}
function removePerson(i){people.splice(i,1);save();render()}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function draw(){
  if(!rooms.length)return toast('먼저 방을 등록해주세요.');
  if(!people.length)return toast('먼저 참석자를 등록해주세요.');
  const leftRooms=rooms.filter(r=>r.left), normalRooms=rooms.filter(r=>!r.left);
  const leftPeople=shuffle(people.filter(p=>p.left).slice()), normalPeople=shuffle(people.filter(p=>!p.left).slice());
  // 좌타자는 좌타방을 우선 배정하고, 남는 경우 일반방에 배정한다.
  const roomPool=shuffle(rooms.map(r=>({room:r, list:[]})));
  const assigned=new Map(roomPool.map(x=>[x.room.name,x.list]));
  let availableLeft=shuffle(leftRooms.slice());
  leftPeople.forEach((p,i)=>{
    const target=availableLeft.length?availableLeft[i%availableLeft.length]:roomPool[i%roomPool.length].room;
    assigned.get(target.name).push(p);
  });
  shuffle(normalPeople).forEach((p,i)=>assigned.get(roomPool[i%roomPool.length].room.name).push(p));
  const groups=roomPool.map(x=>({room:x.room,people:assigned.get(x.room.name)})).filter(x=>x.people.length);
  $('result').innerHTML=`<div class="result-card"><div class="result-head"><strong>🎉 방배정 완료</strong><span>${people.length}명 · ${groups.length}개 방</span></div><div class="assignment">${groups.map(g=>`<div class="room-result"><b>🏌️ ${esc(g.room.name)} ${g.room.left?'· 좌타방':''}</b>${g.people.map(p=>`<span class="person ${p.left?'left':''}">${esc(p.name)}${p.left?' · 좌타':''}</span>`).join('')}</div>`).join('')}</div></div>`;
  $('result').scrollIntoView({behavior:'smooth',block:'center'});
}
$('addRoomBtn').onclick=addRoom;$('addPersonBtn').onclick=addPerson;$('drawBtn').onclick=draw;
$('roomInput').addEventListener('keydown',e=>{if(e.key==='Enter')addRoom()});$('personInput').addEventListener('keydown',e=>{if(e.key==='Enter')addPerson()});
$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
$('resetBtn').onclick=()=>{if(confirm('등록된 방과 참석자를 모두 초기화할까요?')){rooms=[];people=[];save();$('result').innerHTML='';render();toast('초기화했습니다.')}};
render();
