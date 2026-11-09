import DATA from './data.js';
const $ = s => document.querySelector(s);
const FLOOR_NAME = {'-1':'מינוס אחד','0':'כניסה','1':'קומה עליונה'};
const FLOOR_COLOR = {'-1':'#4F8FD6','0':'#5E6782','1':'#E8837A'};
const SLAB_COLOR = {'-1':0xDCE9F8,'0':0xF1E7DA,'1':0xFADDD8};
const TYPES = DATA.types;
const ROOMS = [];
DATA.buildings.forEach(b => b.rooms.forEach(r => ROOMS.push(r)));
// photos: relative on GitHub Pages / local copies; the tab.bot copy loads them from GitHub Pages (size limits)
const IMG_BASE = /(^|\.)sites\.tab\.bot$/.test(location.hostname) ? 'https://inbal5980.github.io/katznelson-map-3d/' : '';
const dispName = r => r.num ? ((r.type==='class' && /^כיתה/.test(r.name)) ? `כיתה ${r.num}` : `${r.name.replace(/ \(מקלט\)/,'')} · ${r.num}`) : r.name;
const norm = s => (s||'').replace(/[׳״'"`\-–־\/()]/g,'').replace(/\s+/g,' ').trim().toLowerCase();

/* ---------- legend ---------- */
function buildLegend(){
  const small = innerWidth < 640;
  let h = `<details ${small?'':'open'}><summary>מקרא ▾</summary><h3>סוג החדר</h3>`;
  for (const k in TYPES) h += `<div class="row"><span class="sw" style="background:${TYPES[k][1]}"></span>${TYPES[k][0]}</div>`;
  h += `<h3 style="margin-top:8px">צבע הרצפה</h3>`;
  for (const f of ['1','0','-1']) h += `<div class="row"><span class="fl" style="background:${FLOOR_COLOR[f]}"></span>${FLOOR_NAME[f]}</div>`;
  h += `<div class="row">🛡️ חדר שהוא גם מקלט</div><div class="row">📷 יש תמונה, נוגעים כדי לראות</div></details>`;
  $('#legend').innerHTML = h;
}
buildLegend();

/* ---------- list (also 2D fallback) ---------- */
function buildList(){
  let h='';
  for (const b of DATA.buildings){
    if (!b.rooms.length) continue;
    h += `<div class="bld"><h3>${b.name}</h3>`;
    for (const f of [1,0,-1]){
      const rs = b.rooms.filter(r=>r.floor===f); if(!rs.length) continue;
      h += `<h4>${FLOOR_NAME[f]}</h4><ul>`;
      for (const r of rs) h += `<li><button data-id="${r.id}"><span class="dot" style="background:${TYPES[r.type][1]}"></span>${dispName(r)}${r.homeroom?' · '+r.homeroom:''}${r.shelter?' 🛡️':''}</button></li>`;
      h += `</ul>`;
    }
    h += `</div>`;
  }
  $('#listBody').innerHTML = h;
  $('#listBody').addEventListener('click', e=>{
    const b = e.target.closest('button[data-id]'); if(!b) return;
    const r = ROOMS.find(x=>x.id===b.dataset.id);
    if (gl){ $('#list').hidden = true; focusRoom(r); } else showCard(r);
  });
}
buildList();
$('#listBtn').onclick = ()=>{ $('#list').hidden = !$('#list').hidden; };
$('#listClose').onclick = ()=>{ $('#list').hidden = true; };

/* ---------- card ---------- */
function showCard(r){
  const ph = $('#cImg');
  ph.innerHTML = (r.img||[]).map(i=>`<figure><img src="${IMG_BASE+i.src}" alt="${i.cap||r.name}" loading="lazy" decoding="async"><figcaption>${i.cap||''}</figcaption></figure>`).join('');
  ph.hidden = !(r.img && r.img.length);
  if (!r.type){ // a place that is not a room: entrance, wing, memorial
    $('#cNum').textContent = r.kicker || 'מקום'; $('#cNum').style.background = '#FFE1D6';
    $('#cName').textContent = r.name; $('#cMeta').textContent = r.meta || ''; $('#cNote').textContent = r.note || '';
    $('#card').hidden = false; return;
  }
  const t = TYPES[r.type][0];
  $('#cNum').textContent = r.num ? `חדר ${r.num}` + (r.homeroom ? ` · ${r.homeroom}` : '') : r.buildingName;
  $('#cNum').style.background = TYPES[r.type][1]+'55';
  const nm = (r.type==='class' && r.num && /^כיתה/.test(r.name)) ? `כיתה ${r.num}` + (r.homeroom ? ` · ${r.homeroom}` : '') : r.name.replace(/ \(מקלט\)/,'');
  $('#cName').innerHTML = nm + (r.shelter?'<span class="badge">🛡️ מקלט</span>':'');
  $('#cMeta').innerHTML = `<b style="color:${FLOOR_COLOR[r.floor]}">${FLOOR_NAME[r.floor]}</b> · ${r.buildingName} · ${t}`;
  $('#cNote').textContent = r.note || (r.uncertain ? 'המיקום משוער לפי השרטוט' : '');
  $('#card').hidden = false;
}
$('#cardClose').onclick = ()=>{ $('#card').hidden = true; select(null); };

/* ---------- search ---------- */
const q = $('#q'), sugg = $('#sugg');
let active = -1, results = [];
const QUICK = ['חדר מורים','מזכירות','ספרייה','קפיטריה','מנהל','מקלט','מעבדת כימיה','יועץ'];
function renderSugg(){
  const v = norm(q.value);
  if (!v){
    sugg.innerHTML = `<li class="quick" role="presentation">${QUICK.map(x=>`<button type="button" data-q="${x}">${x}</button>`).join('')}</li>`;
    sugg.hidden = false; results=[]; return;
  }
  results = ROOMS.filter(r => norm(r.name+' '+r.buildingName+' '+(r.num||'')+' '+(r.homeroom||'')+' '+(r.alias||'')+(r.shelter?' מקלט':'')).includes(v)).slice(0,9);
  if (!results.length){ sugg.innerHTML = `<li role="option" aria-disabled="true">לא מצאתי 🤔 נסו שם של חדר או אגף</li>`; sugg.hidden=false; return; }
  sugg.innerHTML = results.map((r,i)=>`<li role="option" data-i="${i}" ${i===active?'aria-selected="true"':''}><span class="dot" style="background:${TYPES[r.type][1]}"></span><span>${dispName(r)}${r.homeroom?' · '+r.homeroom:''}</span><span class="m">${FLOOR_NAME[r.floor]}</span></li>`).join('');
  sugg.hidden = false;
}
q.addEventListener('focus', renderSugg);
q.addEventListener('input', ()=>{ active=-1; renderSugg(); });
q.addEventListener('keydown', e=>{
  if (e.key==='ArrowDown'){ active=Math.min(active+1,results.length-1); renderSugg(); e.preventDefault(); }
  else if (e.key==='ArrowUp'){ active=Math.max(active-1,0); renderSugg(); e.preventDefault(); }
  else if (e.key==='Enter'){ const r = results[Math.max(active,0)]; if (r) choose(r); }
  else if (e.key==='Escape'){ sugg.hidden = true; q.blur(); }
});
sugg.addEventListener('pointerdown', e=>{
  e.preventDefault();
  const qb = e.target.closest('button[data-q]');
  if (qb){ q.value = qb.dataset.q; active=-1; renderSugg(); return; }
  const li = e.target.closest('li[data-i]'); if (li) choose(results[+li.dataset.i]);
});
document.addEventListener('pointerdown', e=>{ if(!e.target.closest('.search')) sugg.hidden = true; });
function choose(r){ sugg.hidden = true; q.blur(); q.value = dispName(r).replace(/ \(מקלט\)/,''); if (walk) walkGoto(r); else if (gl) focusRoom(r); else showCard(r); }

/* ---------- 3D ---------- */
let gl = false, THREE, OrbitControls;
let renderer, scene, camera, controls, raycaster, pointer;
const roomMeshes = [], extraHits = [], slabs = [], labelsByFloor = {'-1':[],'0':[],'1':[]};
let mode = 'all', exploded = true, selected = null, fly = null;
const FH = 5.6;

function webglOK(){ try{ const c=document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2')||c.getContext('webgl'))); }catch(e){ return false; } }

async function init3D(){
  if (!webglOK()) throw new Error('no webgl');
  THREE = await import('./lib/three.module.min.js');
  ({OrbitControls} = await import('./lib/OrbitControls.js'));
  try { await Promise.race([document.fonts.load('700 40px Rubik'), new Promise(r=>setTimeout(r,1500))]); } catch(e){}
  const canvas = $('#c');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xFFFDF9);
  scene.fog = new THREE.Fog(0xFFFDF9, 380, 900);
  camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI*0.47; controls.minDistance = 25; controls.maxDistance = 700;
  controls.screenSpacePanning = false;
  controls.touches = {ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN};
  scene.add(new THREE.HemisphereLight(0xffffff, 0xE9DFD2, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(-60, 120, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera, {left:-90,right:90,top:110,bottom:-110,near:10,far:320});
  sun.target.position.set(50,0,50); scene.add(sun, sun.target);

  // ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({color:0xF3EEE5, roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.position.set((DATA.center||{x:50}).x,-0.05,(DATA.center||{z:45}).z); ground.receiveShadow = true; scene.add(ground);

  for (const a of DATA.areas) addArea(a);
  for (const b of DATA.buildings) addBuilding(b);
  for (const e of DATA.entrances) addEntrance(e);

  raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', e=>{ down = {x:e.clientX,y:e.clientY,t:performance.now()}; hideHint(); fly=null; });
  canvas.addEventListener('pointerup', e=>{
    if (walk){ down = null; return; }
    if (!down) return; const moved = Math.hypot(e.clientX-down.x, e.clientY-down.y); down=null;
    if (moved > 7) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(roomMeshes.filter(m=>m.material.opacity>0.5 && m.visible), false);
    if (hits.length){ const r = hits[0].object.userData.room; select(r); showCard(r); return; }
    const xh = raycaster.intersectObjects(extraHits.filter(o=>o.visible && (!o.material || o.material.opacity>0.5)), false);
    if (xh.length){ select(null); showCard(xh[0].object.userData.place); }
    else { select(null); $('#card').hidden = true; }
  });
  controls.addEventListener('start', hideHint);
  addEventListener('resize', resize); resize();
  resetView(true);
  gl = true;
  layout(true);
  initWalk();
  renderer.setAnimationLoop(tick);
  window.__map = {ready:true, rooms:ROOMS.length};
  window.__proj = name => { const m = roomMeshes.find(x=>x.userData.room.name===name); if(!m) return null;
    const v = new THREE.Vector3(m.userData.room.x, m.position.y + m.userData.h, m.userData.room.z).project(camera), rc = canvas.getBoundingClientRect();
    return {x: rc.left + (v.x+1)/2*rc.width, y: rc.top + (1-v.y)/2*rc.height}; };
}

function rrShape(w,d,r){
  const s = new THREE.Shape(), x=-w/2, y=-d/2; r=Math.min(r,w/2,d/2);
  s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+d-r);
  s.quadraticCurveTo(x+w,y+d,x+w-r,y+d); s.lineTo(x+r,y+d); s.quadraticCurveTo(x,y+d,x,y+d-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s;
}
function softBox(w,d,h,r=1){
  const g = new THREE.ExtrudeGeometry(rrShape(w,d,r), {depth:h, bevelEnabled:true, bevelThickness:0.35, bevelSize:0.3, bevelSegments:2, curveSegments:4});
  g.rotateX(-Math.PI/2); g.translate(0,0.35,0); return g;
}
function textCanvas(lines, w=512, h=256, opts={}){
  const c = document.createElement('canvas'); c.width=w; c.height=h; const x = c.getContext('2d');
  if (opts.bg){ x.fillStyle=opts.bg; const r=h/2; x.beginPath(); x.roundRect? x.roundRect(4,4,w-8,h-8,r) : x.rect(4,4,w-8,h-8); x.fill(); }
  x.direction='rtl'; x.textAlign='center'; x.textBaseline='middle';
  const n = lines.length;
  lines.forEach((ln,i)=>{
    x.font = `${ln.weight||700} ${ln.size}px Rubik, Heebo, Arial, sans-serif`; x.fillStyle = ln.color||'#1F2A44';
    let size = ln.size; while (x.measureText(ln.text).width > w-24 && size>14){ size-=2; x.font=`${ln.weight||700} ${size}px Rubik, Heebo, Arial, sans-serif`; }
    const y = n===1 ? h/2 : h*(0.5 + (i-(n-1)/2)*0.36);
    x.fillText(ln.text, w/2, y);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function shortName(r){ return r.name.replace(/ – .*$/,'').replace(/ \(מקלט\)/,'').replace('מעבדת ','מעבדת ').replace(' / ',' · '); }

function addBuilding(b){
  const group = new THREE.Group(); scene.add(group);
  const floors = b.floors.length ? b.floors : [0];
  for (const f of floors){
    // slab per floor: hugs the rooms of THAT floor (stepped wings get stepped slabs)
    const rf = b.rooms.filter(r=>r.floor===f);
    let x0=b.x, z0=b.z, x1=b.x+b.w, z1=b.z+b.d;
    if (rf.length && !b.fullSlab){ x0=Math.min(...rf.map(r=>r.x-r.w/2)); x1=Math.max(...rf.map(r=>r.x+r.w/2)); z0=Math.min(...rf.map(r=>r.z-r.d/2)); z1=Math.max(...rf.map(r=>r.z+r.d/2)); }
    const sw_=x1-x0, sd_=z1-z0;
    const slab = new THREE.Mesh(softBox(sw_+1.6, sd_+1.6, 0.7, 1.6), new THREE.MeshStandardMaterial({color:SLAB_COLOR[f], roughness:.9, transparent:true}));
    slab.position.set(x0+sw_/2, 0, z0+sd_/2); slab.receiveShadow = true; slab.castShadow = true;
    slab.userData = {floor:f, kind:'slab', baseY:0};
    const edge = new THREE.Mesh(softBox(sw_+1.9, sd_+1.9, 0.18, 1.7), new THREE.MeshBasicMaterial({color:new THREE.Color(FLOOR_COLOR[f]), transparent:true}));
    edge.position.copy(slab.position); edge.userData = {floor:f, kind:'edge', baseY:-0.12};
    group.add(slab, edge); slabs.push(slab, edge);
  }
  for (const r of b.rooms){
    const col = new THREE.Color(TYPES[r.type][1]);
    const h = r.h || (r.id==='gym' ? 7.5 : 3.0);
    const mat = new THREE.MeshStandardMaterial({color:col, roughness:.62, metalness:0, transparent:true, emissive:0x000000});
    const m = new THREE.Mesh(softBox(r.w, r.d, h, 0.9), mat);
    m.position.set(r.x, 0, r.z); m.castShadow = true; m.receiveShadow = true;
    m.userData = {room:r, floor:r.floor, kind:'room', baseY:0.7, color:col.clone(), h};
    group.add(m); roomMeshes.push(m);
    // label on the roof
    const lines = ((r.img?'📷 ':'')+(r.label||shortName(r))).split('\n').map((t,i)=>({text:t, size:i?42:54, weight:i?500:700, color:i?'#3A4560':'#1F2A44'}));
    const aspect = r.w / r.d;
    const cw = 512, ch = Math.max(128, Math.min(512, Math.round(512/aspect)));
    const tex = textCanvas(lines, cw, ch);
    const lw = Math.min(r.w-0.6, (r.d-0.6)*cw/ch), lh = lw*ch/cw;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false}));
    lab.rotation.x = -Math.PI/2; lab.position.set(r.x, 0, r.z);
    lab.userData = {floor:r.floor, kind:'label', baseY:0.7+h+0.72};
    if (r.shelter){
      const st = textCanvas([{text:'🛡️ מקלט', size:44, weight:700, color:'#B4462B'}], 256, 80, {bg:'#FFE7DF'});
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5,r.w-1), Math.min(5,r.w-1)*80/256), new THREE.MeshBasicMaterial({map:st, transparent:true, depthWrite:false}));
      sm.rotation.x = -Math.PI/2; sm.position.set(r.x, 0, r.z + r.d/2 - 1.3);
      sm.userData = {floor:r.floor, kind:'label', baseY:0.7+h+0.75};
      group.add(sm); labelsByFloor[r.floor].push(sm);
    }
    group.add(lab); labelsByFloor[r.floor].push(lab);
  }
  // building name tag (sprite)
  const tex = textCanvas([{text:(b.img?'📷 ':'')+b.name, size:46, weight:700, color:'#ffffff'}], 384, 96, {bg:'rgba(31,42,68,0.86)'});
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false}));
  const sw = b.rooms.length>3 || b.w>20 ? 11 : 8; sp.scale.set(sw, sw*96/384, 1);
  sp.position.set(b.x+b.w/2, 0, b.z - 0.5); sp.renderOrder = 10;
  sp.userData = {kind:'tag', top: Math.max(...floors), baseY: 0, bld:b};
  scene.add(sp); slabs.push(sp);
  if (b.img){ sp.userData.place = {name:b.name, kicker:'אגף', meta:'נגיעה בחדר מציגה את פרטיו', img:b.img}; extraHits.push(sp); }
}
function addArea(a){
  let mesh;
  if (a.oval){
    const g = new THREE.RingGeometry(10, 14, 64); g.scale(a.w/28, a.d/28, 1);
    mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({color:0xF2C2AE, roughness:1}));
    const inner = new THREE.Mesh(new THREE.CircleGeometry(10, 64).scale(a.w/28, a.d/28, 1), new THREE.MeshStandardMaterial({color:0xCFE8C9, roughness:1}));
    inner.rotation.x = -Math.PI/2; inner.position.set(a.x+a.w/2, 0.02, a.z+a.d/2); inner.receiveShadow = true; scene.add(inner);
  } else if (a.memorial){
    mesh = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshStandardMaterial({color:0xE6DDCF, roughness:1}));
    const stone = new THREE.Mesh(softBox(3, 1.2, 2.4, 0.4), new THREE.MeshStandardMaterial({color:0xBFB4A3}));
    stone.position.set(a.x+a.w/2, 0, a.z+a.d/2); stone.castShadow = true; scene.add(stone);
    if (a.img){ stone.userData.place = {name:a.name, kicker:'מקום בבית הספר', img:a.img}; extraHits.push(stone); }
  } else {
    mesh = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(a.w, a.d, a.corridor?1.5:3)), new THREE.MeshStandardMaterial({color:a.corridor?0xE9E1D4:0xE2EFDF, roughness:1}));
  }
  mesh.rotation.x = -Math.PI/2; mesh.position.set(a.x+a.w/2, 0.03, a.z+a.d/2); mesh.receiveShadow = true; scene.add(mesh);
  if (a.floor !== undefined){ // a corridor that belongs to a floor (the central corridor = entrance floor): rides with that floor
    mesh.geometry = new THREE.ShapeGeometry(rrShape(a.w, a.d, 1.5));
    mesh.material = new THREE.MeshStandardMaterial({color:0xD9C7A8, roughness:1, transparent:true, side:THREE.DoubleSide});
    mesh.userData = {floor:a.floor, kind:'edge', baseY:0.5}; slabs.push(mesh);
    const edge = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(a.w+0.6, a.d+0.6, 1.8)), new THREE.MeshBasicMaterial({color:new THREE.Color(FLOOR_COLOR[a.floor]), transparent:true, side:THREE.DoubleSide}));
    edge.rotation.x = -Math.PI/2; edge.position.set(a.x+a.w/2, 0, a.z+a.d/2); edge.userData = {floor:a.floor, kind:'edge', baseY:0.46}; scene.add(edge); slabs.push(edge);
    for (const fz of [0.2, 0.5, 0.8]){
      const t = textCanvas([{text:'⇕ '+a.name, size:50, weight:800, color:'#5B4630'}], 512, 96);
      const lw = Math.min(a.d*0.24, 26);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lw*96/512), new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false}));
      lab.rotation.x = -Math.PI/2; lab.rotation.z = Math.PI/2;
      lab.position.set(a.x+a.w/2, 0, a.z + a.d*fz); lab.userData = {floor:a.floor, kind:'label', baseY:0.62};
      scene.add(lab); labelsByFloor[a.floor].push(lab);
    }
    return;
  }
  if (a.trees){
    const trunkM = new THREE.MeshStandardMaterial({color:0xA88B6A, roughness:1}), leafM = new THREE.MeshStandardMaterial({color:0x9CCB8E, roughness:.9});
    const trunkG = new THREE.CylinderGeometry(0.25,0.3,1.6,8), leafG = new THREE.SphereGeometry(1.4,14,10);
    const nx = 4, nz = 4;
    for (let i=0;i<nx;i++) for (let j=0;j<nz;j++){
      if ((i===1||i===2) && (j===1||j===2)) continue; // keep the middle open for the label
      const x = a.x + a.w*(i+0.5)/nx + Math.sin(i*7+j*3)*0.6, z = a.z + a.d*(j+0.5)/nz + Math.cos(i*5+j)*0.6;
      const t = new THREE.Mesh(trunkG, trunkM); t.position.set(x,0.8,z); t.castShadow = true;
      const l = new THREE.Mesh(leafG, leafM); l.position.set(x,2.3,z); l.castShadow = true; l.scale.setScalar(0.85+0.3*Math.abs(Math.sin(i*3+j*5)));
      scene.add(t,l);
    }
  }
  const t = textCanvas([{text:a.name, size:40, weight:500, color:a.corridor?'#7A6E5E':'#4C7A55'}], 512, 96);
  const lw = a.corridor ? Math.min(a.d*0.25, 24) : Math.min(a.w*0.85, 22);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(lw, lw*96/512), new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false}));
  lab.rotation.x = -Math.PI/2; if (a.corridor) lab.rotation.z = -Math.PI/2;
  lab.position.set(a.x+a.w/2, 0.08, a.memorial ? a.z+a.d-1.5 : (a.labelZ || a.z+a.d/2)); scene.add(lab);
}
function addEntrance(e){
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.6, 24), new THREE.MeshStandardMaterial({color:0xFF7A59}));
  cone.rotation.x = Math.PI; cone.position.set(e.x, levelY(0)+5, e.z); scene.add(cone);
  cone.userData.bob = true; window.__cone = cone;
  const t = textCanvas([{text:'🚪 '+e.label+(e.img?' 📷':''), size:44, weight:700, color:'#ffffff'}], 512, 96, {bg:'#FF7A59'});
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthTest:false}));
  sp.scale.set(15, 15*96/512, 1); sp.position.set(e.x, levelY(0)+9, e.z); sp.renderOrder = 11; scene.add(sp);
  window.__entSp = sp;
  const place = {name:e.label, kicker:'כניסה', meta:'קומת הכניסה', img:e.img};
  if (e.img){ cone.userData.place = place; sp.userData.place = place; extraHits.push(cone, sp); }
}

