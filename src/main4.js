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
const roadTex = loadTex('/public/textures/road.jpg', 1, 40);
const grassTex = loadTex('/public/textures/grass.jpg', 40, 40);
const paveTex = loadTex('/public/textures/pavement.jpg', 1, 40);
const buildTex = loadTex('/public/textures/building8.jpg', 1, 2);

// ─────────────────────────────────────────────
//  ROAD  (4 lanes, width 16, length 600)
// ─────────────────────────────────────────────
const ROAD_LEN = 600;
const ROAD_W = 16;
const LANE_CX = [-6, -2, 2, 6];
const PLAYER_START_X = LANE_CX[1];

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(300, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: grassTex })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Road surface
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
[-8, 8].forEach(x => makeDashes(x, 0xffffff));
[-4, 4].forEach(x => makeDashes(x, 0xdddddd));

// ─────────────────────────────────────────────
//  BUILDINGS & LAMPS
// ─────────────────────────────────────────────
const bColors = [0x8b7355, 0x6b8e9f, 0x9c8770, 0x7a9a6a, 0xa89985, 0x5f7a8a];
for (let z = -ROAD_LEN / 2 + 20; z < ROAD_LEN / 2; z += 35) {
    [-1, 1].forEach(side => {
        const w = 14 + Math.random() * 10, h = 15 + Math.random() * 35, d = 12 + Math.random() * 8;
        const b = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshStandardMaterial({ map: buildTex, color: bColors[Math.floor(Math.random() * bColors.length)] })
        );
        b.position.set(side * (ROAD_W / 2 + 6 + w / 2), h / 2, z);
        b.castShadow = true;
        scene.add(b);
    });
}
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
//  TEST ZONE GEOMETRY
// ─────────────────────────────────────────────

// Helper: flat colored box on road surface
function makeZonePlane(w, d, color, x, z, opacity = 0.55) {
    const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.06, d),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    );
    m.position.set(x, 0.08, z);
    scene.add(m);
    return m;
}

// Helper: text label as billboard sprite (canvas texture)
function makeLabel(text, x, y, z, color = '#ffffff', size = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 90);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(8, 2, 1);
    sprite.position.set(x, y, z);
    scene.add(sprite);
    return sprite;
}

// ── STAGE 1: Stop Zone at z = -200 ──
const STOP_ZONE_Z = -200;
const STOP_ZONE_W = ROAD_W / 2; // forward lanes only
const STOP_ZONE_D = 8;
const stopZoneMesh = makeZonePlane(STOP_ZONE_W, STOP_ZONE_D, 0xffff00, -ROAD_W / 4, STOP_ZONE_Z);
// Stop line (white stripe)
const stopLine = new THREE.Mesh(
    new THREE.BoxGeometry(ROAD_W / 2, 0.08, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
stopLine.position.set(-ROAD_W / 4, 0.06, STOP_ZONE_Z - STOP_ZONE_D / 2);
scene.add(stopLine);
makeLabel('STOP LINE', -ROAD_W / 4, 2.5, STOP_ZONE_Z - STOP_ZONE_D / 2 - 2, '#ffff00', 56);

// ── STAGE 2: Parallel Parking Box at z = -80 ──
const PARK_P_Z = -80;
const PARK_P_X = -5;      // left side of road
const PARK_P_W = 5;
const PARK_P_D = 12;
makeZonePlane(PARK_P_W, PARK_P_D, 0x00ccff, PARK_P_X, PARK_P_Z, 0.45);
// Boundary pylons
function makePylon(x, z) {
    const pylon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff2200, emissiveIntensity: 0.4 })
    );
    pylon.position.set(x, 0.6, z);
    scene.add(pylon);
    return pylon;
}
const pylonsP = [
    makePylon(PARK_P_X - PARK_P_W / 2, PARK_P_Z - PARK_P_D / 2),
    makePylon(PARK_P_X + PARK_P_W / 2, PARK_P_Z - PARK_P_D / 2),
    makePylon(PARK_P_X - PARK_P_W / 2, PARK_P_Z + PARK_P_D / 2),
    makePylon(PARK_P_X + PARK_P_W / 2, PARK_P_Z + PARK_P_D / 2),
];
makeLabel('PARALLEL PARK', PARK_P_X, 3.0, PARK_P_Z, '#00ccff', 48);

