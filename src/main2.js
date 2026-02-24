import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─────────────────────────────────────────────
//  SCENE SETUP
// ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 200, 600);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, -18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────────
//  LIGHTS
// ─────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
sunLight.position.set(100, 200, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 800;
sunLight.shadow.camera.left = -300;
sunLight.shadow.camera.right = 300;
sunLight.shadow.camera.top = 300;
sunLight.shadow.camera.bottom = -300;
scene.add(sunLight);

// ─────────────────────────────────────────────
//  TEXTURES
// ─────────────────────────────────────────────
const texLoader = new THREE.TextureLoader();

function loadTex(path, repeatX = 1, repeatY = 1) {
    const t = texLoader.load(path);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    return t;
}

const roadTex = loadTex('/public/textures/road.jpg', 1, 80);
const grassTex = loadTex('/public/textures/grass.jpg', 40, 40);
const paveTex = loadTex('/public/textures/pavement.jpg', 1, 80);
const buildTex = loadTex('/public/textures/building8.jpg', 1, 2);

// ─────────────────────────────────────────────
//  ROAD LAYOUT — Long straight highway
//  6 lanes total: 3 forward (Z+), 3 reverse (Z-)
//  Lane centers (X): -20, -12, -4, +4, +12, +20
//  Road total width = 48 units
// ─────────────────────────────────────────────
const ROAD_LENGTH = 1200;
const ROAD_WIDTH = 48;
const LANE_WIDTH = 8;
const LANE_CENTERS = [-20, -12, -4, 4, 12, 20]; // X positions of lane centers

// Ground
const groundGeo = new THREE.PlaneGeometry(400, ROAD_LENGTH);
const groundMat = new THREE.MeshStandardMaterial({ map: grassTex });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Road surface
const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
const roadMat = new THREE.MeshStandardMaterial({ map: roadTex });
const roadMesh = new THREE.Mesh(roadGeo, roadMat);
roadMesh.rotation.x = -Math.PI / 2;
roadMesh.position.y = 0.01;
roadMesh.receiveShadow = true;
scene.add(roadMesh);

// Sidewalks
[-28, 28].forEach(xPos => {
    const swGeo = new THREE.BoxGeometry(8, 0.5, ROAD_LENGTH);
    const swMat = new THREE.MeshStandardMaterial({ map: paveTex });
    const sw = new THREE.Mesh(swGeo, swMat);
    sw.position.set(xPos, 0.25, 0);
    sw.receiveShadow = true;
    scene.add(sw);
});

// Center divider
const divGeo = new THREE.BoxGeometry(0.6, 0.3, ROAD_LENGTH);
const divMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const divider = new THREE.Mesh(divGeo, divMat);
divider.position.set(0, 0.16, 0);
scene.add(divider);

// Lane dashes
function createLaneDashes(xPos, color = 0xffffff) {
    const dashGeo = new THREE.BoxGeometry(0.25, 0.05, 6);
    const dashMat = new THREE.MeshBasicMaterial({ color });
    const count = Math.floor(ROAD_LENGTH / 16);
    for (let i = 0; i < count; i++) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.position.set(xPos, 0.06, -ROAD_LENGTH / 2 + i * 16 + 8);
        scene.add(dash);
    }
}
// Outer edges (solid white)
[-24, 24].forEach(x => createLaneDashes(x, 0xffffff));
// Inner lane dividers (dashed white)
[-16, -8, 8, 16].forEach(x => createLaneDashes(x, 0xdddddd));

// ─────────────────────────────────────────────
//  BUILDINGS along the road
// ─────────────────────────────────────────────
const buildingColors = [0x8b7355, 0x6b8e9f, 0x9c8770, 0x7a9a6a, 0xa89985, 0x5f7a8a, 0xb07050, 0x607080];
const buildings = [];

function createBuildings() {
    const spacing = 40;
    const count = Math.floor(ROAD_LENGTH / spacing);
    for (let i = 0; i < count; i++) {
        const z = -ROAD_LENGTH / 2 + i * spacing + spacing / 2;
        [-1, 1].forEach(side => {
            const w = 18 + Math.random() * 12;
            const h = 20 + Math.random() * 40;
            const d = 16 + Math.random() * 10;
            const xPos = side * (ROAD_WIDTH / 2 + 8 + w / 2 + 4);
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshStandardMaterial({
                map: buildTex,
                color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
            });
            const b = new THREE.Mesh(geo, mat);
            b.position.set(xPos, h / 2, z);
            b.castShadow = true;
            b.receiveShadow = true;
            scene.add(b);
            buildings.push(b);
        });
    }
}
createBuildings();