/* layout: compute target y / opacity per object */
function levelY(f){ if (walk) return f===walk.floor ? 0 : (f > walk.floor ? 60 : -60); const gap = exploded ? FH*2.3 : FH; return (f+1)*gap; }
function layout(instant){
  const iso = mode==='all' ? null : +mode;
  const set = (o, y, op, vis=true) => { o.userData.ty = y; o.userData.top_ = op; o.userData.tvis = vis; if (instant){ o.position.y=y; setOp(o,op); o.visible = vis && op>0.01; } };
  for (const m of [...roomMeshes, ...slabs]){
    const u = m.userData;
    if (u.kind==='tag'){
      const topF = iso===null ? u.top : Math.min(u.top, iso);
      const hasIso = iso===null || u.bld.floors.includes(iso) || (!u.bld.floors.length && iso===0);
      if (walk){ set(m, levelY(topF) + 6.2, 0, false); continue; }
      set(m, levelY(topF) + 6.2, hasIso?1:0.25); continue;
    }
    let y = levelY(u.floor) + u.baseY, op = 1;
    if (walk){ set(m, y, u.floor===walk.floor ? 1 : 0, u.floor===walk.floor); continue; }
    if (iso!==null){
      if (u.floor > iso){ y += 22; op = 0; }
      else if (u.floor < iso){ op = u.kind==='room' ? 0.16 : 0.22; }
    }
    set(m, y, op);
  }
  for (const f in labelsByFloor) for (const l of labelsByFloor[f]){
    let y = levelY(+f) + l.userData.baseY, op = 1;
    if (walk){ set(l, y, 0, false); continue; }
    if (iso!==null && +f!==iso){ op = 0; if (+f>iso) y+=22; }
    set(l, y, op);
  }
  document.querySelectorAll('#chips .chip').forEach(c=>c.classList.toggle('on', c.dataset.f===String(mode)));
}
function setOp(o, op){ if (o.material){ o.material.opacity = op; o.material.depthWrite = op>0.6 && o.userData.kind!=='label' && o.userData.kind!=='tag'; } }