// ── STAGE 3: Reverse Parking Box at z = 30 ──
const PARK_R_Z = 30;
const PARK_R_X = 5;
const PARK_R_W = 5;
const PARK_R_D = 11;
makeZonePlane(PARK_R_W, PARK_R_D, 0xff44aa, PARK_R_X, PARK_R_Z, 0.45);
// Arrow pointing backward
const arrowGeo = new THREE.ConeGeometry(0.5, 1.5, 6);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff44aa });
const arrow = new THREE.Mesh(arrowGeo, arrowMat);
arrow.rotation.x = Math.PI;          // point down (toward road)
arrow.position.set(PARK_R_X, 1.5, PARK_R_Z);
scene.add(arrow);
const pylonsR = [
    makePylon(PARK_R_X - PARK_R_W / 2, PARK_R_Z - PARK_R_D / 2),
    makePylon(PARK_R_X + PARK_R_W / 2, PARK_R_Z - PARK_R_D / 2),
    makePylon(PARK_R_X - PARK_R_W / 2, PARK_R_Z + PARK_R_D / 2),
    makePylon(PARK_R_X + PARK_R_W / 2, PARK_R_Z + PARK_R_D / 2),
];
makeLabel('REVERSE PARK', PARK_R_X, 3.0, PARK_R_Z, '#ff44aa', 48);

// ── STAGE 4: Three-Point Turn Zone at z = 160 ──
const TPT_Z = 160;
const TPT_W = ROAD_W;      // full road width
const TPT_D = 26;
makeZonePlane(TPT_W, TPT_D, 0x33ff66, 0, TPT_Z, 0.30);
// Dead-end walls (visual only)
[-TPT_D / 2, TPT_D / 2].forEach(zOff => {
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(TPT_W + 2, 1.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    wall.position.set(0, 0.75, TPT_Z + zOff);
    scene.add(wall);
});
makeLabel('3-POINT TURN ZONE', 0, 3.5, TPT_Z, '#33ff66', 44);

// ── SPEED ZONE SIGN at z = 0 ──
function makeSpeedSign(x, z, limit) {
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 5, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    pole.position.set(x, 2.5, z);
    scene.add(pole);

    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'center';
    ctx.fillText(String(limit), 64, 78);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true })
    );
    sign.position.set(x, 5.5, z);
    scene.add(sign);
}
makeSpeedSign(-9, -250, 40);
makeSpeedSign(-9, 0, 40);
makeSpeedSign(-9, 200, 40);

// ─────────────────────────────────────────────
//  TRAFFIC SIGNAL (at z = 270 near end)
// ─────────────────────────────────────────────
const SIG_Z = 270;
const sigGroup = new THREE.Group();
const sigPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 })
);
sigPole.position.y = 3;
sigGroup.add(sigPole);
const sigHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 2.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
);
sigHousing.position.set(0, 6.5, 0);
sigGroup.add(sigHousing);
const sigLightGeo = new THREE.SphereGeometry(0.22, 8, 8);
const sigR = new THREE.Mesh(sigLightGeo, new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.5 }));
sigR.position.set(0, 7.4, 0.26);
const sigY = new THREE.Mesh(sigLightGeo, new THREE.MeshStandardMaterial({ color: 0x555500, emissive: 0x000000, emissiveIntensity: 0 }));
sigY.position.set(0, 6.5, 0.26);
const sigG = new THREE.Mesh(sigLightGeo, new THREE.MeshStandardMaterial({ color: 0x005500, emissive: 0x000000, emissiveIntensity: 0 }));
sigG.position.set(0, 5.6, 0.26);
sigGroup.add(sigR, sigY, sigG);
sigGroup.position.set(ROAD_W / 2 + 0.5, 0, SIG_Z);
sigGroup.rotation.y = Math.PI;
scene.add(sigGroup);