// Street lamps
function createLamp(x, z) {
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 8, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 4, z);
    scene.add(pole);

    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 6);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(x + (x > 0 ? -1.5 : 1.5), 8, z);
    scene.add(arm);

    const headGeo = new THREE.BoxGeometry(1.2, 0.4, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffee88, emissiveIntensity: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(x + (x > 0 ? -1.5 : 1.5), 8.3, z);
    scene.add(head);
}

for (let z = -ROAD_LENGTH / 2 + 20; z < ROAD_LENGTH / 2; z += 40) {
    createLamp(-26, z);
    createLamp(26, z);
}

// ─────────────────────────────────────────────
//  LANE PATHS (CatmullRomCurve3)
//  Lanes 0-2: forward direction (Z+ travel)
//  Lanes 3-5: reverse direction (Z- travel)
// ─────────────────────────────────────────────
function buildLanePath(xCenter, forward = true) {
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const z = forward
            ? -ROAD_LENGTH / 2 + t * ROAD_LENGTH
            : ROAD_LENGTH / 2 - t * ROAD_LENGTH;
        // Slight sinusoidal weave for realism
        const xWave = xCenter + Math.sin(t * Math.PI * 4) * 0.3;
        points.push(new THREE.Vector3(xWave, 0.5, z));
    }
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

// Forward lanes (player drives in these too)
const forwardLanes = [
    buildLanePath(LANE_CENTERS[0], true),
    buildLanePath(LANE_CENTERS[1], true),
    buildLanePath(LANE_CENTERS[2], true),
];
// Reverse lanes (oncoming traffic)
const reverseLanes = [
    buildLanePath(LANE_CENTERS[3], false),
    buildLanePath(LANE_CENTERS[4], false),
    buildLanePath(LANE_CENTERS[5], false),
];
const allLanes = [...forwardLanes, ...reverseLanes];

// ─────────────────────────────────────────────
//  DIFFICULTY CONFIG
// ─────────────────────────────────────────────
const DIFFICULTY = {
    easy: { maxNPCs: 15, speedMult: 0.7, label: 'LOW' },
    medium: { maxNPCs: 30, speedMult: 1.0, label: 'MEDIUM' },
    hard: { maxNPCs: 60, speedMult: 1.4, label: 'HIGH' },
};
let currentDifficulty = 'easy';

window.setDifficulty = function (level) {
    currentDifficulty = level;
    document.querySelectorAll('.diff-btn').forEach(b => {
        b.className = 'diff-btn';
    });
    document.getElementById('btn-' + level).classList.add('active-' + level);
    updateDensityLabel();
    // Adjust active NPC count
    adjustNPCCount();
};

function updateDensityLabel() {
    const cfg = DIFFICULTY[currentDifficulty];
    document.getElementById('density-val').textContent = cfg.label;
}

// ─────────────────────────────────────────────
//  NPC VEHICLE SYSTEM — Object Pooling
// ─────────────────────────────────────────────
const NPC_POOL_SIZE = 60;
const NPC_BASE_SPEED = 0.18; // units per frame
const NPC_SAFE_DIST = 18;   // minimum gap to car ahead
const NPC_DESPAWN_DIST = 350; // distance behind player to despawn

// NPC car colors (applied as tint to GLB body materials)
const npcColors = [
    0xff4444, 0x4488ff, 0x44cc44, 0xffaa00,
    0xcc44cc, 0x00cccc, 0xff8800, 0x8844ff,
    0xffffff, 0x222222, 0xaaaaaa, 0xff6688,
    0xff0066, 0x00ff99, 0xffdd00, 0x3399ff,
];

// GLB model paths to use for NPC cars
const NPC_MODEL_PATHS = [
    '/public/textures/car1.glb',
    '/public/textures/car2.glb',
    '/public/textures/car3.glb',
    '/public/textures/car.glb',
];

// Scale & Y-offset per model (tune so they sit on the road)
const NPC_MODEL_CONFIG = [
    { scale: 3.0, yOffset: 0 },   // car1
    { scale: 3.0, yOffset: 0 },   // car2
    { scale: 3.0, yOffset: 0 },   // car3
    { scale: 12, yOffset: 0 },   // car (player model — larger scale)
];