function select(r){
  selected = r;
  for (const m of roomMeshes){
    const on = r && m.userData.room.id===r.id;
    m.material.emissive.set(on ? 0xFF7A59 : 0x000000); m.material.emissiveIntensity = on ? 0.55 : 0;
    m.userData.sel = on;
  }
}
function focusRoom(r){
  if (mode!=='all' && +mode!==r.floor || mode==='all'){ mode = String(r.floor); layout(false); }
  select(r); showCard(r);
  const m = roomMeshes.find(x=>x.userData.room.id===r.id);
  const target = new THREE.Vector3(r.x, levelY(r.floor)+2, r.z);
  const small = innerWidth < 640;
  const dist = small ? 105 : 78;
  const pos = target.clone().add(new THREE.Vector3(-0.35, 0.95, 0.75).normalize().multiplyScalar(dist));
  fly = {t0:performance.now(), dur:1100, fromP:camera.position.clone(), fromT:controls.target.clone(), toP:pos, toT:target};
  hideHint();
}
function resetView(instant){
  const small = innerWidth/innerHeight < 0.8;
  const C = window.__center = DATA.center || {x:50,z:45}, R = (DATA.radius || 1)*1.18;
  const tgt = new THREE.Vector3(C.x, 6, C.z + (small?6:5));
  const pos = small ? new THREE.Vector3(C.x-14*R, 160*R, C.z+98*R) : new THREE.Vector3(C.x-52*R, 104*R, C.z+104*R);
  if (instant){ camera.position.copy(pos); controls.target.copy(tgt); controls.update(); }
  else fly = {t0:performance.now(), dur:1000, fromP:camera.position.clone(), fromT:controls.target.clone(), toP:pos, toT:tgt};
}
function resize(){
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.fov = walk ? (w/h < 0.8 ? 74 : 62) : (w/h < 0.8 ? 60 : 40); if (walk && $('#mini')) sizeMini(); camera.updateProjectionMatrix();
}
const ease = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
let lastT = performance.now();
function tick(now){
  const dt = Math.min(0.05, (now-lastT)/1000); lastT = now;
  const k = 1 - Math.pow(0.0008, dt);
  for (const arr of [roomMeshes, slabs, ...Object.values(labelsByFloor)]) for (const o of arr){
    const u = o.userData; if (u.ty===undefined) continue;
    o.position.y += (u.ty - o.position.y)*k;
    const cur = o.material.opacity, nxt = cur + (u.top_ - cur)*k;
    if (Math.abs(nxt-cur) > 0.0005) setOp(o, nxt);
    o.visible = nxt > 0.02;
  }
  if (selected){ const s = 0.4 + 0.25*Math.sin(now/220); for (const m of roomMeshes) if (m.userData.sel) m.material.emissiveIntensity = s; }
  if (window.__cone){ // the entrance marker floats just above the ENTRANCE floor (0), wherever that floor is drawn
    const y0 = levelY(0), hide = walk ? walk.floor!==0 : (mode!=='all' && +mode < 0);
    window.__cone.position.y = y0 + 4.6 + Math.sin(now/400)*0.6; window.__cone.visible = !hide;
    if (window.__entSp){ window.__entSp.position.y = y0 + 8.6; window.__entSp.visible = !hide; }
  }
  if (fly){
    const t = Math.min(1, (now-fly.t0)/fly.dur), e = ease(t);
    camera.position.lerpVectors(fly.fromP, fly.toP, e); controls.target.lerpVectors(fly.fromT, fly.toT, e);
    if (t>=1) fly = null;
  }
  if (walk) walkStep(Math.min(0.1, (now-wLast)/1000)); else controls.update();
  wLast = now;
  renderer.render(scene, camera);
}
let hintTimer = setTimeout(hideHint, 7000);
function hideHint(){ $('#hint').classList.add('gone'); }

