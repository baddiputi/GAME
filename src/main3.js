import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─────────────────────────────────────────────
//  SCENE
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 150, 500);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 8, -18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// ─────────────────────────────────────────────
//  LIGHTS
// ─────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
sun.position.set(100, 200, 100);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 800;
sun.shadow.camera.left = -300; sun.shadow.camera.right = 300;
sun.shadow.camera.top = 300; sun.shadow.camera.bottom = -300;
scene.add(sun);

// ─────────────────────────────────────────────
//  TEXTURES
// ─────────────────────────────────────────────
const texLoader = new THREE.TextureLoader();
function loadTex(path, rx = 1, ry = 1) {
    const t = texLoader.load(path);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
}
const roadTex = loadTex('/public/textures/road.jpg', 1, 60);
const grassTex = loadTex('/public/textures/grass.jpg', 40, 40);
const paveTex = loadTex('/public/textures/pavement.jpg', 1, 60);
const buildTex = loadTex('/public/textures/building8.jpg', 1, 2);

// ─────────────────────────────────────────────
//  ROAD LAYOUT
//  4 lanes: 2 forward (Z+), 2 reverse (Z-)
//  Lane centers: -6, -2, +2, +6  (road width 16)
// ─────────────────────────────────────────────
const ROAD_LEN = 1000;
const ROAD_W = 16;
const LANE_W = 4;
const LANE_CX = [-6, -2, 2, 6];   // X of lane centers
const PLAYER_LANE_X = LANE_CX[1];    // player starts in lane 1 (forward)

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: grassTex })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Road
const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: roadTex })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.01;
road.receiveShadow = true;
scene.add(road);

// Sidewalks
[-10, 10].forEach(x => {
    const sw = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.4, ROAD_LEN),
        new THREE.MeshStandardMaterial({ map: paveTex })
    );
    sw.position.set(x, 0.2, 0);
    sw.receiveShadow = true;
    scene.add(sw);
});

// Center double-yellow divider
const divMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
[-0.3, 0.3].forEach(xOff => {
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, ROAD_LEN), divMat);
    div.position.set(xOff, 0.06, 0);
    scene.add(div);
});

// Lane dashes
function makeDashes(xPos, color = 0xffffff) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const geo = new THREE.BoxGeometry(0.2, 0.05, 5);
    const count = Math.floor(ROAD_LEN / 14);
    for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(xPos, 0.06, -ROAD_LEN / 2 + i * 14 + 7);
        scene.add(m);
    }
}
[-8, 8].forEach(x => makeDashes(x, 0xffffff));   // road edges
[-4, 4].forEach(x => makeDashes(x, 0xdddddd));   // inner lane dividers

// ─────────────────────────────────────────────
//  BUILDINGS
// ─────────────────────────────────────────────
const bColors = [0x8b7355, 0x6b8e9f, 0x9c8770, 0x7a9a6a, 0xa89985, 0x5f7a8a];
for (let z = -ROAD_LEN / 2 + 20; z < ROAD_LEN / 2; z += 35) {
    [-1, 1].forEach(side => {
        const w = 14 + Math.random() * 10;
        const h = 15 + Math.random() * 35;
        const d = 12 + Math.random() * 8;
        const xPos = side * (ROAD_W / 2 + 6 + w / 2);
        const b = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ map: buildTex, color: bColors[Math.floor(Math.random() * bColors.length)] })
        );
        b.position.set(xPos, h / 2, z);
        b.castShadow = true;
        scene.add(b);
    });
}

// ─────────────────────────────────────────────
//  STREET LAMPS
// ─────────────────────────────────────────────
function makeLamp(x, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7, 6), poleMat);
    pole.position.set(x, 3.5, z);
    scene.add(pole);
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffee88, emissiveIntensity: 0.8 })
    );
    head.position.set(x + (x > 0 ? -0.5 : 0.5), 7.2, z);
    scene.add(head);
}
for (let z = -ROAD_LEN / 2 + 20; z < ROAD_LEN / 2; z += 30) {
    makeLamp(-9, z); makeLamp(9, z);
}

// ─────────────────────────────────────────────
//  TRAFFIC SIGNALS
//  Placed every SIGNAL_SPACING units along Z
// ─────────────────────────────────────────────
const SIGNAL_SPACING = 120;
const signals = [];   // { z, stopLineZ, phase, timer, mesh, lights:{r,y,g} }

