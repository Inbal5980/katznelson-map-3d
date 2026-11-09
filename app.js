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
  h += `<div class="row">🛡️ חדר שהוא גם מקלט</div></details>`;
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
function choose(r){ sugg.hidden = true; q.blur(); q.value = dispName(r).replace(/ \(מקלט\)/,''); if (gl) focusRoom(r); else showCard(r); }

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
    const lines = (r.label||shortName(r)).split('\n').map((t,i)=>({text:t, size:i?42:54, weight:i?500:700, color:i?'#3A4560':'#1F2A44'}));
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
  const tex = textCanvas([{text:b.name, size:46, weight:700, color:'#ffffff'}], 384, 96, {bg:'rgba(31,42,68,0.86)'});
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
  const t = textCanvas([{text:'🚪 '+e.label, size:44, weight:700, color:'#ffffff'}], 512, 96, {bg:'#FF7A59'});
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:t, transparent:true, depthTest:false}));
  sp.scale.set(15, 15*96/512, 1); sp.position.set(e.x, levelY(0)+9, e.z); sp.renderOrder = 11; scene.add(sp);
  window.__entSp = sp;
  const place = {name:e.label, kicker:'כניסה', meta:'קומת הכניסה', img:e.img};
  if (e.img){ cone.userData.place = place; sp.userData.place = place; extraHits.push(cone, sp); }
}

/* layout: compute target y / opacity per object */
function levelY(f){ const gap = exploded ? FH*2.3 : FH; return (f+1)*gap; }
function layout(instant){
  const iso = mode==='all' ? null : +mode;
  const set = (o, y, op, vis=true) => { o.userData.ty = y; o.userData.top_ = op; o.userData.tvis = vis; if (instant){ o.position.y=y; setOp(o,op); o.visible = vis && op>0.01; } };
  for (const m of [...roomMeshes, ...slabs]){
    const u = m.userData;
    if (u.kind==='tag'){
      const topF = iso===null ? u.top : Math.min(u.top, iso);
      const hasIso = iso===null || u.bld.floors.includes(iso) || (!u.bld.floors.length && iso===0);
      set(m, levelY(topF) + 6.2, hasIso?1:0.25); continue;
    }
    let y = levelY(u.floor) + u.baseY, op = 1;
    if (iso!==null){
      if (u.floor > iso){ y += 22; op = 0; }
      else if (u.floor < iso){ op = u.kind==='room' ? 0.16 : 0.22; }
    }
    set(m, y, op);
  }
  for (const f in labelsByFloor) for (const l of labelsByFloor[f]){
    let y = levelY(+f) + l.userData.baseY, op = 1;
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
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.fov = w/h < 0.8 ? 60 : 40; camera.updateProjectionMatrix();
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
    const y0 = levelY(0), hide = mode!=='all' && +mode < 0;
    window.__cone.position.y = y0 + 4.6 + Math.sin(now/400)*0.6; window.__cone.visible = !hide;
    if (window.__entSp){ window.__entSp.position.y = y0 + 8.6; window.__entSp.visible = !hide; }
  }
  if (fly){
    const t = Math.min(1, (now-fly.t0)/fly.dur), e = ease(t);
    camera.position.lerpVectors(fly.fromP, fly.toP, e); controls.target.lerpVectors(fly.fromT, fly.toT, e);
    if (t>=1) fly = null;
  }
  controls.update();
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

init3D().catch(err=>{
  console.warn('3D unavailable, showing list', err && err.message);
  gl = false; $('#c').style.display='none'; $('#hint').hidden = true; $('#legend').hidden = true;
  document.querySelector('.floors .chips').hidden = true; $('#explode').hidden = true; $('#reset').hidden = true; $('#top').hidden = true;
  $('#noGL').hidden = false; $('#list').hidden = false; $('#listClose').hidden = true;
  window.__map = {ready:true, fallback:true};
});
