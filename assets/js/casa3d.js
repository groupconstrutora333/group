/* Group Construtora — casa à beira-mar em 3D que se constrói com a rolagem (obra em etapas: 4D) */
(function () {
  const stage = document.getElementById("obra");
  const holder = document.getElementById("cena");
  if (!stage || !holder) return;
  const fail = () => document.documentElement.classList.add("sem3d");
  if (!window.THREE) return fail();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) { return fail(); }

  const small = Math.min(innerWidth, innerHeight) < 700;
  renderer.setPixelRatio(Math.min(small ? 1.5 : 2, devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const SKY_DAY = new THREE.Color(0x0e1a36), SKY_NIGHT = new THREE.Color(0x050814);
  scene.background = SKY_DAY.clone();
  scene.fog = new THREE.Fog(0x0b1530, 70, 190);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 600);

  // ---------- luz ----------
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x1a2234, 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffcf96, 1.25);
  sun.position.set(-40, 38, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
  sun.shadow.bias = -0.0004; scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 0.35); rim.position.set(30, 20, -30); scene.add(rim);

  // ---------- materiais ----------
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8, metalness: 0 }, o));
  const mConcrete = M(0xe9e4da, { roughness: 0.9 });
  const mSlab = M(0xf4f1ea, { roughness: 0.85 });
  const mWood = M(0x8a5a36, { roughness: 0.7 });
  const mWoodDark = M(0x5c3a22, { roughness: 0.75 });
  const mDeck = M(0x9b6a43, { roughness: 0.75 });
  const mGlass = new THREE.MeshPhysicalMaterial({ color: 0x9fc3dd, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.32, emissive: 0x000000 });
  const mFrame = M(0x1c1f26, { roughness: 0.5, metalness: 0.6 });
  const mStone = M(0x34383f, { roughness: 1 });
  const mGrass = M(0x1c3527, { roughness: 1 });
  const mSand = M(0x9c8662, { roughness: 1 });
  const mGold = M(0xf1c76a, { roughness: 0.35, metalness: 0.6, emissive: 0x3a2a08, emissiveIntensity: 0.4 });
  const mPool = new THREE.MeshStandardMaterial({ color: 0x3fb6d8, roughness: 0.08, metalness: 0.2, emissive: 0x0b4a63, emissiveIntensity: 0.35 });
  const mWarm = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb45c, emissiveIntensity: 0 });

  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    (parent || scene).add(m); return m;
  }
  function cyl(r, h, mat, x, y, z, parent, seg = 12) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    (parent || scene).add(m); return m;
  }

  // ---------- mar ----------
  const seaGeo = new THREE.PlaneGeometry(420, 420, small ? 70 : 120, small ? 70 : 120);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x0a3446, roughness: 0.45, metalness: 0.2, flatShading: true }));
  sea.position.y = -0.6; sea.receiveShadow = true; scene.add(sea);
  const seaBase = seaGeo.attributes.position.array.slice();

  // ---------- terreno (costão + grama + areia) ----------
  const land = new THREE.Group(); scene.add(land);
  box(60, 3, 40, mStone, 0, -1.6, -14, land);
  box(56, 0.4, 36, mGrass, 0, 0.05, -15, land);
  box(30, 0.3, 8, mSand, 22, -0.15, 6, land);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 46; i++) {
    const r = new THREE.Mesh(rockGeo, mStone);
    const s = 0.8 + ((i * 37) % 10) / 6;
    r.scale.set(s * 1.4, s * 0.8, s);
    r.position.set(-29 + i * 1.3, -0.6 + ((i * 13) % 5) / 10, 4.2 + Math.sin(i) * 0.9);
    r.rotation.set(i, i * 2, 0); r.castShadow = true; r.receiveShadow = true; land.add(r);
  }
  // vegetação
  const mLeaf = M(0x173a27, { roughness: 1 });
  function palm(x, z, h) {
    const g = new THREE.Group(); g.position.set(x, 0, z); land.add(g);
    const t = cyl(0.18, h, mWoodDark, 0, h / 2, 0, g, 7); t.rotation.z = 0.08;
    for (let i = 0; i < 7; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 3.2), mLeaf);
      l.position.set(Math.cos(i) * 1.3, h - 0.2, Math.sin(i) * 1.3); l.rotation.y = -i; l.rotation.x = 0.45; l.castShadow = true; g.add(l);
    }
  }
  palm(-22, -6, 7); palm(-25, -14, 8.5); palm(21, -12, 7.5); palm(24, -4, 6.5); palm(-18, -24, 9);
  for (let i = 0; i < 18; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + (i % 3) * 0.4, 0), mLeaf);
    b.position.set(-27 + (i * 7.3) % 54, 0.6, -30 + (i % 4) * 1.5); b.castShadow = true; land.add(b);
  }

  // ---------- a casa, por etapas ----------
  const stages = [];
  function addStage() { const g = new THREE.Group(); scene.add(g); stages.push({ g, items: [] }); return stages[stages.length - 1]; }
  function put(st, mesh) { mesh.userData.final = mesh.position.clone(); mesh.userData.scaleFinal = mesh.scale.clone(); st.items.push(mesh); return mesh; }

  // casa: térreo 18 x 9, pavimento superior 20 x 8 em balanço sobre o deck
  const H1 = 3.3, H2 = 3.2;
  // 1. fundação e pilotis
  const s1 = addStage();
  put(s1, box(19, 0.6, 10, mConcrete, 0, 0.3, -12, s1.g));
  for (let i = 0; i < 6; i++) put(s1, box(0.6, 0.6, 0.6, mConcrete, -8 + i * 3.2, 0.3, -6.5, s1.g));
  // 2. estrutura (pilares + lajes)
  const s2 = addStage();
  [[-9, -16.5], [-9, -7.5], [0, -16.5], [0, -7.5], [9, -16.5], [9, -7.5]].forEach(([x, z]) => put(s2, box(0.35, H1, 0.35, mSlab, x, 0.6 + H1 / 2, z, s2.g)));
  put(s2, box(21, 0.35, 10.5, mSlab, 1, 0.6 + H1 + 0.17, -11.2, s2.g));
  [[-9, -15], [11, -15], [-9, -7.5], [11, -7.5]].forEach(([x, z]) => put(s2, box(0.3, H2, 0.3, mSlab, x, 0.95 + H1 + H2 / 2, z, s2.g)));
  put(s2, box(22, 0.3, 9.5, mSlab, 1, 0.95 + H1 + H2 + 0.15, -11, s2.g));
  // 3. fechamentos: vidro, madeira e caixilhos
  const s3 = addStage();
  put(s3, box(17.4, H1 - 0.1, 0.06, mGlass, 0, 0.6 + H1 / 2, -7.4, s3.g));
  for (let i = 0; i < 7; i++) put(s3, box(0.06, H1, 0.1, mFrame, -8.7 + i * 2.9, 0.6 + H1 / 2, -7.38, s3.g));
  put(s3, box(0.25, H1, 9, mConcrete, -9, 0.6 + H1 / 2, -12, s3.g));
  put(s3, box(18, H1, 0.25, mConcrete, 0, 0.6 + H1 / 2, -16.6, s3.g));
  const yUp = 0.95 + H1 + H2 / 2;
  for (let i = 0; i < 36; i++) put(s3, box(0.12, H2 - 0.2, 0.22, mWood, -9 + i * 0.58, yUp, -6.9, s3.g));
  put(s3, box(9, H2 - 0.2, 0.06, mGlass, 6.3, yUp, -6.82, s3.g));
  put(s3, box(0.25, H2, 8, mWood, 11.1, yUp, -11, s3.g));
  put(s3, box(20, H2, 0.25, mConcrete, 1, yUp, -15, s3.g));
  // janelas acesas (à noite)
  const warm = [];
  [[-6, -7.6], [-1, -7.6], [4, -7.6]].forEach(([x, z]) => { const w = box(3.6, H1 - 0.8, 0.02, mWarm, x, 0.6 + H1 / 2, z - 0.15, s3.g); warm.push(w); put(s3, w); });
  [[5, -7.1], [8, -7.1]].forEach(([x, z]) => { const w = box(2.6, H2 - 0.9, 0.02, mWarm, x, yUp, z - 0.1, s3.g); warm.push(w); put(s3, w); });
  // 4. cobertura, deck, piscina e píer
  const s4 = addStage();
  put(s4, box(23, 0.22, 10.5, mSlab, 1, 0.95 + H1 + H2 + 0.42, -11, s4.g));
  put(s4, box(23.2, 0.06, 0.06, mGold, 1, 0.95 + H1 + H2 + 0.54, -5.76, s4.g));
  put(s4, box(26, 0.25, 7, mDeck, 0, 0.62, -3.5, s4.g));
  for (let i = 0; i < 26; i++) put(s4, box(0.02, 0.26, 7, mWoodDark, -12.5 + i, 0.63, -3.5, s4.g));
  put(s4, box(10, 0.28, 3.6, mPool, -5, 0.64, -3.4, s4.g));
  put(s4, box(10.4, 0.3, 0.2, mConcrete, -5, 0.66, -5.3, s4.g));
  // píer
  const pierLen = 26;
  put(s4, box(2.6, 0.22, pierLen, mDeck, 8, 0.75, 0 + pierLen / 2 + 1, s4.g));
  for (let i = 0; i <= 8; i++) {
    put(s4, cyl(0.16, 2.6, mWoodDark, 6.8, -0.6, 1.5 + i * (pierLen / 8), s4.g, 8));
    put(s4, cyl(0.16, 2.6, mWoodDark, 9.2, -0.6, 1.5 + i * (pierLen / 8), s4.g, 8));
  }
  put(s4, box(7, 0.22, 4, mDeck, 8, 0.75, pierLen + 3, s4.g));
  for (let i = 0; i < 2; i++) put(s4, box(0.08, 1, pierLen, mWoodDark, 6.75 + i * 2.5, 1.35, pierLen / 2 + 1, s4.g));
  // escada do píer
  for (let i = 0; i < 4; i++) put(s4, box(1.4, 0.12, 0.4, mDeck, 11.6, 0.55 - i * 0.35, pierLen + 3 + i * 0.4, s4.g));
  // 5. acabamento: espreguiçadeiras, luminárias, barco
  const s5 = addStage();
  [[-8, -0.9], [-5, -0.9], [-2, -0.9]].forEach(([x, z]) => { put(s5, box(0.8, 0.3, 2, M(0xf5f2ea), x, 0.95, z, s5.g)); put(s5, box(0.8, 0.5, 0.4, M(0xf5f2ea), x, 1.15, z - 0.9, s5.g)); });
  const lamps = [];
  for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mWarm); l.position.set(i % 2 ? 9.15 : 6.85, 1.0, 3 + i * 3.6); s5.g.add(l); lamps.push(l); put(s5, l); }
  const boat = new THREE.Group(); s5.g.add(boat);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 7), M(0xf6f6f6, { roughness: 0.4 })); hull.position.y = 0; hull.castShadow = true; boat.add(hull);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2.4), M(0x1c2a44, { roughness: 0.3 })); cab.position.set(0, 0.75, 0.4); boat.add(cab);
  boat.position.set(12.5, -0.2, pierLen - 4); put(s5, boat);

  // estado inicial das etapas
  stages.forEach((st) => st.items.forEach((m) => { m.visible = false; }));

  // ---------- rolagem → progresso ----------
  let target = 0, prog = 0;
  function readScroll() {
    const r = stage.getBoundingClientRect();
    const total = r.height - innerHeight;
    target = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
  }
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", () => { resize(); readScroll(); });
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w < h ? 48 : 34; camera.updateProjectionMatrix();
  }
  resize(); readScroll();

  // legendas por etapa
  const caps = [...document.querySelectorAll("#obra [data-etapa]")];
  const bar = document.getElementById("obraBarra");
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
  const N = stages.length;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = performance.now(), running = true;
  const io = new IntersectionObserver((es) => es.forEach((e) => { running = e.isIntersecting; if (running) { last = performance.now(); requestAnimationFrame(loop); } }), { threshold: 0 });
  io.observe(holder);

  function loop(now) {
    if (!running) return;
    const dt = Math.min(50, now - last); last = now;
    prog += (target - prog) * (reduce ? 1 : Math.min(1, dt * 0.004));
    const t = now / 1000;
    // etapas: cada uma ocupa 1/(N+1) do percurso; a última fração é o "acender das luzes"
    const span = 1 / (N + 1);
    stages.forEach((st, si) => {
      const k = ease((prog - si * span * 0.92) / (span * 0.9));
      st.items.forEach((m, i) => {
        const kk = ease(k * 1.4 - (i / Math.max(1, st.items.length)) * 0.4);
        m.visible = kk > 0.001;
        if (!m.visible) return;
        const f = m.userData.final;
        m.position.set(f.x, f.y + (1 - kk) * 6, f.z);
        const sf = m.userData.scaleFinal; m.scale.set(sf.x, sf.y * Math.max(0.001, kk), sf.z);
      });
    });
    const night = ease((prog - N * span * 0.92) / (span * 0.9));
    scene.background.copy(SKY_DAY).lerp(SKY_NIGHT, night);
    scene.fog.color.copy(scene.background);
    sun.intensity = 1.25 - night * 0.95; hemi.intensity = 0.55 - night * 0.3;
    mWarm.emissiveIntensity = 0.15 + night * 2.2;
    mPool.emissiveIntensity = 0.35 + night * 0.9;
    // mar
    const p = seaGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = seaBase[i], z = seaBase[i + 2]; p[i + 1] = Math.sin(x * 0.12 + t * 0.9) * 0.18 + Math.cos(z * 0.1 + t * 0.7) * 0.16; }
    seaGeo.attributes.position.needsUpdate = true; seaGeo.computeVertexNormals();
    boat.rotation.z = Math.sin(t * 0.9) * 0.03; boat.position.y = -0.2 + Math.sin(t * 1.1) * 0.06;
    // câmera em órbita lenta guiada pela rolagem
    const ang = -0.9 + prog * 1.5 + Math.sin(t * 0.1) * 0.03;
    const rad = (innerWidth < innerHeight ? 64 : 52) - prog * 8;
    const camY = 26 - prog * 14;
    camera.position.set(Math.sin(ang) * rad, camY, Math.cos(ang) * rad + 2);
    camera.lookAt(0, 2.2 - prog * 0.6, -4 + prog * 2);
    // legendas
    const idx = Math.min(caps.length - 1, Math.floor(prog * caps.length * 0.999));
    caps.forEach((c, i) => c.classList.toggle("on", i === idx));
    if (bar) bar.style.transform = `scaleX(${prog})`;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