const SIGNAL_PHASES = {
    easy: { red: 8, yellow: 2, green: 10 },
    medium: { red: 6, yellow: 2, green: 7 },
    hard: { red: 5, yellow: 1.5, green: 5 },
};

function buildSignalPole(z) {
    const group = new THREE.Group();
    // Pole
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 })
    );
    pole.position.set(0, 3, 0);
    group.add(pole);
    // Housing
    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 2.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    housing.position.set(0, 6.5, 0);
    group.add(housing);
    // Lights
    const lightGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const rMesh = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1 }));
    rMesh.position.set(0, 7.4, 0.26);
    const yMesh = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({ color: 0x555500, emissive: 0x000000, emissiveIntensity: 0 }));
    yMesh.position.set(0, 6.5, 0.26);
    const gMesh = new THREE.Mesh(lightGeo, new THREE.MeshStandardMaterial({ color: 0x005500, emissive: 0x000000, emissiveIntensity: 0 }));
    gMesh.position.set(0, 5.6, 0.26);
    group.add(rMesh, yMesh, gMesh);

    // Place pole on the RIGHT side of the player's forward lanes (x > 0 edge)
    // so the signal faces the player who drives in the left (negative-X) lanes
    group.position.set(ROAD_W / 2 + 0.5, 0, z);
    // Rotate housing to face toward negative-X (toward player)
    group.rotation.y = Math.PI;
    scene.add(group);

    // Stop line spans only the forward (player) lanes: x from -ROAD_W/2 to 0
    const stopLine = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_W / 2, 0.06, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stopLine.position.set(-ROAD_W / 4, 0.04, z - 2);
    scene.add(stopLine);

    return { z, stopLineZ: z - 2, phase: 'red', timer: SIGNAL_PHASES.easy.red, lights: { r: rMesh, y: yMesh, g: gMesh } };
}

for (let z = -ROAD_LEN / 2 + 80; z < ROAD_LEN / 2 - 40; z += SIGNAL_SPACING) {
    signals.push(buildSignalPole(z));
}

function setSignalLight(sig, phase) {
    sig.phase = phase;
    // Reset all
    sig.lights.r.material.emissive.set(0x000000); sig.lights.r.material.emissiveIntensity = 0;
    sig.lights.y.material.emissive.set(0x000000); sig.lights.y.material.emissiveIntensity = 0;
    sig.lights.g.material.emissive.set(0x000000); sig.lights.g.material.emissiveIntensity = 0;
    if (phase === 'red') { sig.lights.r.material.emissive.set(0xff1744); sig.lights.r.material.emissiveIntensity = 1.5; }
    if (phase === 'yellow') { sig.lights.y.material.emissive.set(0xffab00); sig.lights.y.material.emissiveIntensity = 1.5; }
    if (phase === 'green') { sig.lights.g.material.emissive.set(0x00e676); sig.lights.g.material.emissiveIntensity = 1.5; }
}

// ─────────────────────────────────────────────
//  PEDESTRIAN CROSSINGS
// ─────────────────────────────────────────────
const crossings = [];   // { z, active, timer, pedestrians[] }

function buildCrossing(z) {
    // Zebra stripes
    for (let i = 0; i < 4; i++) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(ROAD_W, 0.06, 0.6),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        stripe.position.set(0, 0.04, z + i * 1.0);
        scene.add(stripe);
    }
    return { z, active: false, timer: 0, pedestrians: [] };
}

// Place crossings between signals
for (let z = -ROAD_LEN / 2 + 140; z < ROAD_LEN / 2 - 40; z += SIGNAL_SPACING) {
    crossings.push(buildCrossing(z));
}

// Pedestrian mesh
function makePedestrian(z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.0, 4, 8),
        new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xff6b6b : 0x6b9fff })
    );
    body.position.y = 0.9;
    g.add(body);
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 })
    );
    head.position.y = 1.9;
    g.add(head);
    g.position.set(-ROAD_W / 2 - 1, 0, z);
    scene.add(g);
    return g;
}

// ─────────────────────────────────────────────
//  SPEED LIMIT ZONES
// ─────────────────────────────────────────────
const SPEED_ZONES = [
    { zMin: -ROAD_LEN / 2, zMax: ROAD_LEN / 2, limit: 40 },
];
function getSpeedLimit(z) {
    for (const zone of SPEED_ZONES) {
        if (z >= zone.zMin && z <= zone.zMax) return zone.limit;
    }
    return 40;
}