// Stop line for signal
const sigStopLine = new THREE.Mesh(
    new THREE.BoxGeometry(ROAD_W / 2, 0.08, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
);
sigStopLine.position.set(-ROAD_W / 4, 0.06, SIG_Z - 2);
scene.add(sigStopLine);

// Signal state
const signal = { phase: 'red', timer: 8 };
function setSignalPhase(phase) {
    signal.phase = phase;
    sigR.material.emissive.set(phase === 'red' ? 0xff1744 : 0x000000);
    sigR.material.emissiveIntensity = phase === 'red' ? 1.5 : 0;
    sigY.material.emissive.set(phase === 'yellow' ? 0xffab00 : 0x000000);
    sigY.material.emissiveIntensity = phase === 'yellow' ? 1.5 : 0;
    sigG.material.emissive.set(phase === 'green' ? 0x00e676 : 0x000000);
    sigG.material.emissiveIntensity = phase === 'green' ? 1.5 : 0;
}
function updateSignal(delta) {
    signal.timer -= delta;
    if (signal.timer <= 0) {
        if (signal.phase === 'red') { setSignalPhase('green'); signal.timer = 10; }
        else if (signal.phase === 'green') { setSignalPhase('yellow'); signal.timer = 2; }
        else if (signal.phase === 'yellow') { setSignalPhase('red'); signal.timer = 8; }
    }
}

// ─────────────────────────────────────────────
//  PEDESTRIAN CROSSING (z = 240)
// ─────────────────────────────────────────────
const PED_Z = 240;
for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_W, 0.06, 0.6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    stripe.position.set(0, 0.04, PED_Z + i * 1.0);
    scene.add(stripe);
}
const pedCrossing = { active: false, timer: 15, pedestrians: [] };
function makePedestrian(z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.0, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xff6b6b })
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
//  PLAYER CAR
// ─────────────────────────────────────────────
const playerGroup = new THREE.Group();
scene.add(playerGroup);

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
[[-1.8, 0.55, 2.2], [1.8, 0.55, 2.2], [-1.8, 0.55, -2.2], [1.8, 0.55, -2.2]].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    playerGroup.add(w);
});

playerGroup.position.set(PLAYER_START_X, 0, -ROAD_LEN / 2 + 30);

const gltfLoader = new GLTFLoader();
gltfLoader.load('/public/textures/car.glb', gltf => {
    const car = gltf.scene;
    car.scale.set(10, 10, 10);
    while (playerGroup.children.length) playerGroup.remove(playerGroup.children[0]);
    playerGroup.add(car);
}, undefined, () => { });

// ─────────────────────────────────────────────
//  CONTROLS & INDICATORS
// ─────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) e.preventDefault();
    // Toggle indicators
    if (e.code === 'KeyQ') {
        leftIndicator = !leftIndicator;
        rightIndicator = false;
        if (leftIndicator) indicatorOnTime = clock.getElapsedTime();
    }
    if (e.code === 'KeyE') {
        rightIndicator = !rightIndicator;
        leftIndicator = false;
        if (rightIndicator) indicatorOnTime = clock.getElapsedTime();
    }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

let velZ = 0;
const ACCEL = 0.035;
const MAX_SPD = 1.6;
const BRAKE = 0.84;
const FRIC = 0.972;
const STEER = 0.026;

// Indicator state
let leftIndicator = false;
let rightIndicator = false;
let indicatorOnTime = 0;     // elapsed time when indicator was turned on
let indicatorBlink = 0;      // blink timer
let indBlinkState = false;

// ─────────────────────────────────────────────
//  BOUNDING BOX for player (approx)
// ─────────────────────────────────────────────
const CAR_HALF_W = 1.8;
const CAR_HALF_L = 3.4;

function getPlayerBounds() {
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;
    return {
        minX: px - CAR_HALF_W,
        maxX: px + CAR_HALF_W,
        minZ: pz - CAR_HALF_L,
        maxZ: pz + CAR_HALF_L,
    };
}

function isInsideBox(bounds, cx, cz, hw, hd) {
    return bounds.minX >= cx - hw && bounds.maxX <= cx + hw &&
        bounds.minZ >= cz - hd && bounds.maxZ <= cz + hd;
}

// ─────────────────────────────────────────────
//  GAME / TEST STATE
// ─────────────────────────────────────────────
let score = 100;
let violations = 0;
let testOver = false;
const violLog = [];

// Stage state machine
const STAGES = ['startStop', 'parallelParking', 'reverseParking', 'threePointTurn', 'done'];
const STAGE_NAMES = [
    '1 / 5 – START-STOP TEST',
    '2 / 5 – PARALLEL PARKING',
    '3 / 5 – REVERSE PARKING',
    '4 / 5 – THREE-POINT TURN',
    '5 / 5 – SIGNAL & RULES'
];
let stageIndex = 0;
let stageComplete = [false, false, false, false, false];