$('#chips').addEventListener('click', e=>{
  const c = e.target.closest('.chip'); if (!c || !gl) return;
  mode = c.dataset.f; layout(false);
  if (selected && mode!=='all' && selected.floor!==+mode){ select(null); $('#card').hidden = true; }
});
function expLabel(){ const b=$('#explode'); b.setAttribute('aria-pressed', exploded); b.textContent = exploded ? '↕ קומות צמודות' : '↕ הפרדת קומות'; }
expLabel();
$('#explode').onclick = ()=>{ if(!gl) return; exploded = !exploded; expLabel(); layout(false); };
function topView(instant){
  const c = window.__center || {x:50,z:45}, asp = innerWidth/innerHeight;
  const tf = Math.tan(camera.fov*Math.PI/360), zs = (DATA.spanZ||170)/2+6, xs = (DATA.spanX||110)/2+6;
  const dist = Math.max(zs/tf, xs/(tf*asp)) * 1.12 + 12;
  const tgt = new THREE.Vector3(c.x, 0, c.z+2), pos = new THREE.Vector3(c.x, dist, c.z+2.5);
  if (instant){ camera.position.copy(pos); controls.target.copy(tgt); controls.update(); }
  else fly = {t0:performance.now(), dur:1000, fromP:camera.position.clone(), fromT:controls.target.clone(), toP:pos, toT:tgt};
}
window.__topView = ()=>{ exploded=false; expLabel(); layout(true); topView(true); };
$('#top').onclick = ()=>{ if(!gl) return; mode='all'; exploded=false; expLabel(); layout(false); topView(false); };
$('#reset').onclick = ()=>{ if(!gl) return; mode='all'; exploded=true; expLabel(); select(null); $('#card').hidden=true; layout(false); resetView(false); };