// ─────────────────────────────────────────────
//  DIFFICULTY CONFIG
// ─────────────────────────────────────────────
const DIFFICULTY = {
    easy: { violLimit: 8, speedTolerance: 15, label: 'EASY' },
    medium: { violLimit: 5, speedTolerance: 8, label: 'MEDIUM' },
    hard: { violLimit: 3, speedTolerance: 3, label: 'HARD' },
};
let currentDifficulty = 'easy';

window.setDifficulty = function (level) {
    currentDifficulty = level;
    document.querySelectorAll('.diff-btn').forEach(b => b.className = 'diff-btn');
    document.getElementById('btn-' + level).classList.add('active-' + level);
};

// ─────────────────────────────────────────────
//  PLAYER CAR
// ─────────────────────────────────────────────
const playerGroup = new THREE.Group();
scene.add(playerGroup);

// Fallback box car
const fbBody = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.4, 6.5),
    new THREE.MeshStandardMaterial({ color: 0x2266ff, metalness: 0.5 })
);
fbBody.position.y = 0.9; fbBody.castShadow = true;
playerGroup.add(fbBody);
const fbCabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.0, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x1133aa })
);
fbCabin.position.set(0, 2.1, -0.3);
playerGroup.add(fbCabin);
[[-1.8, .55, 2.2], [1.8, .55, 2.2], [-1.8, .55, -2.2], [1.8, .55, -2.2]].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    playerGroup.add(w);
});

playerGroup.position.set(PLAYER_LANE_X, 0, -ROAD_LEN / 2 + 30);

// Load GLB
const gltfLoader = new GLTFLoader();
gltfLoader.load('/public/textures/car.glb', gltf => {
    const car = gltf.scene;
    car.scale.set(10, 10, 10);
    while (playerGroup.children.length) playerGroup.remove(playerGroup.children[0]);
    playerGroup.add(car);
}, undefined, () => { });

// ─────────────────────────────────────────────
//  PLAYER PHYSICS
// ─────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
document.addEventListener('keyup', e => { keys[e.code] = false; });

let velZ = 0;
const ACCEL = 0.035;
const MAX_SPD = 1.6;
const BRAKE = 0.84;
const FRIC = 0.97;
const STEER = 0.026;

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
let score = 100;
let violations = 0;
let gameOver = false;
let safeTimer = 0;   // passive score timer (every 10 s)
let overspeedTimer = 0; // how long player has been over limit
let wrongDirTimer = 0; // continuous wrong-direction penalty timer
let redViolCooldown = 0;
let pedViolCooldown = 0;
let warningTimer = 0;
let cameraShake = 0;
const cameraOffset = new THREE.Vector3(0, 8, -18);

// ─────────────────────────────────────────────
//  HUD REFS
// ─────────────────────────────────────────────
const speedEl = document.getElementById('speed-val');
const speedBar = document.getElementById('speed-bar');
const scoreEl = document.getElementById('score-val');
const violEl = document.getElementById('viol-val');
const limitEl = document.getElementById('limit-val');
const sigLabel = document.getElementById('signal-label');
const dotRed = document.getElementById('dot-red');
const dotYellow = document.getElementById('dot-yellow');
const dotGreen = document.getElementById('dot-green');
const warnFlash = document.getElementById('warning-flash');
const redFlash = document.getElementById('red-flash');
const warnMsg = document.getElementById('warning-msg');
const mmCtx = document.getElementById('minimap-canvas').getContext('2d');

// ─────────────────────────────────────────────
//  NEAREST SIGNAL HUD
// ─────────────────────────────────────────────
function updateSignalHUD(phase) {
    dotRed.classList.remove('active');
    dotYellow.classList.remove('active');
    dotGreen.classList.remove('active');
    if (phase === 'red') { dotRed.classList.add('active'); sigLabel.textContent = 'RED'; }
    if (phase === 'yellow') { dotYellow.classList.add('active'); sigLabel.textContent = 'YELLOW'; }
    if (phase === 'green') { dotGreen.classList.add('active'); sigLabel.textContent = 'GREEN'; }
}

