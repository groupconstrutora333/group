/* Group Construtora — render 3D em tempo real: casa à beira-mar construída com a rolagem.
   Céu físico, mar com reflexo, luz de fim de tarde que vira noite na entrega. */
(function () {
  const stage = document.getElementById("obra");
  const holder = document.getElementById("cena");
  if (!stage || !holder) return;
  const fail = () => document.documentElement.classList.add("sem3d");
  if (!window.THREE || !THREE.Sky || !THREE.Water) return fail();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (e) { return fail(); }

  const small = Math.min(innerWidth, innerHeight) < 700;
  renderer.setPixelRatio(Math.min(small ? 1.25 : 2, devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = small ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap; // sombra suave só no desktop
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x7d8aa0, 0.0065);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 4000);
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  // ---------- mar com reflexo ----------
  const normals = new THREE.TextureLoader().load("assets/img/waternormals.jpg", (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  const water = new THREE.Water(new THREE.PlaneGeometry(3000, 3000), {
    textureWidth: small ? 256 : 1024, textureHeight: small ? 256 : 1024,
    waterNormals: normals, sunDirection: new THREE.Vector3(0, 1, 0), sunColor: 0xffe2b8,
    waterColor: 0x0b4456, distortionScale: 2.2, fog: false
  });
  water.rotation.x = -Math.PI / 2; water.material.uniforms.size.value = 3.2;
  scene.add(water);

  // ---------- céu físico + sol ----------
  const sky = new THREE.Sky(); sky.scale.setScalar(4000); scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 7; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.86;
  const sunDir = new THREE.Vector3();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, lastEnvKey = null, hdrReady = false;
  if (THREE.RGBELoader) new THREE.RGBELoader().load("assets/3d/venice_sunset_1k.hdr", (tex) => { tex.mapping = THREE.EquirectangularReflectionMapping; const rt = pmrem.fromEquirectangular(tex); tex.dispose(); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; hdrReady = true; });
  function setSun(elev, azim) {
    const phi = THREE.MathUtils.degToRad(90 - elev), theta = THREE.MathUtils.degToRad(azim);
    sunDir.setFromSphericalCoords(1, phi, theta);
    su.sunPosition.value.copy(sunDir);
    water.material.uniforms.sunDirection.value.copy(sunDir).normalize();
    const key = Math.round(elev * 2);
    if (!hdrReady && key !== lastEnvKey) { lastEnvKey = key; if (envRT) envRT.dispose(); envRT = pmrem.fromScene(sky); scene.environment = envRT.texture; }
  }

  // ---------- luz ----------
  const hemi = new THREE.HemisphereLight(0xbcd2ff, 0x2a2418, 0.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc98e, 2.2);
  sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 260 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target); sun.target.position.set(0, 0, -6);

  // ---------- materiais (PBR) ----------
  const std = (c, r, m = 0, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, o));
  const mWhite = std(0xf1ede4, 0.62);
  const mConcrete = std(0xc9c4ba, 0.85);
  const texL = new THREE.TextureLoader();
  const woodTex = (rx, ry, rot) => { const d = texL.load("assets/img/hardwood2_diffuse.jpg"), r = texL.load("assets/img/hardwood2_roughness.jpg"); [d, r].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.rotation = rot || 0; t.anisotropy = 8; }); d.encoding = THREE.sRGBEncoding; return { map: d, roughnessMap: r }; };
  const mWood = std(0xc08a62, 0.55, 0, woodTex(0.3, 1, 0));
  const mWoodDark = std(0x4a2d1a, 0.6);
  const mDeck = std(0xb07a52, 0.62, 0, woodTex(4, 1.2, Math.PI / 2));
  const mPier = std(0xb07a52, 0.62, 0, woodTex(1, 10, 0));
  const mGlass = std(0x1b2a38, 0.04, 0.9, { transparent: true, opacity: 0.62, envMapIntensity: 1.6 });
  const mFrame = std(0x1a1c20, 0.35, 0.8);
  const mGold = std(0xf1c76a, 0.28, 0.9);
  const mStone = std(0xffffff, 0.92, 0, { envMapIntensity: 0.3 });
  const mPool = std(0x2aa6c6, 0.05, 0.1, { emissive: 0x0b5a75, emissiveIntensity: 0.25, envMapIntensity: 1.4 });
  const mInner = std(0x2a2520, 0.9, 0, { emissive: 0xffb15c, emissiveIntensity: 0 });
  const mFabric = std(0xe9e2d4, 0.95);
  const mLeaf = std(0x2b4a24, 0.8, 0, { side: THREE.DoubleSide, envMapIntensity: 0.4 });
  const mTrunk = std(0x4a3f33, 0.95);

  function box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
  }
  function cyl(r, h, mat, x, y, z, parent, seg = 14) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || scene).add(m); return m;
  }

  // ---------- terreno: platô, praia, costão e morro de mata atlântica ----------
  const noise = (x, z) => Math.sin(x * 0.21 + Math.cos(z * 0.13)) * Math.cos(z * 0.17 - x * 0.05) + 0.5 * Math.sin(x * 0.53 + z * 0.41);
  const shoreZ = (x) => 4.2 + Math.sin(x * 0.18) * 1.2;
  function height(x, z) {
    let h = 0.62;
    const shore = shoreZ(x);
    if (z > shore) h = 0.62 - (z - shore) * (x > 14 ? 0.18 : 0.55);
    const back = -26 - Math.sin(x * 0.1) * 3;
    if (z < back) h += Math.pow(back - z, 1.25) * 0.24 + noise(x, z) * 0.9;
    const side = Math.abs(x) - 32;
    if (side > 0) h += Math.pow(side, 1.3) * 0.35 + noise(z, x) * 1.2;
    if (z > -22 && z < shore && Math.abs(x) > 15) h += noise(x, z) * 0.12;
    return h;
  }
  const tg = new THREE.PlaneGeometry(130, 110, small ? 72 : 180, small ? 60 : 150); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, cols = [];
  const cSand = new THREE.Color(0xb59a72), cGrass = new THREE.Color(0x2c4524), cLawn = new THREE.Color(0x34502a), cForest = new THREE.Color(0x1f3a1c), cRock = new THREE.Color(0x4a443c);
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i) - 18, h = height(x, z);
    tp.setY(i, h); tp.setZ(i, z);
    let c;
    if (z > shoreZ(x) - 0.8) c = x > 12 ? cSand : cRock;
    else if (h > 1.4) c = cForest.clone().lerp(cGrass, Math.max(0, noise(x * 2, z * 2)) * 0.25);
    else c = (Math.abs(x) < 15 ? cLawn : cGrass).clone().lerp(cForest, Math.max(0, noise(x, z)) * 0.25);
    cols.push(c.r, c.g, c.b);
  }
  tg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, std(0xffffff, 0.95, 0, { vertexColors: true, envMapIntensity: 0.35 }));
  terrain.receiveShadow = true; scene.add(terrain);

  // mata (copas instanciadas)
  const dm = new THREE.Object3D(), tc = new THREE.Color();
  const N_TREES = small ? 260 : 900;
  const cGeo = new THREE.SphereGeometry(1, small ? 8 : 12, small ? 6 : 9); { const q = cGeo.attributes.position; for (let i = 0; i < q.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(q, i); v.multiplyScalar(0.8 + 0.35 * Math.abs(Math.sin(v.x * 5 + v.y * 3) * Math.cos(v.z * 4))); q.setXYZ(i, v.x, v.y, v.z); } cGeo.computeVertexNormals(); }
  const canopy = new THREE.InstancedMesh(cGeo, std(0xffffff, 1, 0, { envMapIntensity: 0.3 }), N_TREES);
  canopy.castShadow = true; canopy.receiveShadow = true;
  for (let i = 0; i < N_TREES; i++) {
    let x, z, tries = 0;
    do { x = (rnd() - 0.5) * 128; z = -18 + (rnd() - 0.5) * 108; tries++; } while ((height(x, z) < 1.8 || z > -27 && Math.abs(x) < 34) && tries < 60);
    const ok = height(x, z) >= 1.8 && !(z > -27 && Math.abs(x) < 34);
    const s = ok ? 0.9 + rnd() * 1.5 : 0.0001;
    dm.position.set(x, height(x, z) + s * 0.6, z); dm.scale.set(s, s * (0.7 + rnd() * 0.4), s); dm.rotation.set(rnd(), rnd() * 6, rnd());
    dm.updateMatrix(); canopy.setMatrixAt(i, dm.matrix);
    tc.setHSL(0.26 + rnd() * 0.07, 0.28 + rnd() * 0.15, 0.05 + rnd() * 0.05); canopy.setColorAt(i, tc);
  }
  scene.add(canopy);

  // costão de pedras arredondadas
  const N_ROCKS = small ? 90 : 140;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), mStone, N_ROCKS); rocks.castShadow = true; rocks.receiveShadow = true;
  for (let i = 0; i < N_ROCKS; i++) {
    const x = -34 + rnd() * 42, shore = shoreZ(x), z0 = shore - 0.6 + rnd() * 3.2, z = (x > -14.5 && x < 7.6) ? Math.max(z0, 5.6 + rnd() * 1.5) : z0;
    const s = 0.35 + Math.pow(rnd(), 2) * 1.5;
    dm.position.set(x, -0.25 + s * 0.35, z); dm.scale.set(s * (1 + rnd() * 0.6), s * 0.7, s); dm.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    dm.updateMatrix(); rocks.setMatrixAt(i, dm.matrix);
    tc.setHSL(0.08, 0.08, 0.07 + rnd() * 0.06); rocks.setColorAt(i, tc);
  }
  scene.add(rocks);

  // palmeiras com tronco curvo e folhas arqueadas
  const frondGeo = (() => {
    const g = new THREE.PlaneGeometry(0.9, 4.2, 1, 8); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 2.1, t = y / 4.2; p.setX(i, p.getX(i) * Math.sin(Math.PI * Math.min(1, t * 1.1))); p.setZ(i, -Math.pow(t, 2) * 1.6); p.setY(i, y); }
    g.rotateX(-Math.PI / 2 + 0.5); g.computeVertexNormals(); return g;
  })();
  const palms = [];
  function palm(x, z, h, lean) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.4, h * 0.55, lean * 0.2), new THREE.Vector3(lean, h, lean * 0.4));
    const g = new THREE.Group(); g.position.set(x, height(x, z), z); scene.add(g);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.17, 7, false), mTrunk); trunk.castShadow = true; g.add(trunk);
    const top = new THREE.Group(); top.position.copy(curve.getPoint(1)); g.add(top);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(frondGeo, mLeaf); f.rotation.y = (i / 9) * Math.PI * 2 + rnd() * 0.3; f.rotation.z = (rnd() - 0.5) * 0.3; f.castShadow = true; top.add(f); }
    palms.push(top);
  }
  [[-21, -4, 8, 1.2], [-24, -12, 9.5, -0.8], [19, -11, 8.5, 1.4], [23, -2, 7, 1.8], [-17, -19, 10, 0.6], [26, 3.5, 7.5, 2.2], [-27, 1, 7.2, -1.4]].forEach((a) => palm(...a));

  // ---------- a casa, por etapas (4D) ----------
  const stages = [];
  const addStage = () => { const g = new THREE.Group(); scene.add(g); const st = { g, items: [] }; stages.push(st); return st; };
  const put = (st, m) => { m.userData.final = m.position.clone(); m.userData.scaleFinal = m.scale.clone(); st.items.push(m); return m; };
  const H1 = 3.4, H2 = 3.2, Y0 = 0.62, Y1 = Y0 + 0.5, Y2 = Y1 + H1 + 0.35;

  const s1 = addStage(); // fundação
  put(s1, box(20, 0.5, 11, mConcrete, 0, Y0 + 0.25, -12, s1.g));
  for (let i = 0; i < 7; i++) put(s1, box(0.5, 0.5, 0.5, mConcrete, -9 + i * 3, Y0 + 0.25, -6.2, s1.g));

  const s2 = addStage(); // estrutura
  [[-9.4, -17], [-9.4, -7.2], [0, -17], [0, -7.2], [9.4, -17], [9.4, -7.2]].forEach(([x, z]) => put(s2, box(0.3, H1, 0.3, mWhite, x, Y1 + H1 / 2, z, s2.g)));
  put(s2, box(22, 0.35, 11.6, mWhite, 1, Y1 + H1 + 0.17, -11.5, s2.g));
  [[-9.4, -15.4], [11.4, -15.4], [11.4, -7.2]].forEach(([x, z]) => put(s2, box(0.25, H2, 0.25, mWhite, x, Y2 + H2 / 2, z, s2.g)));
  put(s2, box(23.4, 0.32, 10.6, mWhite, 1.2, Y2 + H2 + 0.16, -11, s2.g));

  const s3 = addStage(); // fechamentos
  put(s3, box(18.6, H1 - 0.05, 0.05, mGlass, 0, Y1 + H1 / 2, -7.1, s3.g));
  for (let i = 0; i < 9; i++) put(s3, box(0.05, H1, 0.08, mFrame, -9.3 + i * 2.32, Y1 + H1 / 2, -7.08, s3.g));
  put(s3, box(0.3, H1, 9.8, mConcrete, -9.4, Y1 + H1 / 2, -12.1, s3.g));
  put(s3, box(19, H1, 0.3, mConcrete, 0, Y1 + H1 / 2, -17.1, s3.g));
  put(s3, box(18, H1 - 0.3, 0.05, mInner, 0, Y1 + H1 / 2, -12.5, s3.g));
  put(s3, box(3.2, 0.95, 1.1, mWhite, 4.5, Y1 + 0.47, -10.2, s3.g));
  const yUp = Y2 + H2 / 2;
  for (let i = 0; i < 44; i++) put(s3, box(0.09, H2 - 0.15, 0.2, mWood, -9.4 + i * 0.32, yUp, -5.85, s3.g));
  put(s3, box(8, H2 - 0.15, 0.05, mGlass, 7.6, yUp, -5.9, s3.g));
  put(s3, box(0.3, H2, 9.4, mWood, 11.5, yUp, -10.6, s3.g));
  put(s3, box(21, H2, 0.3, mConcrete, 1, yUp, -15.4, s3.g));
  put(s3, box(21, H2 - 0.3, 0.05, mInner, 1, yUp, -14.9, s3.g));
  put(s3, box(23.4, 1.0, 0.05, mGlass, 1.2, Y2 + 0.5, -5.72, s3.g));

  const s4 = addStage(); // cobertura, deck, piscina e píer
  put(s4, box(24.4, 0.22, 11.6, mWhite, 1.2, Y2 + H2 + 0.43, -11, s4.g));
  put(s4, box(24.5, 0.05, 0.05, mGold, 1.2, Y2 + H2 + 0.55, -5.2, s4.g));
  put(s4, box(27, 0.18, 7.2, mDeck, 0, Y0 + 0.09, -3.2, s4.g));
  put(s4, box(11, 0.2, 3.8, mPool, -5.2, Y0 + 0.12, -3.2, s4.g));
  put(s4, box(11.4, 0.24, 0.25, mConcrete, -5.2, Y0 + 0.14, -5.2, s4.g));
  const PL = 30, PX = 8.5;
  put(s4, box(2.4, 0.16, PL, mPier, PX, 1.15, 1 + PL / 2, s4.g));
  for (let i = 0; i <= 10; i++) {
    put(s4, cyl(0.13, 3.2, mWoodDark, PX - 1.1, -0.3, 1.6 + i * (PL / 10), s4.g, 8));
    put(s4, cyl(0.13, 3.2, mWoodDark, PX + 1.1, -0.3, 1.6 + i * (PL / 10), s4.g, 8));
  }
  put(s4, box(7.5, 0.16, 4.5, mDeck, PX, 1.15, PL + 3, s4.g));
  // deck avançado sobre o costão e saias de madeira (réguas horizontais fechando as laterais)
  const mSkirt = std(0xa06c45, 0.65, 0, woodTex(6, 1, 0));
  const DK = Y0 + 0.18; // topo do deck
  put(s4, box(20.5, 0.18, 4.2, mDeck, -3.25, DK - 0.09, 2.5, s4.g));
  function skirt(x1, z1, x2, z2, top, bottom) {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    for (let y = top - 0.08; y > bottom; y -= 0.15) {
      const b = box(len, 0.12, 0.035, mSkirt, (x1 + x2) / 2, y, (z1 + z2) / 2, s4.g); b.rotation.y = -ang; put(s4, b);
    }
    // testeira (acabamento superior)
    const t = box(len + 0.04, 0.05, 0.06, mDeck, (x1 + x2) / 2, top + 0.005, (z1 + z2) / 2, s4.g); t.rotation.y = -ang; put(s4, t);
  }
  skirt(-13.5, 4.62, 7.0, 4.62, DK, -0.45);   // frente voltada para o mar
  skirt(-13.52, -6.8, -13.52, 4.6, DK, -0.3); // lateral oeste
  skirt(7.02, 0.4, 7.02, 4.6, DK, -0.3);      // lateral junto ao píer
  skirt(13.52, -6.8, 13.52, 0.4, DK, 0.35);   // lateral leste
  // saia da plataforma do píer
  const PZ0 = PL + 0.75, PZ1 = PL + 5.25, PX0 = PX - 3.75, PX1 = PX + 3.75;
  skirt(PX0, PZ1, PX1, PZ1, 1.23, 0.25);
  skirt(PX0, PZ0, PX0, PZ1, 1.23, 0.25);
  skirt(PX1, PZ0, PX1, PZ1, 1.23, 0.25);
  for (let i = 0; i < 2; i++) put(s4, box(0.05, 0.05, PL, mFrame, PX - 1.15 + i * 2.3, 2.05, 1 + PL / 2, s4.g));
  for (let i = 0; i <= 15; i++) for (let k = 0; k < 2; k++) put(s4, box(0.05, 0.9, 0.05, mFrame, PX - 1.15 + k * 2.3, 1.6, 1 + i * 2, s4.g));

  const s5 = addStage(); // acabamento
  [-8.6, -6.2, -3.8].forEach((x) => { put(s5, box(0.75, 0.28, 2.1, mFabric, x, Y0 + 0.4, -0.6, s5.g)); put(s5, box(0.75, 0.45, 0.35, mFabric, x, Y0 + 0.62, -1.55, s5.g)); });
  put(s5, cyl(1.2, 0.08, std(0xf6f2e8, 0.9), 2.5, Y0 + 2.2, -1.2, s5.g, 24));
  put(s5, cyl(0.04, 2.1, mFrame, 2.5, Y0 + 1.1, -1.2, s5.g, 6));
  for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mInner); l.position.set(i % 2 ? PX + 1.15 : PX - 1.15, 2.15, 3 + i * 3.6); s5.g.add(l); put(s5, l); }
  // iate de 60 pés (~18,3 m), linhas de flybridge italiano — casco em V, janelas longas no costado, flybridge com hardtop
  function makeYacht() {
    const g = new THREE.Group();
    const L = 18.3, B = 4.9;
    const gel = std(0xf6f6f3, 0.22, 0.05, { envMapIntensity: 1.3 });
    const dark = std(0x0d1117, 0.08, 0.6, { envMapIntensity: 1.8 });
    const teak = std(0xa9774a, 0.7, 0, woodTex(1, 6, 0));
    const chrome = std(0xd9dde3, 0.15, 1);
    const anti = std(0x1b2433, 0.6);
    // casco: seções transversais ao longo do comprimento (z: 0 popa → L proa)
    const N = 28, pos = [], idx = [];
    const half = (u) => (u < 0.62 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.62) / 0.38, 2)))) * (B / 2) * (u < 0.05 ? 0.97 : 1);
    const sheer = (u) => 1.55 + Math.pow(u, 2.2) * 0.75;
    const keel = (u) => -0.95 + Math.pow(u, 3) * 0.75;
    const prof = (u) => { const b = Math.max(0.02, half(u)); return [[0, keel(u)], [b * 0.55, keel(u) * 0.55 + 0.05], [b * 0.92, -0.1], [b, 0.35], [b * 0.99, sheer(u)]]; };
    for (let i = 0; i <= N; i++) { const u = i / N, z = u * L - L / 2; const pr = prof(u); const row = [...pr.slice().reverse().map(([x, y]) => [-x, y]), ...pr.slice(1)]; row.forEach(([x, y]) => pos.push(x, y, z)); }
    const R = 9;
    for (let i = 0; i < N; i++) for (let j = 0; j < R - 1; j++) { const a = i * R + j, b = a + 1, c = a + R, d = c + 1; idx.push(a, c, b, b, c, d); }
    // espelho de popa
    const sb = pos.length / 3; const p0 = prof(0); const tr = [...p0.slice().reverse().map(([x, y]) => [-x, y]), ...p0.slice(1)];
    tr.forEach(([x, y]) => pos.push(x, y, -L / 2)); pos.push(0, 0.8, -L / 2); const cIdx = sb + R;
    for (let j = 0; j < R - 1; j++) idx.push(cIdx, sb + j, sb + j + 1);
    const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hg.setIndex(idx); hg.computeVertexNormals();
    const hull = new THREE.Mesh(hg, gel); hull.material.side = THREE.DoubleSide; hull.castShadow = true; hull.receiveShadow = true; g.add(hull);
    // faixa de antivegetativa na linha d'água
    const bt = new THREE.Mesh(hg, anti); bt.scale.set(1.004, 1, 1.002); bt.material.side = THREE.DoubleSide; bt.material.clippingPlanes = []; g.add(bt);
    bt.onBeforeRender = () => {}; bt.position.y = 0; bt.material = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: "varying float vy; void main(){ vy=position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ", fragmentShader: "varying float vy; void main(){ if(vy>0.05) discard; gl_FragColor=vec4(0.06,0.09,0.14,1.0);} " });
    // janelas longas no costado (assinatura do estilo)
    [-1, 1].forEach((sd) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 7.5), dark); w.position.set(sd * (B / 2 + 0.005), 0.95, -0.6); w.rotation.x = 0.03; g.add(w);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 2.2), dark); w2.position.set(sd * (B / 2 - 0.02), 1.0, 4.2); g.add(w2);
    });
    // convés de teca e plataforma de banho
    const deck = new THREE.Mesh(new THREE.BoxGeometry(B * 0.96, 0.08, L * 0.62), teak); deck.position.set(0, 1.58, -L * 0.17); deck.receiveShadow = true; g.add(deck);
    const swim = new THREE.Mesh(new THREE.BoxGeometry(B * 0.95, 0.12, 1.5), teak); swim.position.set(0, 0.45, -L / 2 - 0.7); swim.castShadow = true; g.add(swim);
    // superestrutura: perfil com para-brisa inclinado
    const sup = new THREE.Shape(); sup.moveTo(-5.2, 0); sup.lineTo(4.6, 0); sup.lineTo(2.6, 1.55); sup.lineTo(-4.6, 1.6); sup.lineTo(-5.2, 1.6); sup.lineTo(-5.2, 0);
    const supG = new THREE.ExtrudeGeometry(sup, { depth: B * 0.82, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 }); supG.translate(0, 0, -B * 0.41);
    const house = new THREE.Mesh(supG, gel); house.rotation.y = -Math.PI / 2; house.position.set(0, 1.6, 0.4); house.castShadow = true; g.add(house);
    // vidros escuros da superestrutura
    const wsh = new THREE.Mesh(new THREE.PlaneGeometry(B * 0.8, 2.3), dark); wsh.position.set(0, 2.42, 4.55); wsh.rotation.x = -0.66; g.add(wsh);
    [-1, 1].forEach((sd) => { const sw = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 6.4), dark); sw.position.set(sd * (B * 0.41 + 0.07), 2.45, 0.2); g.add(sw); });
    // flybridge com hardtop e arco
    const fly = new THREE.Mesh(new THREE.BoxGeometry(B * 0.8, 0.12, 7.2), gel); fly.position.set(0, 3.27, -1.6); fly.castShadow = true; g.add(fly);
    const flyRail = new THREE.Mesh(new THREE.BoxGeometry(B * 0.82, 0.55, 0.1), gel); flyRail.position.set(0, 3.55, 1.95); g.add(flyRail);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(B * 0.6, 0.4, 1.2), std(0xe8e2d6, 0.9)); seat.position.set(0, 3.53, -3.4); g.add(seat);
    [-1, 1].forEach((sd) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.5), gel); leg.position.set(sd * B * 0.36, 3.95, -0.9); leg.rotation.z = sd * -0.12; g.add(leg); });
    const top = new THREE.Mesh(new THREE.BoxGeometry(B * 0.86, 0.09, 4.2), gel); top.position.set(0, 4.6, -1.3); top.castShadow = true; g.add(top);
    const radar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 20), std(0xffffff, 0.3)); radar.position.set(0, 4.75, -0.6); g.add(radar);
    // guarda-mancebo de inox na proa
    [-1, 1].forEach((sd) => { const pts = []; for (let k = 0; k <= 10; k++) { const u = 0.62 + k * 0.034; pts.push(new THREE.Vector3(sd * (half(u) - 0.12), sheer(u) + 0.6, u * L - L / 2)); } const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 6), chrome); g.add(rail); });
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  const boat = makeYacht(); s5.g.add(boat);
  boat.position.set(PX + 1.2 + 2.45 + 0.45, -0.15, 15.5);
  put(s5, boat);

  // luzes noturnas
  const poolLight = new THREE.PointLight(0x5fd2ff, 0, 12); poolLight.position.set(-5.2, Y0 + 0.4, -3.2); scene.add(poolLight);
  const inLight1 = new THREE.PointLight(0xffb45c, 0, 18); inLight1.position.set(-2, Y1 + 2, -9); scene.add(inLight1);
  const inLight2 = new THREE.PointLight(0xffb45c, 0, 18); inLight2.position.set(4, Y2 + 1.8, -8.5); scene.add(inLight2);

  stages.forEach((st) => st.items.forEach((m) => (m.visible = false)));

  // mobiliário real em glTF (sofá e cadeiras)
  if (THREE.GLTFLoader) {
    const gl = new THREE.GLTFLoader();
    const place = (url, list) => gl.load(url, (g) => {
      const lights = []; g.scene.traverse((o) => { if (o.isLight) lights.push(o); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); lights.forEach((l) => l.parent.remove(l));
      list.forEach(([x, y, z, ry, sc]) => { const m = g.scene.clone(true); m.position.set(x, y, z); m.rotation.y = ry; m.scale.setScalar(sc || 1); m.visible = false; s5.g.add(m); put(s5, m); });
      stdMats = null; lastEnvK = -1;
    });
    place("assets/3d/GlamVelvetSofa.glb", [[-4, Y1, -10.2, 0, 1.15], [3.5, Y2, -9.8, 0, 1.1]]);
    place("assets/3d/SheenChair.glb", [[-1.2, Y1, -8.4, -0.6, 1.1], [-6.8, Y1, -8.4, 0.6, 1.1], [1.5, Y0 + 0.18, -1.5, -0.4, 1.1], [3.6, Y0 + 0.18, -1.2, 0.5, 1.1]]);
  }

  // ---------- rolagem → progresso ----------
  let target = 0, prog = 0;
  function readScroll() { const r = stage.getBoundingClientRect(); target = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); }
  function resize() { const w = holder.clientWidth, h = holder.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 46 : 30; camera.updateProjectionMatrix(); }
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", () => { resize(); readScroll(); });
  resize(); readScroll();

  const caps = [...document.querySelectorAll("#obra [data-etapa]")];
  const bar = document.getElementById("obraBarra");
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const N = stages.length, span = 1 / (N + 1);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let last = performance.now(), running = true;
  let stdMats = null, lastEnvK = -1; // materiais PBR coletados uma vez (refeito quando chega o glTF)
  new IntersectionObserver((es) => es.forEach((e) => { const was = running; running = e.isIntersecting; if (running && !was) { last = performance.now(); requestAnimationFrame(loop); } })).observe(holder);

  const look = new THREE.Vector3(), closePos = new THREE.Vector3(), closeLook = new THREE.Vector3();
  function loop(now) {
    if (!running) return;
    const dt = Math.min(50, now - last); last = now;
    prog += (target - prog) * (reduce ? 1 : Math.min(1, dt * 0.0035));
    const t = now / 1000;

    stages.forEach((st, si) => {
      const k = ease((prog - si * span * 0.92) / (span * 0.9));
      const n = st.items.length;
      st.items.forEach((m, i) => {
        const kk = ease(k * 1.5 - (i / Math.max(1, n)) * 0.5);
        m.visible = kk > 0.001; if (!m.visible) return;
        const f = m.userData.final, sf = m.userData.scaleFinal;
        m.position.set(f.x, f.y + (1 - kk) * 4, f.z);
        m.scale.set(sf.x, sf.y * Math.max(0.001, kk), sf.z);
      });
    });

    // fim de tarde dourado → crepúsculo na entrega
    const night = ease((prog - N * span * 0.92) / (span * 0.9));
    const elev = 9 - night * 15;
    setSun(elev, 228);
    sun.position.copy(sunDir).multiplyScalar(120).add(sun.target.position);
    sun.intensity = Math.max(0, 2.2 * Math.min(1, (elev + 1) / 6));
    hemi.intensity = 0.35 - night * 0.29;
    const envK = (hdrReady ? 0.55 : 1) * (1 - night * 0.94);
    if (!stdMats) { stdMats = new Set(); scene.traverse((o) => { const m = o.material; if (m && m.isMeshStandardMaterial) { if (m.userData.env0 === undefined) m.userData.env0 = m.envMapIntensity; stdMats.add(m); } }); }
    if (envK !== lastEnvK) { lastEnvK = envK; stdMats.forEach((m) => (m.envMapIntensity = m.userData.env0 * envK)); }
    scene.fog.color.setRGB(0.49 - night * 0.43, 0.54 - night * 0.47, 0.63 - night * 0.52);
    renderer.toneMappingExposure = 0.8 - night * 0.3;
    mInner.emissiveIntensity = 0.05 + night * 5;
    mPool.emissiveIntensity = 0.25 + night * 1.6;
    poolLight.intensity = night * 2.5; inLight1.intensity = night * 2.2; inLight2.intensity = night * 2;

    water.material.uniforms.time.value = t * 0.45;
    boat.rotation.z = Math.sin(t * 0.8) * 0.025; boat.rotation.x = Math.sin(t * 0.6) * 0.012; boat.position.y = -0.15 + Math.sin(t * 1.1) * 0.05;
    palms.forEach((p, i) => { p.rotation.z = Math.sin(t * 0.7 + i) * 0.03; p.rotation.x = Math.cos(t * 0.5 + i) * 0.02; });

    // câmera de cinema: drone alto que desce e circula a casa
    const ang = -1.05 + prog * 1.55 + Math.sin(t * 0.08) * 0.02;
    const rad = (innerWidth < innerHeight ? 78 : 64) - prog * 12;
    camera.position.set(Math.sin(ang) * rad, 15 - prog * 8 + Math.sin(t * 0.3) * 0.15, Math.cos(ang) * rad + 4);
    look.set(1, 6 - prog * 2.5, -8 + prog * 3);
    const close = ease((prog - 0.68) / 0.32) * 0.8;
    if (close > 0) { camera.position.lerp(closePos.set(-3 + Math.sin(t * 0.15) * 0.3, 4.4, 15), close); look.lerp(closeLook.set(-1.5, 2.4, -8.5), close); }
    camera.lookAt(look);

    const idx = Math.min(caps.length - 1, Math.floor(prog * caps.length * 0.999));
    caps.forEach((c, i) => c.classList.toggle("on", i === idx));
    if (bar) bar.style.transform = `scaleX(${prog})`;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