// Loaded GLB scenes (filled after async load)
const npcModelTemplates = [];
let npcModelsReady = false;

// NPC state object
function createNPCState() {
    return {
        mesh: null,
        active: false,
        laneIndex: 0,
        pathT: 0,
        speed: 0,
        targetSpeed: 0,
        isForward: true,
        overtaken: false,
        indicatorTimer: 0,
        laneChangeTimer: 0,
        emergencyBrake: false,
        emergencyTimer: 0,
        color: 0xffffff,
        boundingBox: new THREE.Box3(),
    };
}

// Fallback box-car (used while GLBs are loading or if load fails)
function buildFallbackNPCMesh(color) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(3.2, 1.4, 6.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);
    const cabinGeo = new THREE.BoxGeometry(2.6, 1.0, 3.5);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x222244, metalness: 0.2, roughness: 0.4 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 2.1, -0.3);
    group.add(cabin);
    return group;
}

// Clone a loaded GLB template and apply a color tint
function buildGLBNPCMesh(templateIndex, color) {
    const template = npcModelTemplates[templateIndex];
    const cfg = NPC_MODEL_CONFIG[templateIndex];
    const clone = template.clone(true);
    clone.scale.setScalar(cfg.scale);
    clone.position.y = cfg.yOffset;
    // Tint body meshes (skip glass/dark materials)
    clone.traverse(child => {
        if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                if (mat.color) {
                    // Only tint materials that look like body paint (not very dark or very emissive)
                    const lum = mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114;
                    if (lum > 0.15) {
                        mat = mat.clone();
                        mat.color.set(color);
                        mat.metalness = 0.5;
                        mat.roughness = 0.4;
                    }
                }
            });
            child.castShadow = true;
        }
    });
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
}

// Initialise pool — start with fallback boxes, swap to GLBs once loaded
const npcPool = [];
for (let i = 0; i < NPC_POOL_SIZE; i++) {
    const state = createNPCState();
    const color = npcColors[i % npcColors.length];
    state.color = color;
    state.modelIndex = i % NPC_MODEL_PATHS.length; // which GLB to use
    state.mesh = buildFallbackNPCMesh(color);
    state.mesh.visible = false;
    scene.add(state.mesh);
    npcPool.push(state);
}

// Async-load all NPC GLB models, then swap pool meshes
(async () => {
    const loader = new GLTFLoader();
    const loadModel = (path) => new Promise((resolve) => {
        loader.load(path, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
    });

    const results = await Promise.all(NPC_MODEL_PATHS.map(loadModel));
    results.forEach((modelScene, idx) => {
        npcModelTemplates[idx] = modelScene; // may be null if load failed
    });

    // Swap each pool slot to the real GLB mesh
    npcPool.forEach((state, i) => {
        const mi = state.modelIndex;
        if (!npcModelTemplates[mi]) return; // keep fallback
        const wasVisible = state.mesh.visible;
        const oldPos = state.mesh.position.clone();
        const oldRot = state.mesh.rotation.clone();
        scene.remove(state.mesh);
        state.mesh = buildGLBNPCMesh(mi, state.color);
        state.mesh.position.copy(oldPos);
        state.mesh.rotation.copy(oldRot);
        state.mesh.visible = wasVisible;
        scene.add(state.mesh);
    });
    npcModelsReady = true;
})();

function getInactiveNPC() {
    return npcPool.find(n => !n.active) || null;
}

function activeNPCCount() {
    return npcPool.filter(n => n.active).length;
}

// Spawn an NPC on a random lane ahead of player
function spawnNPC() {
    const cfg = DIFFICULTY[currentDifficulty];
    if (activeNPCCount() >= cfg.maxNPCs) return;

    const npc = getInactiveNPC();
    if (!npc) return;

    const laneIndex = Math.floor(Math.random() * allLanes.length);
    const isForward = laneIndex < 3;

    // Spawn ahead of player
    const spawnT = isForward
        ? Math.min(1, playerPathT + 0.05 + Math.random() * 0.25)
        : Math.max(0, playerPathT - 0.05 - Math.random() * 0.25);

    npc.active = true;
    npc.laneIndex = laneIndex;
    npc.isForward = isForward;
    npc.pathT = Math.max(0, Math.min(1, spawnT));
    npc.targetSpeed = (NPC_BASE_SPEED + Math.random() * 0.08) * cfg.speedMult;
    npc.speed = npc.targetSpeed * 0.5;
    npc.overtaken = false;
    npc.emergencyBrake = false;
    npc.emergencyTimer = 0;
    npc.laneChangeTimer = 60 + Math.floor(Math.random() * 300);
    npc.indicatorTimer = 0;

    npc.mesh.visible = true;

    // Place at correct position
    const pos = allLanes[laneIndex].getPoint(npc.pathT);
    npc.mesh.position.copy(pos);
}

function deactivateNPC(npc) {
    npc.active = false;
    npc.mesh.visible = false;
}

function adjustNPCCount() {
    const cfg = DIFFICULTY[currentDifficulty];
    // Deactivate excess
    let active = npcPool.filter(n => n.active);
    while (active.length > cfg.maxNPCs) {
        deactivateNPC(active.pop());
    }
}

// ─────────────────────────────────────────────
//  PLAYER CAR
// ─────────────────────────────────────────────
let playerCar = null;
let playerCarLoaded = false;
const playerGroup = new THREE.Group();
scene.add(playerGroup);

// Fallback player mesh while GLB loads
const fallbackBody = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.4, 6.5),
    new THREE.MeshStandardMaterial({ color: 0x2266ff, metalness: 0.5 })
);
fallbackBody.position.y = 0.9;
fallbackBody.castShadow = true;
playerGroup.add(fallbackBody);

const fallbackCabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.0, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x1133aa })
);
fallbackCabin.position.set(0, 2.1, -0.3);
playerGroup.add(fallbackCabin);

// Wheels
const pWheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 10);
const pWheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
[[-1.8, 0.55, 2.2], [1.8, 0.55, 2.2], [-1.8, 0.55, -2.2], [1.8, 0.55, -2.2]].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(pWheelGeo, pWheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    playerGroup.add(w);
});

playerGroup.position.set(LANE_CENTERS[1], 0, -ROAD_LENGTH / 2 + 30);

// Try to load GLB
const gltfLoader = new GLTFLoader();
gltfLoader.load('/public/textures/car.glb', (gltf) => {
    playerCar = gltf.scene;
    playerCar.scale.set(10, 10, 10);
    // Remove fallback
    while (playerGroup.children.length > 0) playerGroup.remove(playerGroup.children[0]);
    playerGroup.add(playerCar);
    playerCarLoaded = true;
}, undefined, () => {
    // GLB failed — keep fallback
    playerCarLoaded = true;
});

// Player physics
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
document.addEventListener('keyup', e => { keys[e.code] = false; });

let playerVelZ = 0;
let playerRotY = 0;
const PLAYER_ACCEL = 0.04;
const PLAYER_MAX_SPEED = 1.8;
const PLAYER_BRAKE = 0.85;
const PLAYER_FRICTION = 0.97;
const PLAYER_STEER = 0.028;

// Track player's approximate T along forward lane 1 (for spawn logic)
let playerPathT = 0;

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
let score = 0;
let health = 100;
let overtakeCount = 0;
let gameOver = false;
let collisionCooldown = 0;
let cameraShakeTimer = 0;
let cameraShakeIntensity = 0;
let scoreTimer = 0; // accumulates time for passive score

// ─────────────────────────────────────────────
//  HUD REFERENCES
// ─────────────────────────────────────────────
const scoreEl = document.getElementById('score-val');
const healthEl = document.getElementById('health-val');
const healthBar = document.getElementById('health-bar');
const speedEl = document.getElementById('speed-val');
const speedBar = document.getElementById('speed-bar');
const npcCountEl = document.getElementById('npc-count-val');
const overtakeEl = document.getElementById('overtake-val');
const crashFlash = document.getElementById('crash-flash');
const overtakeNotif = document.getElementById('overtake-notif');

function updateHUD() {
    scoreEl.textContent = score;
    healthEl.textContent = Math.max(0, Math.round(health));
    const hp = Math.max(0, health) / 100;
    healthBar.style.width = (hp * 100) + '%';
    healthBar.style.background = hp > 0.5
        ? 'linear-gradient(90deg, #00e676, #69f0ae)'
        : hp > 0.25
            ? 'linear-gradient(90deg, #ffab00, #ffd740)'
            : 'linear-gradient(90deg, #ff1744, #ff6090)';

    const kmh = Math.round(Math.abs(playerVelZ) * 120);
    speedEl.innerHTML = kmh + ' <span style="font-size:12px;color:rgba(255,255,255,0.5)">km/h</span>';
    speedBar.style.width = Math.min(100, (Math.abs(playerVelZ) / PLAYER_MAX_SPEED) * 100) + '%';

    npcCountEl.textContent = activeNPCCount();
    overtakeEl.textContent = overtakeCount;
}