// ─────────────────────────────────────────────
//  WARNING DISPLAY
// ─────────────────────────────────────────────
function showWarning(msg, isRed = false) {
    warnMsg.textContent = msg;
    warnMsg.style.opacity = '1';
    if (isRed) { redFlash.style.opacity = '1'; setTimeout(() => redFlash.style.opacity = '0', 250); }
    else { warnFlash.style.opacity = '1'; setTimeout(() => warnFlash.style.opacity = '0', 250); }
    warningTimer = 2.5;
}

// ─────────────────────────────────────────────
//  VIOLATION
// ─────────────────────────────────────────────
function addViolation(msg, pts = 10, isRed = false) {
    violations++;
    score = Math.max(0, score - pts);
    showWarning(msg, isRed);
    cameraShake = 20;
    const cfg = DIFFICULTY[currentDifficulty];
    if (violations >= cfg.violLimit && !gameOver) {
        gameOver = true;
        showLicenseSuspended();
    }
}

// ─────────────────────────────────────────────
//  GAME OVER
// ─────────────────────────────────────────────
function showLicenseSuspended() {
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.88);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;font-family:'Arial Black',sans-serif;color:#fff;`;
    ov.innerHTML = `
      <div style="font-size:48px;font-weight:900;color:#ff1744;letter-spacing:6px;text-shadow:0 0 30px #ff1744;margin-bottom:10px;">🚫 LICENSE SUSPENDED</div>
      <div style="font-size:18px;color:rgba(255,255,255,0.6);margin-bottom:6px;">Too many traffic violations</div>
      <div style="font-size:52px;font-weight:900;color:#00e5ff;text-shadow:0 0 20px #00e5ff;margin-bottom:8px;">${Math.max(0, score)}</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.45);margin-bottom:28px;">Violations: ${violations}</div>
      <div style="display:flex;gap:14px;">
        <button onclick="location.reload()" style="font-family:'Arial Black',sans-serif;font-size:13px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid #00e5ff;background:rgba(0,229,255,0.15);color:#00e5ff;cursor:pointer;">TRY AGAIN</button>
        <button onclick="location.href='index.html'" style="font-family:'Arial Black',sans-serif;font-size:13px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);cursor:pointer;">MAIN MENU</button>
      </div>`;
    document.body.appendChild(ov);
}

function showSuccess() {
    score += 50;
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;font-family:'Arial Black',sans-serif;color:#fff;`;
    ov.innerHTML = `
      <div style="font-size:48px;font-weight:900;color:#00e676;letter-spacing:6px;text-shadow:0 0 30px #00e676;margin-bottom:10px;">✅ ROUTE COMPLETE!</div>
      <div style="font-size:18px;color:rgba(255,255,255,0.6);margin-bottom:6px;">+50 Bonus for clean driving!</div>
      <div style="font-size:52px;font-weight:900;color:#00e5ff;text-shadow:0 0 20px #00e5ff;margin-bottom:28px;">${score}</div>
      <div style="display:flex;gap:14px;">
        <button onclick="location.reload()" style="font-family:'Arial Black',sans-serif;font-size:13px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid #00e676;background:rgba(0,230,118,0.15);color:#00e676;cursor:pointer;">PLAY AGAIN</button>
        <button onclick="location.href='index.html'" style="font-family:'Arial Black',sans-serif;font-size:13px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);cursor:pointer;">MAIN MENU</button>
      </div>`;
    document.body.appendChild(ov);
}

// ─────────────────────────────────────────────
//  UPDATE SIGNALS
// ─────────────────────────────────────────────
function updateSignals(delta) {
    const phases = SIGNAL_PHASES[currentDifficulty];
    signals.forEach(sig => {
        sig.timer -= delta;
        if (sig.timer <= 0) {
            if (sig.phase === 'red') { setSignalLight(sig, 'green'); sig.timer = phases.green; }
            else if (sig.phase === 'green') { setSignalLight(sig, 'yellow'); sig.timer = phases.yellow; }
            else if (sig.phase === 'yellow') { setSignalLight(sig, 'red'); sig.timer = phases.red; }
        }
    });
}