// Stage-specific trackers
let stopStatTimer = 0;      // Stage 1 stationary timer
let stopHasEntered = false;

let parkingComplete = false;  // Stage 2
let parkingTimer = 0;

let reverseParkDone = false;  // Stage 3
let hasUsedReverse = false;

let tptDirChanges = 0;      // Stage 4 direction changes
let tptLastDir = 0;      // 1=forward -1=reverse 0=still
let tptComplete = false;

// Signal stage persistent
let signalViolCooldown = 0;

// Continuous enforcement timers
let overspeedTimer = 0;
let redViolCooldown = 0;
let pedViolCooldown = 0;
let sidewalkCooldown = 0;
let warningTimer = 0;
let cameraShake = 0;

const cameraOffset = new THREE.Vector3(0, 8, -18);
const camTarget = new THREE.Vector3();
const clock = new THREE.Clock();

// ─────────────────────────────────────────────
//  HUD REFS
// ─────────────────────────────────────────────
const stageBannerEl = document.getElementById('stage-banner');
const stageInstrEl = document.getElementById('stage-instruction');
const speedEl = document.getElementById('speed-val');
const speedBar = document.getElementById('speed-bar');
const scoreEl = document.getElementById('score-val');
const scoreBar = document.getElementById('score-bar');
const violEl = document.getElementById('viol-val');
const stageTimerEl = document.getElementById('stage-timer-val');
const warnMsg = document.getElementById('warning-msg');
const warnFlash = document.getElementById('warning-flash');
const critFlash = document.getElementById('critical-flash');
const indLeft = document.getElementById('ind-left');
const indRight = document.getElementById('ind-right');
const indLabel = document.getElementById('ind-label');

const STAGE_INSTRUCTIONS = [
    'Drive to the YELLOW STOP ZONE and brake to a FULL STOP (hold 3 s)',
    'Park inside the BLUE BOX — align within ±10° and stop (Q/E = signals)',
    'REVERSE into the PINK BOX — use S key to go backward',
    'Perform a 3-POINT TURN inside the GREEN ZONE (3 direction changes)',
    'Follow TRAFFIC RULES to the end — obey signals, stay in lane, use signals when turning'
];

// ─────────────────────────────────────────────
//  HELPER: show warning / violation
// ─────────────────────────────────────────────
function showWarning(msg, isCritical = false) {
    warnMsg.textContent = msg;
    warnMsg.style.color = isCritical ? '#ff1744' : '#ffab00';
    warnMsg.style.opacity = '1';
    if (isCritical) {
        critFlash.style.opacity = '1';
        setTimeout(() => { critFlash.style.opacity = '0'; }, 300);
    } else {
        warnFlash.style.opacity = '1';
        setTimeout(() => { warnFlash.style.opacity = '0'; }, 300);
    }
    warningTimer = 2.5;
}

function addViolation(msg, pts = 5, isMajor = false) {
    violations++;
    score = Math.max(0, score - pts);
    violLog.push({ time: clock.getElapsedTime().toFixed(1), msg, pts });
    showWarning(msg, isMajor);
    cameraShake = 20;
    if (isMajor && !testOver) {
        failTest(msg);
    }
}

// ─────────────────────────────────────────────
//  TEST PASS / FAIL OVERLAYS
// ─────────────────────────────────────────────
function failTest(reason) {
    testOver = true;
    logMetrics('FAILED');
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.90);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;font-family:'Arial Black',sans-serif;color:#fff;`;
    ov.innerHTML = `
      <div style="font-size:44px;font-weight:900;color:#ff1744;letter-spacing:5px;text-shadow:0 0 30px #ff1744;margin-bottom:10px;">🚫 DRIVING TEST FAILED</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.65);margin-bottom:4px;">${reason}</div>
      <div style="font-size:46px;font-weight:900;color:#00e5ff;text-shadow:0 0 20px #00e5ff;margin-bottom:6px;">${Math.max(0, Math.round(score))}<span style="font-size:18px;color:rgba(0,229,255,0.6)"> pts</span></div>
      <div style="font-size:12px;color:rgba(255,255,255,0.40);margin-bottom:26px;">Violations: ${violations}</div>
      <div style="display:flex;gap:14px;">
        <button onclick="location.reload()" style="font-family:'Arial Black',sans-serif;font-size:12px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid #ff1744;background:rgba(255,23,68,0.15);color:#ff1744;cursor:pointer;">RETRY TEST</button>
        <button onclick="location.href='index.html'" style="font-family:'Arial Black',sans-serif;font-size:12px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);cursor:pointer;">MAIN MENU</button>
      </div>`;
    document.body.appendChild(ov);
}