// ─────────────────────────────────────────────
//  COLLISION & EFFECTS
// ─────────────────────────────────────────────
function triggerCrash(damage) {
    health = Math.max(0, health - damage);
    score = Math.max(0, score - 30);
    cameraShakeTimer = 25;
    cameraShakeIntensity = 0.4;

    // Flash red
    crashFlash.style.opacity = '1';
    setTimeout(() => { crashFlash.style.opacity = '0'; }, 200);

    if (health <= 0 && !gameOver) {
        gameOver = true;
        showGameOver();
    }
}

function showOvertakeBonus() {
    score += 50;
    overtakeCount++;
    overtakeNotif.style.opacity = '1';
    setTimeout(() => { overtakeNotif.style.opacity = '0'; }, 1200);
}

function showGameOver() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.85);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:9999;font-family:'Arial Black',sans-serif;color:#fff;
  `;
    overlay.innerHTML = `
    <div style="font-size:52px;font-weight:900;color:#ff1744;letter-spacing:6px;text-shadow:0 0 30px #ff1744;margin-bottom:16px;">GAME OVER</div>
    <div style="font-size:22px;color:rgba(255,255,255,0.7);margin-bottom:8px;">Final Score</div>
    <div style="font-size:64px;font-weight:900;color:#00e5ff;text-shadow:0 0 20px #00e5ff;margin-bottom:32px;">${score}</div>
    <div style="font-size:16px;color:rgba(255,255,255,0.5);margin-bottom:32px;">Overtakes: ${overtakeCount}</div>
    <div style="display:flex;gap:16px;">
      <button onclick="location.reload()" style="font-family:'Arial Black',sans-serif;font-size:14px;font-weight:900;letter-spacing:2px;padding:12px 28px;border-radius:24px;border:2px solid #00e5ff;background:rgba(0,229,255,0.15);color:#00e5ff;cursor:pointer;">PLAY AGAIN</button>
      <button onclick="location.href='index.html'" style="font-family:'Arial Black',sans-serif;font-size:14px;font-weight:900;letter-spacing:2px;padding:12px 28px;border-radius:24px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);cursor:pointer;">MAIN MENU</button>
    </div>
  `;
    document.body.appendChild(overlay);
}

// ─────────────────────────────────────────────
//  NPC AI UPDATE
// ─────────────────────────────────────────────
function updateNPCs(delta) {
    const cfg = DIFFICULTY[currentDifficulty];

    npcPool.forEach(npc => {
        if (!npc.active) return;

        const lane = allLanes[npc.laneIndex];
        const dir = npc.isForward ? 1 : -1;

        // ── Emergency braking events ──
        if (npc.emergencyTimer > 0) {
            npc.emergencyTimer--;
            npc.emergencyBrake = true;
        } else {
            npc.emergencyBrake = false;
            // Random emergency brake trigger (rare)
            if (Math.random() < 0.0003) {
                npc.emergencyTimer = 60 + Math.floor(Math.random() * 90);
            }
        }

        // ── Check car ahead (same lane) ──
        let carAheadDist = Infinity;
        npcPool.forEach(other => {
            if (!other.active || other === npc || other.laneIndex !== npc.laneIndex) return;
            const distAlong = (other.pathT - npc.pathT) * dir;
            if (distAlong > 0 && distAlong * ROAD_LENGTH < carAheadDist) {
                carAheadDist = distAlong * ROAD_LENGTH;
            }
        });

        // Also check player distance if same lane
        const playerLaneX = playerGroup.position.x;
        const closestLaneX = LANE_CENTERS[npc.laneIndex];
        if (Math.abs(playerLaneX - closestLaneX) < LANE_WIDTH * 0.6) {
            const playerZ = playerGroup.position.z;
            const npcZ = npc.mesh.position.z;
            const playerAhead = npc.isForward ? (playerZ - npcZ) : (npcZ - playerZ);
            if (playerAhead > 0 && playerAhead < carAheadDist) {
                carAheadDist = playerAhead;
            }
        }

        // ── Speed control ──
        if (npc.emergencyBrake) {
            npc.targetSpeed = 0;
        } else if (carAheadDist < NPC_SAFE_DIST) {
            // Slow down proportionally
            const factor = Math.max(0, (carAheadDist - 4) / NPC_SAFE_DIST);
            npc.targetSpeed = cfg.speedMult * NPC_BASE_SPEED * factor;
        } else {
            npc.targetSpeed = (NPC_BASE_SPEED + Math.random() * 0.005) * cfg.speedMult;
        }

        // Smooth acceleration / braking
        const accelRate = npc.speed < npc.targetSpeed ? 0.003 : 0.008;
        npc.speed += (npc.targetSpeed - npc.speed) * accelRate * 60 * delta;
        npc.speed = Math.max(0, npc.speed);

        // ── Random lane change ──
        npc.laneChangeTimer--;
        if (npc.laneChangeTimer <= 0 && carAheadDist < NPC_SAFE_DIST * 1.5 && Math.random() < 0.4) {
            const sameDir = npc.isForward ? [0, 1, 2] : [3, 4, 5];
            const candidates = sameDir.filter(i => i !== npc.laneIndex);
            if (candidates.length > 0) {
                npc.laneIndex = candidates[Math.floor(Math.random() * candidates.length)];
            }
            npc.laneChangeTimer = 120 + Math.floor(Math.random() * 240);
        }

        // ── Move along path ──
        const pathDelta = (npc.speed * delta * 60) / ROAD_LENGTH;
        npc.pathT += dir * pathDelta;

        // Wrap / despawn at path ends
        if (npc.pathT > 1 || npc.pathT < 0) {
            deactivateNPC(npc);
            return;
        }

        // Despawn if far behind player
        const npcPos = lane.getPoint(Math.max(0, Math.min(1, npc.pathT)));
        const distToPlayer = npcPos.distanceTo(playerGroup.position);
        if (distToPlayer > NPC_DESPAWN_DIST) {
            deactivateNPC(npc);
            return;
        }

        // ── Position & rotation ──
        const t0 = Math.max(0, Math.min(1, npc.pathT));
        const t1 = Math.max(0, Math.min(1, npc.pathT + dir * 0.002));
        const pos = lane.getPoint(t0);
        const ahead = lane.getPoint(t1);

        npc.mesh.position.copy(pos);
        npc.mesh.position.y = 0;

        const lookDir = new THREE.Vector3().subVectors(ahead, pos).normalize();
        if (lookDir.lengthSq() > 0.0001) {
            const angle = Math.atan2(lookDir.x, lookDir.z);
            npc.mesh.rotation.y = angle;
        }

        // (bounding box no longer used — collision uses distance check)
    });
}

// ─────────────────────────────────────────────
//  PLAYER UPDATE
// ─────────────────────────────────────────────
const COLLISION_DIST_X = 2.8;  // half-width threshold (lane width ~4)
const COLLISION_DIST_Z = 4.5;  // half-length threshold

function updatePlayer(delta) {
    if (gameOver) return;

    // Steering
    if (keys['ArrowLeft'] || keys['KeyA']) {
        playerGroup.rotation.y += PLAYER_STEER;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        playerGroup.rotation.y -= PLAYER_STEER;
    }

    // Acceleration
    if (keys['ArrowUp'] || keys['KeyW']) {
        playerVelZ += PLAYER_ACCEL;
    } else if (keys['ArrowDown'] || keys['KeyS']) {
        playerVelZ -= PLAYER_ACCEL * 0.7;
    }

    // Handbrake
    if (keys['Space']) {
        playerVelZ *= PLAYER_BRAKE;
    }

    // Clamp speed
    playerVelZ = Math.max(-PLAYER_MAX_SPEED * 0.5, Math.min(PLAYER_MAX_SPEED, playerVelZ));
    playerVelZ *= PLAYER_FRICTION;

    // Move
    playerGroup.translateZ(playerVelZ);

    // Keep on road (soft boundary)
    const px = playerGroup.position.x;
    if (Math.abs(px) > ROAD_WIDTH / 2 - 1) {
        playerGroup.position.x = Math.sign(px) * (ROAD_WIDTH / 2 - 1);
        playerVelZ *= 0.5;
        score = Math.max(0, score - 1); // penalty for leaving road
    }

    // Wrap Z position (infinite road illusion)
    const halfLen = ROAD_LENGTH / 2;
    if (playerGroup.position.z > halfLen - 20) {
        playerGroup.position.z -= ROAD_LENGTH - 40;
    } else if (playerGroup.position.z < -halfLen + 20) {
        playerGroup.position.z += ROAD_LENGTH - 40;
    }

    // Update approximate path T for spawn logic
    playerPathT = (playerGroup.position.z + halfLen) / ROAD_LENGTH;

    // Passive score: +1 per second while moving
    if (Math.abs(playerVelZ) > 0.05) {
        scoreTimer += delta;
        if (scoreTimer >= 1) {
            score += 1;
            scoreTimer -= 1;
        }
    }

    // ── Collision detection with NPCs (distance-based, no Box3) ──
    if (collisionCooldown > 0) {
        collisionCooldown -= delta;
    }

    npcPool.forEach(npc => {
        if (!npc.active) return;
        const nx = npc.mesh.position.x;
        const nz = npc.mesh.position.z;
        const dx = Math.abs(playerGroup.position.x - nx);
        const dz = Math.abs(playerGroup.position.z - nz);
        if (dx < COLLISION_DIST_X && dz < COLLISION_DIST_Z) {
            if (collisionCooldown <= 0) {
                const impactSpeed = Math.abs(playerVelZ);
                const damage = 5 + impactSpeed * 25;
                triggerCrash(damage);
                collisionCooldown = 1.5;

                // Bounce player back
                playerVelZ *= -0.4;

                // Push NPC slightly
                const pushDir = npc.isForward ? -0.01 : 0.01;
                npc.pathT += pushDir;
            }
        }
    });

    // ── Overtake detection ──
    npcPool.forEach(npc => {
        if (!npc.active || npc.overtaken || !npc.isForward) return;
        // Player has passed this NPC if player Z > NPC Z and NPC is in a forward lane
        const npcZ = npc.mesh.position.z;
        const playerZ = playerGroup.position.z;
        if (playerZ > npcZ + 8 && !npc.overtaken) {
            npc.overtaken = true;
            showOvertakeBonus();
        }
    });
}

// ─────────────────────────────────────────────
//  CAMERA
// ─────────────────────────────────────────────
const cameraOffset = new THREE.Vector3(0, 8, -18);
const cameraTarget = new THREE.Vector3();

function updateCamera() {
    // Follow player with smooth lerp
    const desiredPos = cameraOffset.clone().applyQuaternion(playerGroup.quaternion).add(playerGroup.position);

    // Camera shake
    if (cameraShakeTimer > 0) {
        const shake = cameraShakeIntensity * (cameraShakeTimer / 25);
        desiredPos.x += (Math.random() - 0.5) * shake;
        desiredPos.y += (Math.random() - 0.5) * shake * 0.5;
        cameraShakeTimer--;
        cameraShakeIntensity *= 0.92;
    }

    camera.position.lerp(desiredPos, 0.12);
    cameraTarget.copy(playerGroup.position).add(new THREE.Vector3(0, 2, 0));
    camera.lookAt(cameraTarget);
}

// ─────────────────────────────────────────────
//  SPAWN MANAGER
// ─────────────────────────────────────────────
let spawnTimer = 0;
const SPAWN_INTERVAL = 1.0; // seconds between spawn attempts

function updateSpawner(delta) {
    spawnTimer += delta;
    if (spawnTimer >= SPAWN_INTERVAL) {
        spawnTimer = 0;
        const cfg = DIFFICULTY[currentDifficulty];
        // Try to spawn until we hit the limit
        const needed = cfg.maxNPCs - activeNPCCount();
        for (let i = 0; i < Math.min(needed, 2); i++) {
            spawnNPC();
        }
    }
}

// ─────────────────────────────────────────────
//  INIT SPAWNS
// ─────────────────────────────────────────────
updateDensityLabel();
// Pre-spawn some NPCs
for (let i = 0; i < 5; i++) spawnNPC();

// ─────────────────────────────────────────────
//  ANIMATION LOOP
// ─────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05); // cap at 50ms

    updatePlayer(delta);
    updateNPCs(delta);
    updateSpawner(delta);
    updateCamera();
    updateHUD();

    renderer.render(scene, camera);
}

animate();