// ─────────────────────────────────────────────
//  UPDATE PEDESTRIANS
// ─────────────────────────────────────────────
function updatePedestrians(delta) {
    crossings.forEach(cr => {
        cr.timer -= delta;
        if (cr.timer <= 0) {
            cr.active = !cr.active;
            cr.timer = cr.active ? 8 : 12;
            if (cr.active) {
                // Spawn 1-3 pedestrians
                const count = 1 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i++) {
                    const ped = makePedestrian(cr.z + i * 0.8);
                    cr.pedestrians.push({ mesh: ped, speed: 0.02 + Math.random() * 0.02, done: false });
                }
            } else {
                cr.pedestrians.forEach(p => scene.remove(p.mesh));
                cr.pedestrians = [];
            }
        }
        // Walk pedestrians across road
        cr.pedestrians.forEach(p => {
            if (!p.done) {
                p.mesh.position.x += p.speed;
                if (p.mesh.position.x > ROAD_W / 2 + 1) p.done = true;
            }
        });
    });
}

// ─────────────────────────────────────────────
//  TRAFFIC RULE CHECKS
// ─────────────────────────────────────────────
function checkRules(delta, kmh) {
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;
    const cfg = DIFFICULTY[currentDifficulty];

    // ── Speed limit ──
    const limit = getSpeedLimit(pz);
    limitEl.textContent = limit;
    if (kmh > limit + cfg.speedTolerance) {
        overspeedTimer += delta;
        if (overspeedTimer >= 2) {
            addViolation(`⚡ OVERSPEED! ${Math.round(kmh)} km/h in ${limit} zone`, 10);
            overspeedTimer = 0;
        }
    } else {
        overspeedTimer = 0;
    }

    // ── Red light ──
    if (redViolCooldown > 0) redViolCooldown -= delta;
    signals.forEach(sig => {
        if (sig.phase !== 'red') return;
        const stopZ = sig.stopLineZ;
        // Player crossed stop line while red (moving forward = increasing Z)
        if (pz > stopZ && pz < stopZ + 8 && velZ > 0.05 && redViolCooldown <= 0) {
            addViolation('🚨 RED LIGHT VIOLATION!', 20, true);
            redViolCooldown = 5;
        }
    });

    // ── Yellow light slow-down hint (no penalty, just HUD) ──
    signals.forEach(sig => {
        if (sig.phase === 'yellow' && Math.abs(pz - sig.z) < 20 && kmh > 20) {
            // Just show advisory — no penalty
            if (warningTimer <= 0) showWarning('🟡 Slow Down — Yellow Light');
        }
    });

    // ── Lane discipline ──
    // Player must stay within -8 to +8 (road edges)
    if (Math.abs(px) > ROAD_W / 2 + 0.5) {
        addViolation('🛣 SIDEWALK VIOLATION!', 5);
    }
    // Crossing center double-yellow (going to wrong side)
    if (px > 0.5 && velZ > 0.05) {
        // Player is on the oncoming side while moving forward
        wrongDirTimer += delta;
        if (wrongDirTimer >= 1.5) {
            addViolation('⚠️ WRONG DIRECTION!', 10, true);
            wrongDirTimer = 0;
        }
    } else {
        wrongDirTimer = 0;
    }

    // ── Pedestrian priority ──
    if (pedViolCooldown > 0) pedViolCooldown -= delta;
    crossings.forEach(cr => {
        if (!cr.active) return;
        const inZone = Math.abs(pz - cr.z) < 5;
        if (inZone && kmh > 5 && pedViolCooldown <= 0) {
            addViolation('🚶 PEDESTRIAN CROSSING VIOLATION!', 15, true);
            pedViolCooldown = 4;
        }
    });

    // ── Nearest signal for HUD ──
    let nearest = null, nearDist = Infinity;
    signals.forEach(sig => {
        const d = Math.abs(pz - sig.z);
        if (d < nearDist) { nearDist = d; nearest = sig; }
    });
    if (nearest) updateSignalHUD(nearest.phase);

    // ── Correct stop at red ──
    signals.forEach(sig => {
        if (sig.phase === 'red') {
            const stopZ = sig.stopLineZ;
            if (pz < stopZ && pz > stopZ - 8 && kmh < 2) {
                // Player is stopped before stop line — passive bonus (once per red phase)
                // (handled in safeTimer logic below)
            }
        }
    });

    // ── Route end ──
    if (pz > ROAD_LEN / 2 - 30 && !gameOver) {
        gameOver = true;
        showSuccess();
    }
}