function passTest() {
    testOver = true;
    score = Math.min(100, score + 10); // completion bonus
    logMetrics('PASSED');
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.88);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        z-index:9999;font-family:'Arial Black',sans-serif;color:#fff;`;
    ov.innerHTML = `
      <div style="font-size:44px;font-weight:900;color:#00e676;letter-spacing:5px;text-shadow:0 0 30px #00e676;margin-bottom:10px;">✅ DRIVING TEST PASSED!</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.65);margin-bottom:4px;">Congratulations — License Granted!</div>
      <div style="font-size:46px;font-weight:900;color:#00e5ff;text-shadow:0 0 20px #00e5ff;margin-bottom:6px;">${Math.round(score)}<span style="font-size:18px;color:rgba(0,229,255,0.6)"> / 100</span></div>
      <div style="font-size:12px;color:rgba(255,255,255,0.40);margin-bottom:26px;">Violations: ${violations} | Grade: ${score >= 90 ? 'A' : score >= 80 ? 'B' : 'C'}</div>
      <div style="display:flex;gap:14px;">
        <button onclick="location.reload()" style="font-family:'Arial Black',sans-serif;font-size:12px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid #00e676;background:rgba(0,230,118,0.15);color:#00e676;cursor:pointer;">RETAKE TEST</button>
        <button onclick="location.href='index.html'" style="font-family:'Arial Black',sans-serif;font-size:12px;font-weight:900;letter-spacing:2px;padding:12px 26px;border-radius:24px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);cursor:pointer;">MAIN MENU</button>
      </div>`;
    document.body.appendChild(ov);
}

function logMetrics(result) {
    console.log('=== DRIVING TEST METRICS ===');
    console.log('Result:', result);
    console.log('Score:', Math.round(score), '/ 100');
    console.log('Violations:', violations);
    console.log('Elapsed Time:', clock.getElapsedTime().toFixed(1), 's');
    console.log('Violation Log:', violLog);
    console.log('Stage Completion:', stageComplete);
    console.log('Assessment: Automated driver assessment via deterministic rule validation engine');
}

// ─────────────────────────────────────────────
//  STAGE PROGRESSION
// ─────────────────────────────────────────────
function advanceStage() {
    stageComplete[stageIndex] = true;
    // Update progress bar
    const stepEl = document.getElementById('step-' + stageIndex);
    if (stepEl) stepEl.classList.replace('active', 'done');
    stageIndex++;
    if (stageIndex >= 5) { passTest(); return; }
    const nextEl = document.getElementById('step-' + stageIndex);
    if (nextEl) nextEl.classList.add('active');
    stageBannerEl.textContent = '🧪 STAGE ' + STAGE_NAMES[stageIndex];
    stageInstrEl.textContent = STAGE_INSTRUCTIONS[stageIndex];
    showWarning('✅ Stage Complete! Next: ' + STAGE_NAMES[stageIndex]);
}

// ─────────────────────────────────────────────
//  STAGE VALIDATION FUNCTIONS
// ─────────────────────────────────────────────
function checkStage1_StartStop(delta, kmh, px, pz) {
    // Player must enter stop zone and stop fully for 3 s
    const inZone = pz >= STOP_ZONE_Z - STOP_ZONE_D / 2 && pz <= STOP_ZONE_Z + STOP_ZONE_D / 2;
    if (!stopHasEntered && inZone) stopHasEntered = true;

    // Overshoot: passed the stop zone center without stopping
    if (stopHasEntered && pz > STOP_ZONE_Z + STOP_ZONE_D / 2 + 2 && kmh > 3) {
        addViolation('⚠️ ROLLING STOP — Did not stop before line!', 5);
        stopHasEntered = false;
    }

    if (stopHasEntered && inZone) {
        if (kmh < 1.0) {
            stopStatTimer += delta;
            stageTimerEl.textContent = (3 - Math.min(3, stopStatTimer)).toFixed(1) + 's';
            if (stopStatTimer >= 3.0) {
                stageTimerEl.textContent = '—';
                advanceStage();
            }
        } else {
            stopStatTimer = 0;
        }
    }
}