/* ---------- walk mode (סיור): first-person walk, added beside the 3D view ---------- */
let wLast = performance.now();
let walk = null;              // {floor, x, z, yaw, pitch, eye, saved}
const WK = {eye:1.7, speed:6.2, turn:1.9, rad:0.7, look:0.0055};
const WB = {x0:0, x1:114, z0:-6, z1:156};      // walkable site bounds
const held = {f:0, b:0, l:0, r:0};
let wLabels = null, wAreaLabels = [], wArrows = null, wPath = null, wAuto = null, wNear = null, wDrag = null, wMiniBase = null, wToastT = null;
const roomRect = (r, pad=0) => ({x0:r.x-r.w/2-0.3-pad, x1:r.x+r.w/2+0.3+pad, z0:r.z-r.d/2-0.3-pad, z1:r.z+r.d/2+0.3+pad});
const inRect = (q, x, z) => x>=q.x0 && x<=q.x1 && z>=q.z0 && z<=q.z1;
const rectDist = (q, x, z) => Math.hypot(Math.max(q.x0-x, 0, x-q.x1), Math.max(q.z0-z, 0, z-q.z1));
let wRooms = [], wSurf = [];
function walkFloorData(f){
  wRooms = ROOMS.filter(r=>r.floor===f).map(r=>({r, q:roomRect(r)}));
  wSurf = [];   // raised surfaces you step onto (building slabs, the central corridor)
  for (const b of DATA.buildings){
    const fl = b.floors.length ? b.floors : [0]; if (!fl.includes(f)) continue;
    const rf = b.rooms.filter(r=>r.floor===f);
    let x0=b.x, z0=b.z, x1=b.x+b.w, z1=b.z+b.d;
    if (rf.length && !b.fullSlab){ x0=Math.min(...rf.map(r=>r.x-r.w/2)); x1=Math.max(...rf.map(r=>r.x+r.w/2)); z0=Math.min(...rf.map(r=>r.z-r.d/2)); z1=Math.max(...rf.map(r=>r.z+r.d/2)); }
    wSurf.push({x0:x0-1.05, x1:x1+1.05, z0:z0-1.05, z1:z1+1.05, top:1.4});
  }
  for (const a of DATA.areas) if (a.floor===f) wSurf.push({x0:a.x, x1:a.x+a.w, z0:a.z, z1:a.z+a.d, top:0.5});
}
const surfTop = (x, z) => { let t = 0; for (const s of wSurf) if (inRect(s, x, z)) t = Math.max(t, s.top); return t; };
function hitRoom(x, z, pad){
  if (x<WB.x0 || x>WB.x1 || z<WB.z0 || z>WB.z1) return {edge:true};
  for (const o of wRooms){ const q=o.q; if (x>q.x0-pad && x<q.x1+pad && z>q.z0-pad && z<q.z1+pad) return o.r; }
  return null;
}
function freeSpot(x, z){
  if (!hitRoom(x, z, WK.rad+0.3)) return {x, z};
  for (let d=0.6; d<40; d+=0.6) for (let k=0; k<24; k++){
    const a = k/24*Math.PI*2, nx = x+Math.cos(a)*d, nz = z+Math.sin(a)*d;
    if (!hitRoom(nx, nz, WK.rad+0.3)) return {x:nx, z:nz};
  }
  return {x, z};
}
function wLabelText(r){
  const sh = r.shelter ? ' 🛡️' : '', ph = r.img ? '📷 ' : '';
  if (r.type==='class' && r.num && /^כיתה/.test(r.name)) return [ph+`כיתה ${r.num}`+sh, r.homeroom || r.buildingName];
  return [ph+shortName(r)+sh, r.num ? `חדר ${r.num}` : r.buildingName];
}
function makeTag(lines, col, w=448, h=150){
  const c = document.createElement('canvas'); c.width=w; c.height=h; const x = c.getContext('2d');
  x.fillStyle = 'rgba(255,255,255,0.95)'; x.strokeStyle = col; x.lineWidth = 10;
  x.beginPath(); x.roundRect ? x.roundRect(8,8,w-16,h-16,36) : x.rect(8,8,w-16,h-16); x.fill(); x.stroke();
  x.direction='rtl'; x.textAlign='center'; x.textBaseline='middle';
  lines.forEach((t,i)=>{
    let size = i ? 38 : 54; const wt = i ? 500 : 800;
    x.font = `${wt} ${size}px Rubik, Heebo, Arial, sans-serif`;
    while (x.measureText(t).width > w-44 && size>16){ size-=2; x.font = `${wt} ${size}px Rubik, Heebo, Arial, sans-serif`; }
    x.fillStyle = i ? '#5E6782' : '#1F2A44';
    x.fillText(t, w/2, lines.length===1 ? h/2 : (i ? h*0.72 : h*0.37));
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthWrite:false}));
}
function buildWalkLabels(){
  wLabels = [];
  for (const r of ROOMS){
    const sp = makeTag(wLabelText(r), TYPES[r.type][1]);
    sp.visible = false; sp.renderOrder = 5; sp.userData = {wroom:r, ar:150/448};
    scene.add(sp); wLabels.push(sp);
  }
  for (const a of DATA.areas){
    if (a.oval) continue;
    const sp = makeTag([(a.memorial?'🕯️ ':a.trees?'🌳 ':a.corridor?'⇕ ':'')+a.name], a.corridor?'#C9B48E':'#9CCB8E', 448, 104);
    sp.visible = false; sp.renderOrder = 4; sp.userData = {area:a, ar:104/448};
    sp.position.set(a.x+a.w/2, a.floor===0 ? 3.2 : 2.6, a.labelZ || (a.z+a.d/2));
    if (a.img) sp.userData.place = {name:a.name, kicker:'מקום בבית הספר', img:a.img};
    scene.add(sp); wAreaLabels.push(sp);
  }
  const sh = new THREE.Shape(); sh.moveTo(0,0.75); sh.lineTo(0.6,-0.35); sh.lineTo(0,-0.05); sh.lineTo(-0.6,-0.35); sh.closePath();
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI/2);
  wArrows = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({color:0xFF7A59, side:THREE.DoubleSide}), 600);
  wArrows.count = 0; wArrows.visible = false; wArrows.renderOrder = 3; wArrows.frustumCulled = false; scene.add(wArrows);
}
function placeWalkLabels(){
  const cx = walk.x, cz = walk.z;
  for (const sp of wLabels){
    const r = sp.userData.wroom;
    if (r.floor !== walk.floor){ sp.visible = false; continue; }
    const q = roomRect(r);
    // sit the sign on the wall facing you, above the door
    // centre of the wall that faces you
    const ox = Math.max(q.x0-cx, cx-q.x1, 0), oz = Math.max(q.z0-cz, cz-q.z1, 0);
    let px, pz;
    if (!ox && !oz){ px = r.x; pz = r.z; }
    else if (ox >= oz){ px = cx < q.x0 ? q.x0 : q.x1; pz = Math.min(Math.max(r.z, q.z0+0.8), q.z1-0.8); }
    else { pz = cz < q.z0 ? q.z0 : q.z1; px = Math.min(Math.max(r.x, q.x0+0.8), q.x1-0.8); }
    const dx = cx-px, dz = cz-pz, d = Math.hypot(dx, dz) || 1;
    px += dx/d*0.25; pz += dz/d*0.25;
    const top = 0.7 + (r.h || 3.0) + 0.35;
    sp.position.set(px, top + 0.8, pz);
    const dist = Math.hypot(px-cx, pz-cz);
    const w = Math.min(5.4, Math.max(0.95, dist*0.21));
    sp.scale.set(w, w*sp.userData.ar, 1);
    sp.material.opacity = dist > 55 ? 0 : dist > 38 ? (55-dist)/17 : 1;
    sp.visible = dist < 55;
  }
  for (const sp of wAreaLabels){
    const a = sp.userData.area, on = a.floor===undefined || a.floor===walk.floor;
    const dist = Math.hypot(sp.position.x-cx, sp.position.z-cz);
    const w = Math.min(6, Math.max(1.8, dist*0.18)); sp.scale.set(w, w*sp.userData.ar, 1);
    sp.visible = on && walk.floor <= 0 && dist < 70;
  }
}
/* ---- path (קח אותי ל...) : grid A* on 1m cells, then string-pulled ---- */
const GN = {nx: WB.x1-WB.x0+1, nz: WB.z1-WB.z0+1};
function astar(sx, sz, room){
  const nx = GN.nx, nz = GN.nz, N = nx*nz, pad = WK.rad+0.55;
  const blocked = new Uint8Array(N);
  for (let i=0;i<nx;i++) for (let j=0;j<nz;j++) if (hitRoom(WB.x0+i, WB.z0+j, pad)) blocked[i*nz+j] = 1;
  const goalQ = roomRect(room), gd = pad + 4.6;
  const h = (i,j) => Math.max(0, rectDist(goalQ, WB.x0+i, WB.z0+j) - gd);
  const si = Math.round(sx-WB.x0), sj = Math.round(sz-WB.z0);
  const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const heap = []; const push = (k,f)=>{ heap.push([f,k]); let c=heap.length-1; while(c>0){ const p=(c-1)>>1; if(heap[p][0]<=heap[c][0]) break; [heap[p],heap[c]]=[heap[c],heap[p]]; c=p; } };
  const pop = ()=>{ const top=heap[0], last=heap.pop(); if(heap.length){ heap[0]=last; let c=0; for(;;){ const l=2*c+1, r=l+1; let m=c; if(l<heap.length&&heap[l][0]<heap[m][0]) m=l; if(r<heap.length&&heap[r][0]<heap[m][0]) m=r; if(m===c) break; [heap[m],heap[c]]=[heap[c],heap[m]]; c=m; } } return top; };
  const s = si*nz+sj; if (si<0||sj<0||si>=nx||sj>=nz) return null;
  blocked[s] = 0; g[s] = 0; push(s, h(si,sj));
  const D = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  let goal = -1, it = 0;
  while (heap.length && it++ < 60000){
    const [, k] = pop(); if (done[k]) continue; done[k] = 1;
    const i = (k/nz)|0, j = k%nz;
    if (rectDist(goalQ, WB.x0+i, WB.z0+j) <= gd && seeRoom(WB.x0+i, WB.z0+j, room)){ goal = k; break; }
    for (const [di,dj,c] of D){
      const a = i+di, b = j+dj; if (a<0||b<0||a>=nx||b>=nz) continue;
      const n = a*nz+b; if (blocked[n] || done[n]) continue;
      if (di && dj && (blocked[a*nz+j] || blocked[i*nz+b])) continue;
      const ng = g[k]+c; if (ng < g[n]){ g[n]=ng; from[n]=k; push(n, ng+h(a,b)); }
    }
  }
  if (goal < 0) return null;
  const pts = []; for (let k=goal; k>=0; k=from[k]) pts.push({x:WB.x0+((k/nz)|0), z:WB.z0+k%nz});
  pts.reverse(); pts[0] = {x:sx, z:sz};
  // string-pull: keep only the corners
  const clear = (a,b)=>{ const L=Math.hypot(b.x-a.x,b.z-a.z), n=Math.ceil(L/0.3); for(let t=1;t<n;t++){ const x=a.x+(b.x-a.x)*t/n, z=a.z+(b.z-a.z)*t/n; if (hitRoom(x,z,WK.rad+0.15)) return false; } return true; };
  const out = [pts[0]]; let i = 0;
  while (i < pts.length-1){ let j = pts.length-1; while (j > i+1 && !clear(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}
function drawArrows(){
  if (!wPath){ wArrows.count = 0; wArrows.visible = false; return; }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1,1,1), Y = new THREE.Vector3(0,1,0);
  let n = 0;
  for (let s=0; s<wPath.pts.length-1 && n<600; s++){
    const a = wPath.pts[s], b = wPath.pts[s+1], L = Math.hypot(b.x-a.x, b.z-a.z); if (L < 0.01) continue;
    const ang = Math.atan2(-(b.x-a.x), -(b.z-a.z)); Q.setFromAxisAngle(Y, ang);
    for (let t = (s===0?1.6:0.4); t < L && n<600; t += 1.6){
      const x = a.x+(b.x-a.x)*t/L, z = a.z+(b.z-a.z)*t/L;
      M.compose(new THREE.Vector3(x, surfTop(x,z)+0.07, z), Q, S); wArrows.setMatrixAt(n++, M);
    }
  }
  wArrows.count = n; wArrows.instanceMatrix.needsUpdate = true; wArrows.visible = true;
}
function nearPt(r, x, z){ const q = roomRect(r); return {x:Math.min(Math.max(x, q.x0), q.x1), z:Math.min(Math.max(z, q.z0), q.z1)}; }
function seeRoom(x, z, r){   // nothing else stands between this spot and the room's nearest wall
  const p = nearPt(r, x, z), L = Math.hypot(p.x-x, p.z-z), n = Math.ceil(L/0.4);
  for (let t=1; t<n; t++){ const px = x+(p.x-x)*t/n, pz = z+(p.z-z)*t/n;
    for (const o of wRooms){ if (o.r===r) continue; if (inRect(o.q, px, pz)) return false; } }
  return true;
}
function walkGoto(r){
  stopAuto(); $('#card').hidden = true;
  const moved = r.floor !== walk.floor;
  if (moved) setWalkFloor(r.floor, true);
  const pts = astar(walk.x, walk.z, r);
  if (!pts){ wPath = null; drawArrows(); select(r); showCard(r); toast('לא מצאתי דרך לשם מכאן 🤔'); $('#wAuto').hidden = true; return; }
  wPath = {room:r, pts}; drawArrows(); select(r); showCard(r);
  if (pts.length > 1){ const p = pts[1]; walk.turnTo = Math.atan2(-(p.x-walk.x), -(p.z-walk.z)); }
  $('#wAuto').hidden = false; $('#wAuto').textContent = '▶ אוטומטי'; $('#wClear').hidden = false;
  toast((moved ? `${r.floor===0?'קומת הכניסה':FLOOR_NAME[r.floor]} · ` : '') + `📍 הולכים לפי החצים הכתומים, או לוחצים ”אוטומטי“`, 4500);
}
function clearPath(){ stopAuto(); wPath = null; if (wArrows) drawArrows(); $('#wAuto').hidden = true; $('#wClear').hidden = true; }
function stopAuto(){ if (wAuto){ wAuto = null; $('#wAuto').textContent = '▶ אוטומטי'; } }
function startAuto(){
  if (!wPath) return;
  if (wAuto){ stopAuto(); return; }
  const pts = astar(walk.x, walk.z, wPath.room); if (!pts) return;   // re-plan from where you stand
  wPath.pts = pts; drawArrows(); wAuto = {i:1}; $('#wAuto').textContent = '⏸ עצירה'; $('#card').hidden = true;
}
function arrive(){
  const r = wPath.room; walk.turnTo = undefined; stopAuto(); wPath = null; drawArrows(); $('#wAuto').hidden = true; $('#wClear').hidden = true;
  placeWalkLabels(); { const sp = wLabels.find(s=>s.userData.wroom===r), c = sp ? sp.position : nearPt(r, walk.x, walk.z);
    const d = Math.hypot(c.x-walk.x, c.z-walk.z) || 1; walk.turnTo = Math.atan2(-(c.x-walk.x), -(c.z-walk.z));
    walk.pitchTo = Math.max(-0.1, Math.min(0.45, Math.atan2((sp ? sp.position.y : 2) - walk.eye, d)*0.85)); }
  select(r); showCard(r); toast(`הגעת ל${dispName(r)} ✨`, 3000);
}
const angNorm = a => { while (a > Math.PI) a -= 2*Math.PI; while (a < -Math.PI) a += 2*Math.PI; return a; };
function tryMove(dx, dz){
  let bump = null;
  const b1 = hitRoom(walk.x+dx, walk.z, WK.rad); if (!b1) walk.x += dx; else bump = b1;
  const b2 = hitRoom(walk.x, walk.z+dz, WK.rad); if (!b2) walk.z += dz; else bump = bump || b2;
  return bump && !bump.edge ? bump : null;
}
function facingRoom(maxD){
  const dx = -Math.sin(walk.yaw), dz = -Math.cos(walk.yaw); let best = null, bt = maxD;
  for (const o of wRooms){
    const q = o.q; let t0 = 0, t1 = bt;
    for (const [p, d, lo, hi] of [[walk.x, dx, q.x0, q.x1], [walk.z, dz, q.z0, q.z1]]){
      if (Math.abs(d) < 1e-6){ if (p<lo || p>hi){ t0 = 1; t1 = 0; } continue; }
      let a = (lo-p)/d, b = (hi-p)/d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    }
    if (t0 <= t1 && t0 < bt){ bt = t0; best = o.r; }
  }
  return best;
}
function walkStep(dt){
  let moving = false;
  if (wAuto && wPath){
    const p = wPath.pts[wAuto.i];
    if (!p){ arrive(); }
    else {
      const want = Math.atan2(-(p.x-walk.x), -(p.z-walk.z)), diff = angNorm(want-walk.yaw);
      walk.yaw += Math.max(-WK.turn*1.6*dt, Math.min(WK.turn*1.6*dt, diff));
      walk.pitch += (-0.04-walk.pitch)*Math.min(1, dt*3);
      const d = Math.hypot(p.x-walk.x, p.z-walk.z);
      if (Math.abs(diff) < 0.7){ const s = Math.min(d, WK.speed*1.15*dt*(1-Math.abs(diff)/1.4)); walk.x += -Math.sin(walk.yaw)*s; walk.z += -Math.cos(walk.yaw)*s; moving = true; }
      if (d < 0.35) wAuto.i++;
    }
  } else {
    if (walk.turnTo !== undefined){
      const d = angNorm(walk.turnTo-walk.yaw); walk.yaw += d*Math.min(1, dt*4); walk.pitch += ((walk.pitchTo ?? -0.02)-walk.pitch)*Math.min(1, dt*4);
      if (Math.abs(d) < 0.01 || held.l || held.r || held.f || held.b || wDrag){ walk.turnTo = undefined; walk.pitchTo = undefined; }
    }
    walk.yaw += (held.l-held.r)*WK.turn*dt;
    const mv = held.f-held.b;
    if (mv){
      const s = mv*WK.speed*dt, bump = tryMove(-Math.sin(walk.yaw)*s, -Math.cos(walk.yaw)*s);
      moving = true;
      if (bump && bump!==wNear){ wNear = bump; select(bump); showCard(bump); }
    }
    if (wPath && rectDist(roomRect(wPath.room), walk.x, walk.z) < WK.rad+5.6 && seeRoom(walk.x, walk.z, wPath.room)) arrive();
  }
  if (moving && !wAuto){
    const fr = facingRoom(3.0);
    if (fr && fr!==wNear){ wNear = fr; select(fr); showCard(fr); }
    if (!fr && wNear && wNear.type && rectDist(roomRect(wNear), walk.x, walk.z) > 7){ if (!wPath || wPath.room!==wNear){ select(null); $('#card').hidden = true; } wNear = null; }
  }
  const eyeT = surfTop(walk.x, walk.z) + WK.eye;
  walk.eye += (eyeT-walk.eye)*Math.min(1, dt*7);
  camera.position.set(walk.x, walk.eye, walk.z);
  camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  placeWalkLabels(); drawMini();
}
/* ---- mini map ---- */
function drawMini(){
  const cv = $('#mini'); if (!cv || cv.hidden) return;
  const W = cv.width, H = cv.height, x = cv.getContext('2d');
  const sx = W/(WB.x1-WB.x0), sz = H/(WB.z1-WB.z0), X = v => (v-WB.x0)*sx, Z = v => (v-WB.z0)*sz;
  if (!wMiniBase || wMiniBase.f !== walk.floor){
    const b = document.createElement('canvas'); b.width = W; b.height = H; const y = b.getContext('2d');
    y.fillStyle = '#FBF6EE'; y.fillRect(0,0,W,H);
    for (const a of DATA.areas){ if (a.oval) continue; if (a.floor!==undefined && a.floor!==walk.floor) continue; y.fillStyle = a.corridor ? '#E3D3B6' : '#DCEBD8'; y.fillRect(X(a.x), Z(a.z), a.w*sx, a.d*sz); }
    for (const o of wRooms){ y.fillStyle = TYPES[o.r.type][1]; y.fillRect(X(o.q.x0), Z(o.q.z0), (o.q.x1-o.q.x0)*sx, (o.q.z1-o.q.z0)*sz); }
    const e = DATA.entrances[0]; if (walk.floor===0){ y.fillStyle = '#FF7A59'; y.beginPath(); y.arc(X(e.x), Z(e.z), 3*devicePixelRatio, 0, 7); y.fill(); }
    wMiniBase = {f:walk.floor, c:b};
  }
  x.drawImage(wMiniBase.c, 0, 0);
  if (wPath){ x.strokeStyle = '#FF7A59'; x.lineWidth = 2*devicePixelRatio; x.setLineDash([4*devicePixelRatio, 3*devicePixelRatio]); x.beginPath(); wPath.pts.forEach((p,i)=> i ? x.lineTo(X(p.x),Z(p.z)) : x.moveTo(X(p.x),Z(p.z))); x.stroke(); x.setLineDash([]); }
  const px = X(walk.x), pz = Z(walk.z), a = walk.yaw, s = 7*devicePixelRatio;
  x.save(); x.translate(px, pz); x.rotate(-a);
  x.fillStyle = 'rgba(255,122,89,.22)'; x.beginPath(); x.moveTo(0,0); x.arc(0,0,s*3.2,-Math.PI/2-0.6,-Math.PI/2+0.6); x.closePath(); x.fill();
  x.fillStyle = '#E8513A'; x.strokeStyle = '#fff'; x.lineWidth = 1.5*devicePixelRatio;
  x.beginPath(); x.moveTo(0,-s); x.lineTo(s*0.7,s*0.75); x.lineTo(0,s*0.35); x.lineTo(-s*0.7,s*0.75); x.closePath(); x.fill(); x.stroke();
  x.restore();
}
function toast(msg, ms=2600){
  const h = $('#hint'); clearTimeout(hintTimer); clearTimeout(wToastT);
  h.textContent = msg; h.classList.remove('gone'); wToastT = setTimeout(()=>h.classList.add('gone'), ms);
}
function updateFloorUI(){
  $('#wFloor').innerHTML = `<i style="background:${FLOOR_COLOR[walk.floor]}"></i>${walk.floor===0?'קומת כניסה':FLOOR_NAME[walk.floor]}`;
  $('#wUp').disabled = walk.floor >= 1; $('#wDown').disabled = walk.floor <= -1;
}
function setWalkFloor(f, quiet){
  if (f < -1 || f > 1 || !walk) return;
  const up = f > walk.floor;
  walk.floor = f; mode = String(f); layout(true); walkFloorData(f);
  const p = freeSpot(walk.x, walk.z); walk.x = p.x; walk.z = p.z;
  wNear = null; if (wPath && wPath.room.floor !== f) clearPath(); else if (wPath) startAutoReplan();
  if (selected && selected.floor !== f){ select(null); $('#card').hidden = true; }
  updateFloorUI(); wMiniBase = null;
  if (!quiet) toast(`${up?'⬆ עלית':'⬇ ירדת'} ל${f===0?'קומת הכניסה':FLOOR_NAME[f]}`);
}
function startAutoReplan(){ const pts = astar(walk.x, walk.z, wPath.room); if (pts){ wPath.pts = pts; drawArrows(); } }
function enterWalk(){
  if (!gl || walk) return;
  if (!wLabels) buildWalkLabels();
  fly = null;
  const sp = window.__entSp;
  const saved = {pos:camera.position.clone(), tgt:controls.target.clone(), quat:camera.quaternion.clone(), mode, exploded, near:camera.near,
    fog:[scene.fog.near, scene.fog.far], ent:sp ? sp.scale.clone() : null, card:$('#card').hidden, sel:selected, list:$('#list').hidden};
  const e = DATA.entrances[0], cor = DATA.areas.find(a=>a.corridor && a.floor===0);
  walk = {floor:0, x: cor ? cor.x+cor.w/2 : e.x, z: e.z-3, yaw:0, pitch:-0.03, eye:WK.eye+0.5, saved};
  walkFloorData(0);
  const p = freeSpot(walk.x, walk.z); walk.x = p.x; walk.z = p.z;
  controls.enabled = false; mode = '0'; layout(true);
  camera.near = 0.1; scene.fog.near = 30; scene.fog.far = 190; resize();
  if (sp) sp.scale.set(7, 7*96/512, 1);
  for (const o of slabs) if (o.userData.kind==='tag'){ o.visible = false; }
  select(null); $('#card').hidden = true; $('#list').hidden = true; sugg.hidden = true;
  document.body.classList.add('walking'); $('#walkUI').hidden = false; $('#mini').hidden = false; sizeMini();
  wMiniBase = null; wNear = null; updateFloorUI();
  toast(innerWidth < 640 ? '🚶 גוררים כדי להסתכל · החיצים כדי ללכת' : '🚶 גוררים כדי להסתכל · חיצי המקלדת או הכפתורים כדי ללכת', 5000);
}
function exitWalk(){
  if (!walk) return;
  const s = walk.saved; clearPath(); for (const k in held) held[k] = 0;
  walk = null; wNear = null;
  document.body.classList.remove('walking'); $('#walkUI').hidden = true; $('#mini').hidden = true;
  for (const sp of wLabels) sp.visible = false; for (const sp of wAreaLabels) sp.visible = false;
  if (s.ent && window.__entSp) window.__entSp.scale.copy(s.ent);
  mode = s.mode; exploded = s.exploded; expLabel();
  camera.near = s.near; scene.fog.near = s.fog[0]; scene.fog.far = s.fog[1]; resize();
  camera.position.copy(s.pos); camera.quaternion.copy(s.quat); controls.target.copy(s.tgt);
  controls.enabled = true; controls.update();
  layout(true);
  select(s.sel); if (s.sel && !s.card) showCard(s.sel); else $('#card').hidden = true;
  $('#list').hidden = s.list;
  clearTimeout(wToastT); $('#hint').classList.add('gone');
}
function sizeMini(){
  const cv = $('#mini'), small = innerWidth < 640, w = small ? 92 : 128, h = Math.round(w*(WB.z1-WB.z0)/(WB.x1-WB.x0));
  cv.style.width = w+'px'; cv.style.height = h+'px'; cv.width = Math.round(w*devicePixelRatio); cv.height = Math.round(h*devicePixelRatio); wMiniBase = null;
}
function initWalk(){
  const canvas = $('#c');
  $('#walkBtn').hidden = false;
  $('#walkBtn').onclick = enterWalk;
  $('#walkExit').onclick = exitWalk;
  $('#wUp').onclick = ()=>{ stopAuto(); setWalkFloor(walk.floor+1); };
  $('#wDown').onclick = ()=>{ stopAuto(); setWalkFloor(walk.floor-1); };
  $('#wGo').onclick = ()=>{ q.value = ''; q.focus(); renderSugg(); toast('📍 בחרו חדר ואראה לכם את הדרך'); };
  $('#wAuto').onclick = startAuto;
  $('#wClear').onclick = ()=>{ clearPath(); select(null); $('#card').hidden = true; };
  document.querySelectorAll('#walkUI .pk').forEach(b=>{
    const k = b.dataset.k;
    const on = e=>{ e.preventDefault(); stopAuto(); held[k] = 1; b.classList.add('down'); try{ b.setPointerCapture(e.pointerId); }catch(_){} };
    const off = ()=>{ held[k] = 0; b.classList.remove('down'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e=>e.preventDefault());
  });
  const KEYS = {ArrowUp:'f', KeyW:'f', ArrowDown:'b', KeyS:'b', ArrowLeft:'l', KeyA:'l', ArrowRight:'r', KeyD:'r'};
  addEventListener('keydown', e=>{
    if (!walk || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = KEYS[e.code] || KEYS[e.key]; if (k){ stopAuto(); held[k] = 1; e.preventDefault(); return; }
    if (e.key==='PageUp'){ setWalkFloor(walk.floor+1); e.preventDefault(); }
    else if (e.key==='PageDown'){ setWalkFloor(walk.floor-1); e.preventDefault(); }
    else if (e.key==='Escape') exitWalk();
  });
  addEventListener('keyup', e=>{ const k = KEYS[e.code] || KEYS[e.key]; if (k) held[k] = 0; });
  addEventListener('blur', ()=>{ for (const k in held) held[k] = 0; });
  // drag to look around; a tap on a sign / room shows its card
  canvas.addEventListener('pointerdown', e=>{ if (!walk) return; wDrag = {id:e.pointerId, x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY}; });
  canvas.addEventListener('pointermove', e=>{
    if (!walk || !wDrag || wDrag.id !== e.pointerId) return;
    const dx = e.clientX-wDrag.x, dy = e.clientY-wDrag.y; wDrag.x = e.clientX; wDrag.y = e.clientY;
    if (Math.hypot(e.clientX-wDrag.sx, e.clientY-wDrag.sy) > 6) stopAuto();
    walk.yaw += dx*WK.look; walk.pitch = Math.max(-0.75, Math.min(0.6, walk.pitch + dy*WK.look));
  });
  const endDrag = e=>{
    if (!walk || !wDrag) return; const moved = Math.hypot(e.clientX-wDrag.sx, e.clientY-wDrag.sy); wDrag = null;
    if (moved > 7 || e.type!=='pointerup') return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...wLabels, ...wAreaLabels].filter(s=>s.visible), false);
    if (hits.length){ const u = hits[0].object.userData; if (u.wroom){ select(u.wroom); showCard(u.wroom); wNear = u.wroom; } else if (u.place){ select(null); showCard(u.place); } return; }
    const rh = raycaster.intersectObjects(roomMeshes.filter(m=>m.visible && m.userData.floor===walk.floor), false);
    if (rh.length && rh[0].distance < 60){ const r = rh[0].object.userData.room; select(r); showCard(r); wNear = r; return; }
    const xh = raycaster.intersectObjects(extraHits.filter(o=>o.visible), false);
    if (xh.length && xh[0].object.userData.place){ select(null); showCard(xh[0].object.userData.place); return; }
    select(null); $('#card').hidden = true;
  };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  window.__walk = {
    enter: enterWalk, exit: exitWalk, goto: name=>{ const r = ROOMS.find(x=>x.name===name || x.num===name); if (r && walk) walkGoto(r); return !!r; },
    state: ()=> walk && {floor:walk.floor, x:+walk.x.toFixed(2), z:+walk.z.toFixed(2), yaw:+walk.yaw.toFixed(3), eye:+walk.eye.toFixed(2), path: wPath ? wPath.pts.length : 0, auto: !!wAuto, card: $('#card').hidden ? null : $('#cName').textContent},
    place: (x, z, yaw)=>{ if (!walk) return; walk.x = x; walk.z = z; walk.yaw = yaw; walk.pitch = -0.03; },
    cam: ()=> ({p:camera.position.toArray().map(v=>+v.toFixed(3)), t:controls.target.toArray().map(v=>+v.toFixed(3)), mode, exploded, fov:camera.fov})
  };
}

init3D().catch(err=>{
  console.warn('3D unavailable, showing list', err && err.message);
  gl = false; $('#c').style.display='none'; $('#hint').hidden = true; $('#legend').hidden = true;
  document.querySelector('.floors .chips').hidden = true; $('#explode').hidden = true; $('#reset').hidden = true; $('#top').hidden = true;
  $('#noGL').hidden = false; $('#list').hidden = false; $('#listClose').hidden = true;
  window.__map = {ready:true, fallback:true};
});