// ─────────────────────────────────────────────
//  UPDATE HUD
// ─────────────────────────────────────────────
function updateHUD(kmh) {
    speedEl.innerHTML = Math.round(kmh) + ' <span style="font-size:12px;color:rgba(255,255,255,0.5)">km/h</span>';
    speedBar.style.width = Math.min(100, (kmh / 120) * 100) + '%';
    speedBar.style.background = kmh > getSpeedLimit(playerGroup.position.z) + DIFFICULTY[currentDifficulty].speedTolerance
        ? 'linear-gradient(90deg,#ff1744,#ff6090)'
        : 'linear-gradient(90deg,#00b0ff,#00e5ff)';
    scoreEl.textContent = Math.max(0, Math.round(score));
    violEl.textContent = violations;
    violEl.style.color = violations >= DIFFICULTY[currentDifficulty].violLimit - 1 ? '#ff1744' : '#ff5252';
}

// ─────────────────────────────────────────────
//  MINIMAP
// ─────────────────────────────────────────────
function drawMinimap() {
    const W = 100, H = 100;
    mmCtx.clearRect(0, 0, W, H);
    // Road
    mmCtx.fillStyle = '#333';
    mmCtx.fillRect(35, 0, 30, H);
    // Player dot
    const pz = playerGroup.position.z;
    const py = ((pz + ROAD_LEN / 2) / ROAD_LEN) * H;
    mmCtx.fillStyle = '#00e5ff';
    mmCtx.beginPath();
    mmCtx.arc(50, H - py, 4, 0, Math.PI * 2);
    mmCtx.fill();
    // Signals
    signals.forEach(sig => {
        const sy = ((sig.z + ROAD_LEN / 2) / ROAD_LEN) * H;
        mmCtx.fillStyle = sig.phase === 'red' ? '#ff1744' : sig.phase === 'yellow' ? '#ffab00' : '#00e676';
        mmCtx.fillRect(33, H - sy - 2, 4, 4);
    });
}

// ─────────────────────────────────────────────
//  CAMERA
// ─────────────────────────────────────────────
const camTarget = new THREE.Vector3();
function updateCamera() {
    const desired = cameraOffset.clone().applyQuaternion(playerGroup.quaternion).add(playerGroup.position);
    if (cameraShake > 0) {
        const s = 0.3 * (cameraShake / 20);
        desired.x += (Math.random() - 0.5) * s;
        desired.y += (Math.random() - 0.5) * s * 0.5;
        cameraShake--;
    }
    camera.position.lerp(desired, 0.12);
    camTarget.copy(playerGroup.position).add(new THREE.Vector3(0, 2, 0));
    camera.lookAt(camTarget);
}

// ─────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!gameOver) {
        // ── Player controls ──
        if (keys['ArrowLeft'] || keys['KeyA']) playerGroup.rotation.y += STEER;
        if (keys['ArrowRight'] || keys['KeyD']) playerGroup.rotation.y -= STEER;
        if (keys['ArrowUp'] || keys['KeyW']) velZ += ACCEL;
        else if (keys['ArrowDown'] || keys['KeyS']) velZ -= ACCEL * 0.7;
        if (keys['Space']) velZ *= BRAKE;

        velZ = Math.max(-MAX_SPD * 0.4, Math.min(MAX_SPD, velZ));
        velZ *= FRIC;
        playerGroup.translateZ(velZ);

        // Road boundary
        const px = playerGroup.position.x;
        if (Math.abs(px) > ROAD_W / 2 + 2) {
            playerGroup.position.x = Math.sign(px) * (ROAD_W / 2 + 2);
            velZ *= 0.5;
        }

        // Wrap Z
        const halfLen = ROAD_LEN / 2;
        if (playerGroup.position.z > halfLen - 10) {
            playerGroup.position.z = halfLen - 10;
            if (!gameOver) { gameOver = true; showSuccess(); }
        }

        const kmh = Math.abs(velZ) * 120;

        // ── Rule checks ──
        checkRules(delta, kmh);

        // ── Passive score ──
        if (kmh > 2) {
            safeTimer += delta;
            if (safeTimer >= 10) { score += 1; safeTimer = 0; }
        }

        // ── Warning fade ──
        if (warningTimer > 0) {
            warningTimer -= delta;
            if (warningTimer <= 0) warnMsg.style.opacity = '0';
        }

        updateHUD(kmh);
        updateSignals(delta);
        updatePedestrians(delta);
    }

    updateCamera();
    drawMinimap();
    renderer.render(scene, camera);
}

animate();