function checkStage2_ParallelParking(delta, kmh) {
    // Player must be inside PARK_P box with alignment and speed=0
    const bounds = getPlayerBounds();
    const inside = isInsideBox(bounds, PARK_P_X, PARK_P_Z, PARK_P_W / 2, PARK_P_D / 2);

    // Rotation alignment (car should face roughly same as road → ~0 or ~π)
    const rotY = ((playerGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const devDeg = Math.min(rotY, Math.PI * 2 - rotY) * (180 / Math.PI);
    const aligned = devDeg <= 10;

    // Pylon collision check (hit boundary?)
    for (const pylon of pylonsP) {
        const dx = Math.abs(playerGroup.position.x - pylon.position.x);
        const dz = Math.abs(playerGroup.position.z - pylon.position.z);
        if (dx < 1.6 && dz < 1.6) {
            addViolation('🚧 PYLON HIT! Stay inside markers', 5);
        }
    }

    if (inside && kmh < 0.5 && aligned) {
        parkingTimer += delta;
        stageTimerEl.textContent = (2 - Math.min(2, parkingTimer)).toFixed(1) + 's';
        if (parkingTimer >= 2.0) {
            stageTimerEl.textContent = '—';
            advanceStage();
        }
    } else {
        parkingTimer = 0;
    }

    if (inside && kmh < 0.5 && !aligned) {
        showWarning('⚠️ Alignment off — straighten the car');
    }
}

function checkStage3_ReverseParking(delta, kmh) {
    // Detect reverse usage
    if (velZ < -0.05) hasUsedReverse = true;

    const bounds = getPlayerBounds();
    const inside = isInsideBox(bounds, PARK_R_X, PARK_R_Z, PARK_R_W / 2, PARK_R_D / 2);

    for (const pylon of pylonsR) {
        const dx = Math.abs(playerGroup.position.x - pylon.position.x);
        const dz = Math.abs(playerGroup.position.z - pylon.position.z);
        if (dx < 1.6 && dz < 1.6) {
            addViolation('🚧 PYLON HIT during reverse!', 5);
        }
    }

    if (inside && kmh < 0.5 && hasUsedReverse) {
        parkingTimer += delta;
        stageTimerEl.textContent = (2 - Math.min(2, parkingTimer)).toFixed(1) + 's';
        if (parkingTimer >= 2.0) {
            stageTimerEl.textContent = '—';
            advanceStage();
        }
    } else if (inside && kmh < 0.5 && !hasUsedReverse) {
        showWarning('⚠️ Must reverse INTO the slot (use S)');
    } else {
        parkingTimer = 0;
    }
}

function checkStage4_ThreePointTurn(delta, kmh, pz) {
    const inZone = pz >= TPT_Z - TPT_D / 2 && pz <= TPT_Z + TPT_D / 2;
    if (!inZone) return;

    // Count direction reversals
    const curDir = velZ > 0.05 ? 1 : velZ < -0.05 ? -1 : 0;
    if (curDir !== 0 && curDir !== tptLastDir) {
        tptDirChanges++;
        tptLastDir = curDir;
    }

    // Boundary check
    const px = playerGroup.position.x;
    if (Math.abs(px) > ROAD_W / 2 + 0.5) {
        addViolation('⚠️ LEFT ZONE BOUNDARY during 3-point turn!', 5);
    }

    stageTimerEl.textContent = 'Moves: ' + tptDirChanges;

    if (tptDirChanges >= 3 && kmh < 1) {
        tptComplete = true;
        stageTimerEl.textContent = '—';
        advanceStage();
    }
}

function checkStageSignalAndRules(delta, kmh, px, pz) {
    // ── Signal usage before turns ──
    const isTurningLeft = (keys['ArrowLeft'] || keys['KeyA']);
    const isTurningRight = (keys['ArrowRight'] || keys['KeyD']);
    const elapsed = clock.getElapsedTime();

    if (signalViolCooldown > 0) signalViolCooldown -= delta;

    if (isTurningLeft && !leftIndicator && kmh > 5 && signalViolCooldown <= 0) {
        addViolation('🔁 Left turn without LEFT SIGNAL (Q)!', 5);
        signalViolCooldown = 4;
    }
    if (isTurningRight && !rightIndicator && kmh > 5 && signalViolCooldown <= 0) {
        addViolation('🔁 Right turn without RIGHT SIGNAL (E)!', 5);
        signalViolCooldown = 4;
    }
    // Signal too late check (indicator on for < 2s before turning)
    if ((isTurningLeft && leftIndicator) || (isTurningRight && rightIndicator)) {
        const signalDuration = elapsed - indicatorOnTime;
        if (signalDuration < 2.0 && signalViolCooldown <= 0) {
            addViolation('⏱️ Signal too late! Use signal 2s before turning', 5);
            signalViolCooldown = 4;
        }
    }

    // ── Speed limit ──
    if (kmh > 40) {
        overspeedTimer += delta;
        if (overspeedTimer >= 3) {
            addViolation('⚡ OVERSPEED! ' + Math.round(kmh) + ' km/h in 40 zone', 10, true);
            overspeedTimer = 0;
        }
    } else {
        overspeedTimer = 0;
    }

    // ── Red light ──
    if (redViolCooldown > 0) redViolCooldown -= delta;
    if (signal.phase === 'red') {
        const stopZ = SIG_Z - 2;
        if (pz > stopZ && pz < stopZ + 8 && velZ > 0.05 && redViolCooldown <= 0) {
            addViolation('🚨 RED LIGHT VIOLATION!', 20, true);
            redViolCooldown = 6;
        }
    }

    // ── Sidewalk / road boundary ──
    if (sidewalkCooldown > 0) sidewalkCooldown -= delta;
    if (Math.abs(px) > ROAD_W / 2 + 0.5 && sidewalkCooldown <= 0) {
        addViolation('🛣️ SIDEWALK VIOLATION!', 15, true);
        sidewalkCooldown = 4;
    }

    // ── Wrong direction ──
    if (px > 0.5 && velZ > 0.05 && sidewalkCooldown <= 0) {
        showWarning('⚠️ Wrong side of road!');
    }

    // ── Pedestrian priority ──
    if (pedViolCooldown > 0) pedViolCooldown -= delta;
    if (pedCrossing.active && Math.abs(pz - PED_Z) < 5 && kmh > 5 && pedViolCooldown <= 0) {
        addViolation('🚶 PEDESTRIAN CROSSING VIOLATION!', 15, true);
        pedViolCooldown = 5;
    }

    // ── Route end (past signal + crossing) ──
    if (pz > ROAD_LEN / 2 - 20 && !testOver) {
        if (score >= 80) passTest();
        else failTest('Score too low to pass (' + Math.round(score) + '/100)');
    }
}

// ─────────────────────────────────────────────
//  UPDATE PEDESTRIANS  
// ─────────────────────────────────────────────
function updatePedestrians(delta) {
    pedCrossing.timer -= delta;
    if (pedCrossing.timer <= 0) {
        pedCrossing.active = !pedCrossing.active;
        pedCrossing.timer = pedCrossing.active ? 8 : 14;
        if (pedCrossing.active) {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const ped = makePedestrian(PED_Z + i * 0.9);
                pedCrossing.pedestrians.push({ mesh: ped, speed: 0.025, done: false });
            }
        } else {
            pedCrossing.pedestrians.forEach(p => scene.remove(p.mesh));
            pedCrossing.pedestrians = [];
        }
    }
    pedCrossing.pedestrians.forEach(p => {
        if (!p.done) {
            p.mesh.position.x += p.speed;
            if (p.mesh.position.x > ROAD_W / 2 + 1) p.done = true;
        }
    });
}

// ─────────────────────────────────────────────
//  UPDATE HUD
// ─────────────────────────────────────────────
function updateHUD(kmh) {
    // Speed
    speedEl.innerHTML = Math.round(kmh) + ' <span style="font-size:11px;color:rgba(255,255,255,0.45)">km/h</span>';
    const spPct = Math.min(100, (kmh / 80) * 100);
    speedBar.style.width = spPct + '%';
    speedBar.style.background = kmh > 40
        ? 'linear-gradient(90deg,#ff1744,#ff6090)'
        : 'linear-gradient(90deg,#00b0ff,#00e5ff)';

    // Score
    scoreEl.textContent = Math.max(0, Math.round(score));
    const scPct = Math.max(0, score);
    scoreBar.style.width = scPct + '%';
    scoreBar.style.background = score >= 80
        ? 'linear-gradient(90deg,#00e676,#69f0ae)'
        : score >= 60
            ? 'linear-gradient(90deg,#ffab00,#ffd740)'
            : 'linear-gradient(90deg,#ff1744,#ff6090)';

    // Violations
    violEl.textContent = violations;
    violEl.style.color = violations >= 3 ? '#ff1744' : '#ff5252';

    // Indicators (blink)
    indicatorBlink += 0.016;
    if (leftIndicator || rightIndicator) {
        indBlinkState = Math.sin(indicatorBlink * 6) > 0;
    } else {
        indBlinkState = false;
        indicatorBlink = 0;
    }
    indLeft.className = 'ind-light' + (leftIndicator && indBlinkState ? ' active-left' : '');
    indRight.className = 'ind-light' + (rightIndicator && indBlinkState ? ' active-right' : '');
    indLabel.textContent = leftIndicator ? 'LEFT ◀' : rightIndicator ? 'RIGHT ▶' : 'OFF';
}

// ─────────────────────────────────────────────
//  CAMERA
// ─────────────────────────────────────────────
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
//  MAIN LOOP
// ─────────────────────────────────────────────

// Set initial stage banner
stageBannerEl.textContent = '🧪 STAGE ' + STAGE_NAMES[0];
stageInstrEl.textContent = STAGE_INSTRUCTIONS[0];

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    if (!testOver) {
        // ── Controls ──
        if (keys['ArrowLeft'] || keys['KeyA']) playerGroup.rotation.y += STEER;
        if (keys['ArrowRight'] || keys['KeyD']) playerGroup.rotation.y -= STEER;
        if (keys['ArrowUp'] || keys['KeyW']) velZ += ACCEL;
        else if (keys['ArrowDown'] || keys['KeyS']) velZ -= ACCEL * 0.7;
        if (keys['Space']) velZ *= BRAKE;

        velZ = Math.max(-MAX_SPD * 0.5, Math.min(MAX_SPD, velZ));
        velZ *= FRIC;
        playerGroup.translateZ(velZ);

        // Soft road boundary
        const px = playerGroup.position.x;
        if (Math.abs(px) > ROAD_W / 2 + 3) {
            playerGroup.position.x = Math.sign(px) * (ROAD_W / 2 + 3);
            velZ *= 0.5;
        }

        // Hard Z clamp
        const halfLen = ROAD_LEN / 2;
        playerGroup.position.z = Math.max(-halfLen + 5, Math.min(halfLen - 5, playerGroup.position.z));

        const kmh = Math.abs(velZ) * 120;
        const ppx = playerGroup.position.x;
        const ppz = playerGroup.position.z;

        // ── Stage dispatch ──
        switch (STAGES[stageIndex]) {
            case 'startStop': checkStage1_StartStop(delta, kmh, ppx, ppz); break;
            case 'parallelParking': checkStage2_ParallelParking(delta, kmh); break;
            case 'reverseParking': checkStage3_ReverseParking(delta, kmh); break;
            case 'threePointTurn': checkStage4_ThreePointTurn(delta, kmh, ppz); break;
            default: checkStageSignalAndRules(delta, kmh, ppx, ppz); break;
        }

        // Continuous enforcement always (speed + red light + sidewalk + pedestrian)
        // from stage 2 onward (after start-stop stage)
        if (stageIndex >= 1) {
            // speed only
            if (kmh > 40) {
                overspeedTimer += delta;
                if (overspeedTimer >= 3) {
                    addViolation('⚡ OVERSPEED! ' + Math.round(kmh) + ' km/h in 40 zone', 10, true);
                    overspeedTimer = 0;
                }
            } else {
                overspeedTimer = 0;
            }
        }

        // ── Warning fade ──
        if (warningTimer > 0) {
            warningTimer -= delta;
            if (warningTimer <= 0) warnMsg.style.opacity = '0';
        }

        updateHUD(kmh);
        updateSignal(delta);
        updatePedestrians(delta);
    }

    updateCamera();
    renderer.render(scene, camera);
}

animate();
