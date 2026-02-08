import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
camera.position.set(0, 12, -100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- HUD ---
const hud = document.createElement('div');
hud.style.position = 'absolute';
hud.style.top = '10px';
hud.style.left = '10px';
hud.style.color = 'white';
hud.style.fontSize = '20px';
hud.style.fontFamily = 'Arial Black, sans-serif';
hud.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
hud.style.padding = '15px';
hud.style.borderRadius = '8px';
hud.innerHTML = 'Drive to the red marker at the end';
document.body.appendChild(hud);

// --- Mini-Map Canvas ---
const miniMapCanvas = document.createElement('canvas');
const miniMapSize = 200; // Diameter of circular mini-map
miniMapCanvas.width = miniMapSize;
miniMapCanvas.height = miniMapSize;
miniMapCanvas.style.position = 'absolute';
miniMapCanvas.style.top = '20px';
miniMapCanvas.style.right = '20px';
miniMapCanvas.style.border = '3px solid rgba(0, 255, 255, 0.6)';
miniMapCanvas.style.borderRadius = '50%';
miniMapCanvas.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5)';
miniMapCanvas.style.backgroundColor = 'rgba(20, 20, 30, 0.8)';
miniMapCanvas.style.zIndex = '1000';
document.body.appendChild(miniMapCanvas);

const miniMapCtx = miniMapCanvas.getContext('2d');
const miniMapRadius = miniMapSize / 2;

// Mini-map settings
let miniMapZoom = 0.15; // Scale factor for map
const minZoom = 0.1;
const maxZoom = 0.3;
let mapRotationEnabled = true; // Toggle for map rotation following car

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(150, 300, 150);
scene.add(directionalLight);

// --- Textures ---
const textureLoader = new THREE.TextureLoader();
const roadTexture = textureLoader.load('/public/textures/road.jpg');
roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(2, 48);
const grassTexture = textureLoader.load('/public/textures/grass.jpg');
grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
grassTexture.repeat.set(48, 48);
const buildingTexture = textureLoader.load('/public/textures/building8.jpg');
buildingTexture.wrapS = buildingTexture.wrapT = THREE.RepeatWrapping;
buildingTexture.repeat.set(1, 1);
const pavementTexture = textureLoader.load('/public/textures/pavement.jpg');
pavementTexture.wrapS = pavementTexture.wrapT = THREE.RepeatWrapping;
pavementTexture.repeat.set(1, 48);

// Load movie poster texture
const posterTexture = textureLoader.load('/public/textures/devara_poster.jpg');
const hodPosterTexture = textureLoader.load('/public/posters_and_images/HOD.jpg');

// --- City parameters ---
const blockSpacing = 180;
const gridSize = 6; // bigger city: 6x6 grid
const citySize = blockSpacing * gridSize;
const roadWidth = 32;

// --- Ground ---
const groundGeometry = new THREE.PlaneGeometry(citySize + 200, citySize + 200);
const groundMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// --- City Perimeter Compound Wall (20m height) ---
const wallHeight = 20;
const wallThickness = 1;
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 }); // Brown brick color
const postMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Darker brown for posts

// Array to store wall meshes for collision detection
const walls = [];

// Position wall at the edge of the ground (where grass ends)
const wallOffset = (citySize + 200) / 2;

// North wall
const northWall = new THREE.Mesh(
  new THREE.BoxGeometry(citySize + 200, wallHeight, wallThickness),
  wallMaterial
);
northWall.position.set(0, wallHeight / 2, -wallOffset);
scene.add(northWall);
walls.push(northWall);

// South wall
const southWall = new THREE.Mesh(
  new THREE.BoxGeometry(citySize + 200, wallHeight, wallThickness),
  wallMaterial
);
southWall.position.set(0, wallHeight / 2, wallOffset);
scene.add(southWall);
walls.push(southWall);

// East wall
const eastWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThickness, wallHeight, citySize + 200),
  wallMaterial
);
eastWall.position.set(wallOffset, wallHeight / 2, 0);
scene.add(eastWall);
walls.push(eastWall);

// West wall
const westWall = new THREE.Mesh(
  new THREE.BoxGeometry(wallThickness, wallHeight, citySize + 200),
  wallMaterial
);
westWall.position.set(-wallOffset, wallHeight / 2, 0);
scene.add(westWall);
walls.push(westWall);

// Add corner posts
const postGeometry = new THREE.BoxGeometry(2, wallHeight + 2, 2);
const corners = [
  { x: wallOffset, z: wallOffset },
  { x: -wallOffset, z: wallOffset },
  { x: wallOffset, z: -wallOffset },
  { x: -wallOffset, z: -wallOffset }
];

corners.forEach(corner => {
  const post = new THREE.Mesh(postGeometry, postMaterial);
  post.position.set(corner.x, (wallHeight + 2) / 2, corner.z);
  scene.add(post);
});

// Add posts along the walls at regular intervals
const postSpacing = 50;
for (let i = -wallOffset + postSpacing; i < wallOffset; i += postSpacing) {
  // Posts along north and south walls
  const northPost = new THREE.Mesh(postGeometry, postMaterial);
  northPost.position.set(i, (wallHeight + 2) / 2, -wallOffset);
  scene.add(northPost);

  const southPost = new THREE.Mesh(postGeometry, postMaterial);
  southPost.position.set(i, (wallHeight + 2) / 2, wallOffset);
  scene.add(southPost);

  // Posts along east and west walls
  const eastPost = new THREE.Mesh(postGeometry, postMaterial);
  eastPost.position.set(wallOffset, (wallHeight + 2) / 2, i);
  scene.add(eastPost);

  const westPost = new THREE.Mesh(postGeometry, postMaterial);
  westPost.position.set(-wallOffset, (wallHeight + 2) / 2, i);
  scene.add(westPost);
}

// Traffic sign pictures on compound walls
const trafficSignPaths = [
  '/public/posters_and_images/traffic_sign_1.jpg',
  '/public/posters_and_images/traffic_sign_2.png',
  '/public/posters_and_images/traffic_sign_3.png',
  '/public/posters_and_images/safety_poster_1.png',
  '/public/posters_and_images/safety_poster_2.jpg',
  '/public/posters_and_images/safety_poster_3.png',
  '/public/posters_and_images/safety_poster_4.png',
  '/public/posters_and_images/safety_poster_5.png',
  '/public/posters_and_images/road_safety_1.png',
  '/public/posters_and_images/road_safety_2.png',
  '/public/posters_and_images/road_safety_3.png',
  '/public/posters_and_images/road_safety_4.png',
  '/public/posters_and_images/road_safety_5.png'
];

const trafficTextures = trafficSignPaths.map(path => {
  const texture = textureLoader.load(path);
  return texture;
});

// Add traffic sign pictures to walls at regular intervals (as posters attached to walls)
let signIndex = 0;
const signSpacing = 150;
const posterWidth = 30;
const posterHeight = 20;

// North wall (facing south) - posters attached to wall surface
for (let x = -wallOffset + signSpacing; x < wallOffset; x += signSpacing) {
  const posterGeometry = new THREE.PlaneGeometry(posterWidth, posterHeight);
  const posterMaterial = new THREE.MeshStandardMaterial({
    map: trafficTextures[signIndex % trafficTextures.length],
    side: THREE.DoubleSide
  });
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  poster.position.set(x + 20, 10, -wallOffset + 0.6); // Offset to avoid posts
  poster.rotation.y = 0; // Facing south
  scene.add(poster);
  signIndex++;
}

// South wall (facing north) - posters attached to wall surface
for (let x = -wallOffset + signSpacing; x < wallOffset; x += signSpacing) {
  const posterGeometry = new THREE.PlaneGeometry(posterWidth, posterHeight);
  const posterMaterial = new THREE.MeshStandardMaterial({
    map: trafficTextures[signIndex % trafficTextures.length],
    side: THREE.DoubleSide
  });
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  poster.position.set(x - 20, 10, wallOffset - 0.6); // Offset to avoid posts
  poster.rotation.y = Math.PI; // Facing north
  scene.add(poster);
  signIndex++;
}

// East wall (facing west) - posters attached to wall surface
for (let z = -wallOffset + signSpacing; z < wallOffset; z += signSpacing) {
  const posterGeometry = new THREE.PlaneGeometry(posterWidth, posterHeight);
  const posterMaterial = new THREE.MeshStandardMaterial({
    map: trafficTextures[signIndex % trafficTextures.length],
    side: THREE.DoubleSide
  });
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  poster.position.set(wallOffset - 0.6, 10, z + 20); // Offset to avoid posts
  poster.rotation.y = -Math.PI / 2; // Facing west
  scene.add(poster);
  signIndex++;
}

// West wall (facing east) - posters attached to wall surface
for (let z = -wallOffset + signSpacing; z < wallOffset; z += signSpacing) {
  const posterGeometry = new THREE.PlaneGeometry(posterWidth, posterHeight);
  const posterMaterial = new THREE.MeshStandardMaterial({
    map: trafficTextures[signIndex % trafficTextures.length],
    side: THREE.DoubleSide
  });
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  poster.position.set(-wallOffset + 0.6, 10, z - 20); // Offset to avoid posts
  poster.rotation.y = Math.PI / 2; // Facing east
  scene.add(poster);
  signIndex++;
}

// --- Roads ---
function createRoad(x, z, length, width, axis = 'z') {
  const geom = new THREE.PlaneGeometry(width, length);
  const mat = new THREE.MeshStandardMaterial({ map: roadTexture });
  const road = new THREE.Mesh(geom, mat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(x, 0.02, z);
  if (axis === 'x') road.rotation.z = Math.PI / 2;
  scene.add(road);
  // Dashes
  const dashGeom = new THREE.BoxGeometry(3, 0.1, 14);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const dashCount = Math.floor(length / 24);
  for (let i = 0; i < dashCount; i++) {
    const dz = -length / 2 + i * 24 + 12;
    const dash = new THREE.Mesh(dashGeom, dashMat);
    if (axis === 'z') {
      dash.position.set(x, 0.09, z + dz);
    } else {
      dash.position.set(x + dz, 0.09, z);
      dash.rotation.y = Math.PI / 2;
    }
    scene.add(dash);
  }
}
for (let i = 0; i <= gridSize; i++) {
  let pos = -citySize / 2 + i * blockSpacing;
  createRoad(pos, 0, citySize, roadWidth, 'z');
  createRoad(0, pos, citySize, roadWidth, 'x');
}

// --- Sidewalks along roads ---
function createSidewalk(x, z, length, width, axis = 'z') {
  const geom = new THREE.BoxGeometry(width, 0.7, length);
  const mat = new THREE.MeshStandardMaterial({ map: pavementTexture });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(x, 0.35, z);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  scene.add(mesh);
}
const sidewalkOffset = roadWidth / 2 + 7;
for (let i = 0; i <= gridSize; i++) {
  let pos = -citySize / 2 + i * blockSpacing;
  createSidewalk(pos - sidewalkOffset, 0, citySize, 7, 'z');
  createSidewalk(pos + sidewalkOffset, 0, citySize, 7, 'z');
  createSidewalk(0, pos - sidewalkOffset, citySize, 7, 'x');
  createSidewalk(0, pos + sidewalkOffset, citySize, 7, 'x');
}

// --- Buildings in blocks ---
const buildings = [];
let buildingIndex = 0; // Track building index for special poster placement

// Define building color palette
const buildingColors = [
  0x8b7355, // Brown
  0x6b5d52, // Dark brown
  0x9c8770, // Tan
  0x7a6a5a, // Gray-brown
  0xa89985, // Light tan
  0x5f5347  // Dark gray-brown
];

function createBlockBuildings(blockX, blockZ) {
  const blockCenterX = -citySize / 2 + blockX * blockSpacing + blockSpacing / 2;
  const blockCenterZ = -citySize / 2 + blockZ * blockSpacing + blockSpacing / 2;
  for (let bx = -40; bx <= 36; bx += 32) { // Increased spacing for larger buildings
    for (let bz = -40; bz <= 36; bz += 36) {
      // Special sizing for HOD building (first building)
      const isFirstBuilding = (buildingIndex === 0);
      const bHeight = isFirstBuilding ? 70 : (35 + Math.random() * 30); // HOD: 70, Others: 35-65
      const buildingWidth = isFirstBuilding ? 45 : 30; // HOD: 45, Others: 30
      const buildingDepth = isFirstBuilding ? 48 : 32; // HOD: 48, Others: 32

      // Select a color for this building
      const buildingColor = buildingColors[buildingIndex % buildingColors.length];

      const b = new THREE.Mesh(
        new THREE.BoxGeometry(buildingWidth, bHeight, buildingDepth),
        new THREE.MeshStandardMaterial({
          map: buildingTexture,
          color: buildingColor // Apply color tint
        })
      );
      b.position.set(blockCenterX + bx, bHeight / 2, blockCenterZ + bz);
      scene.add(b);
      buildings.push(b);

      // Poster sizing - larger for HOD building
      const posterWidth = isFirstBuilding ? 40 : 26; // HOD: 40, Others: 26
      const posterHeight = isFirstBuilding ? 50 : 35; // HOD: 50, Others: 35
      const posterY = bHeight / 2;

      // Use HOD poster for the first building, Devara poster for all others
      const currentPosterTexture = isFirstBuilding ? hodPosterTexture : posterTexture;

      // Create poster material
      const posterMaterial = new THREE.MeshStandardMaterial({
        map: currentPosterTexture,
        side: THREE.DoubleSide
      });

      // Front wall poster (facing +Z)
      const posterFront = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth, posterHeight),
        posterMaterial
      );
      posterFront.position.set(blockCenterX + bx, posterY, blockCenterZ + bz + buildingDepth / 2 + 0.1);
      posterFront.rotation.y = 0;
      scene.add(posterFront);

      // Back wall poster (facing -Z)
      const posterBack = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth, posterHeight),
        posterMaterial
      );
      posterBack.position.set(blockCenterX + bx, posterY, blockCenterZ + bz - buildingDepth / 2 - 0.1); // Adjusted
      posterBack.rotation.y = Math.PI;
      scene.add(posterBack);

      // Right wall poster (facing +X)
      const posterRight = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth, posterHeight),
        posterMaterial
      );
      posterRight.position.set(blockCenterX + bx + buildingWidth / 2 + 0.1, posterY, blockCenterZ + bz); // Adjusted
      posterRight.rotation.y = -Math.PI / 2;
      scene.add(posterRight);

      // Left wall poster (facing -X)
      const posterLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(posterWidth, posterHeight),
        posterMaterial
      );
      posterLeft.position.set(blockCenterX + bx - buildingWidth / 2 - 0.1, posterY, blockCenterZ + bz); // Adjusted
      posterLeft.rotation.y = Math.PI / 2;
      scene.add(posterLeft);

      buildingIndex++; // Increment building counter
    }
  }
}

// Load font and create 3D "CSE" text on buildings
const fontLoader = new FontLoader();
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', function (font) {
  let textBuildingIndex = 0;

  // Recreate building iteration to add text on top
  for (let blockX = 0; blockX < gridSize; blockX++) {
    for (let blockZ = 0; blockZ < gridSize; blockZ++) {
      const blockCenterX = -citySize / 2 + blockX * blockSpacing + blockSpacing / 2;
      const blockCenterZ = -citySize / 2 + blockZ * blockSpacing + blockSpacing / 2;

      for (let bx = -40; bx <= 36; bx += 32) {
        for (let bz = -40; bz <= 36; bz += 36) {
          const buildingMesh = buildings[textBuildingIndex];

          // Only add CSE billboard to the first building (HOD building)
          if (buildingMesh && textBuildingIndex === 0) {
            const bHeight = buildingMesh.geometry.parameters.height;

            // Create billboard background panel (white)
            const billboardWidth = 30; // Increased from 18
            const billboardHeight = 12; // Increased from 8
            const billboardGeometry = new THREE.BoxGeometry(billboardWidth, billboardHeight, 0.5);
            const billboardMaterial = new THREE.MeshStandardMaterial({
              color: 0xffffff, // White background
              roughness: 0.4,
              metalness: 0.1
            });
            const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
            billboard.position.set(
              blockCenterX + bx,
              bHeight + 12, // Higher position for larger billboard
              blockCenterZ + bz
            );
            scene.add(billboard);

            // Create billboard frame (black border)
            const frameGeometry = new THREE.BoxGeometry(billboardWidth + 0.8, billboardHeight + 0.8, 0.3);
            const frameMaterial = new THREE.MeshStandardMaterial({
              color: 0x222222, // Dark frame
              roughness: 0.3,
              metalness: 0.6
            });
            const frame = new THREE.Mesh(frameGeometry, frameMaterial);
            frame.position.set(
              blockCenterX + bx,
              bHeight + 12,
              blockCenterZ + bz - 0.5 // Behind billboard
            );
            scene.add(frame);

            // Create support poles (2 poles) - Increased height
            const poleHeight = 18; // Increased from 12
            const poleGeometry = new THREE.CylinderGeometry(0.4, 0.4, poleHeight, 8);
            const poleMaterial = new THREE.MeshStandardMaterial({
              color: 0x333333,
              metalness: 0.7,
              roughness: 0.4
            });

            // Left pole
            const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
            leftPole.position.set(
              blockCenterX + bx - 13, // Adjusted for wider billboard
              bHeight + poleHeight / 2,
              blockCenterZ + bz
            );
            scene.add(leftPole);

            // Right pole
            const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
            rightPole.position.set(
              blockCenterX + bx + 13, // Adjusted for wider billboard
              bHeight + poleHeight / 2,
              blockCenterZ + bz
            );
            scene.add(rightPole);

            // Create CSE text as a poster using canvas
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            // Fill white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw red "CSE" text
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 220px Arial'; // Increased from 140px
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('CSE', canvas.width / 2, canvas.height / 2);

            // Create texture from canvas
            const posterTexture = new THREE.CanvasTexture(canvas);

            // Create poster plane
            const posterGeometry = new THREE.PlaneGeometry(28, 11); // Increased from 16x7
            const posterMaterial = new THREE.MeshStandardMaterial({
              map: posterTexture,
              side: THREE.DoubleSide
            });
            const poster = new THREE.Mesh(posterGeometry, posterMaterial);

            // Position poster on billboard
            poster.position.set(
              blockCenterX + bx,
              bHeight + poleHeight,
              blockCenterZ + bz + 0.3 // In front of billboard
            );

            scene.add(poster);
          }

          textBuildingIndex++;
        }
      }
    }
  }
});

for (let i = 0; i < gridSize; i++) {
  for (let j = 0; j < gridSize; j++) {
    createBlockBuildings(i, j);
  }
}







// --- Car ---
let car, brakeLight, brakeParticles;
const loader = new GLTFLoader();

// Mission configuration - Diagonal corners
const startX = -citySize / 2 - 60; // Outside city boundary
const startZ = -citySize / 2 - 60; // Outside city boundary
const endX = citySize / 2 + 60;    // Outside city boundary on opposite corner
const endZ = citySize / 2 + 60;    // Outside city boundary on opposite corner

loader.load('/public/textures/car.glb', function (gltf) {
  car = gltf.scene;
  car.scale.set(10, 10, 10);
  car.position.set(startX, 1, startZ);
  scene.add(car);
  const lightGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.1);
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  brakeLight = new THREE.Mesh(lightGeometry, lightMaterial);
  brakeLight.position.set(0, 0.5, -1);
  brakeLight.visible = false;
  car.add(brakeLight);
  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i++) { positions[i] = 0; velocities[i] = 0; }
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  const particleMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.3, transparent: true, opacity: 0.6 });
  brakeParticles = new THREE.Points(particleGeometry, particleMaterial);
  car.add(brakeParticles);
});

// --- Controls & Updates ---
const keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup', e => { keys[e.code] = false; });
let carVelocity = new THREE.Vector3(0, 0, 0);
const acceleration = 0.05;
const maxSpeed = 1.5;
const rotationSpeed = 0.03;
const collisionSound = new Audio('/public/textures/collision.mp3');

// Mission state
let hasHitBuilding = false;
let missionComplete = false;
let isColliding = false;

// Drift mechanics state
let isDrifting = false;
let driftIntensity = 0; // 0 to 1, how much the car is drifting
let lateralVelocity = 0; // Sideways velocity for drift sliding
const driftThreshold = 0.8; // Speed threshold to enable drifting
const maxDriftIntensity = 1.0;
const driftDecay = 0.95; // How quickly drift fades when not turning
const lateralFriction = 0.92; // Friction for lateral movement
let currentSteeringAngle = 0; // Track current steering input
const tireMarks = []; // Array to store tire mark trails
let tireMarkTimer = 0; // Timer for creating tire marks

// Collision damage system
let carDamageLevel = 0; // 0 = no damage, 1 = minor, 2 = medium, 3 = severe
let carHealth = 100; // Car health percentage
const debrisParticles = []; // Array to store debris objects
const damageMarkers = []; // Visual damage on buildings
let lastCollisionImpact = 0; // Store last impact force
let collisionPoint = null; // Last collision point
const minorDamageThreshold = 0.3; // Speed threshold for minor damage
const mediumDamageThreshold = 0.7; // Speed threshold for medium damage
const severeDamageThreshold = 1.2; // Speed threshold for severe damage
let isCarDisabled = false; // Flag to disable car when health reaches zero
let collisionCooldown = 0; // Cooldown timer to prevent multiple damage from single impact
const collisionCooldownTime = 500; // Cooldown duration in milliseconds
function updateCar() {
  if (!car) return;

  // Disable all controls when car health is zero
  if (isCarDisabled) {
    carVelocity.set(0, 0, 0); // Stop the car completely
    return;
  }

  // Disable all controls when mission is complete (hit obstacle or reached end)
  if (missionComplete) {
    return;
  }

  // Update collision cooldown
  if (collisionCooldown > 0) {
    collisionCooldown -= 16; // Approximate frame time (60fps)
  }

  // Store previous steering angle
  const prevSteeringAngle = currentSteeringAngle;
  currentSteeringAngle = 0;

  // Handle acceleration and steering
  if (keys["ArrowUp"] || keys["KeyW"]) carVelocity.z += acceleration;
  if (keys["ArrowDown"] || keys["KeyS"]) carVelocity.z -= acceleration;

  // Track steering input
  if (keys["ArrowLeft"] || keys["KeyA"]) {
    currentSteeringAngle = rotationSpeed;
    car.rotation.y += rotationSpeed;
  }
  if (keys["ArrowRight"] || keys["KeyD"]) {
    currentSteeringAngle = -rotationSpeed;
    car.rotation.y -= rotationSpeed;
  }

  if (keys["Space"]) carVelocity.z *= 0.7;
  carVelocity.z = Math.max(-maxSpeed, Math.min(maxSpeed, carVelocity.z));

  // Calculate current speed (normalized 0-1)
  const currentSpeed = Math.abs(carVelocity.z) / maxSpeed;

  // Detect drift conditions: high speed + sharp turning
  const isSteeringSharp = Math.abs(currentSteeringAngle) > 0;
  const isHighSpeed = currentSpeed > driftThreshold;

  if (isSteeringSharp && isHighSpeed) {
    // Increase drift intensity based on speed and steering
    const driftIncrease = currentSpeed * Math.abs(currentSteeringAngle) * 2.5;
    driftIntensity = Math.min(maxDriftIntensity, driftIntensity + driftIncrease);
    isDrifting = driftIntensity > 0.3;

    // Apply lateral velocity (sideways sliding)
    const lateralDirection = currentSteeringAngle > 0 ? -1 : 1;
    lateralVelocity += lateralDirection * driftIntensity * 0.015;
  } else {
    // Gradually restore traction when not drifting
    driftIntensity *= driftDecay;
    isDrifting = driftIntensity > 0.3;
  }

  // Apply lateral friction
  lateralVelocity *= lateralFriction;

  // Create tire marks during drift
  if (isDrifting && currentSpeed > 0.5) {
    tireMarkTimer++;
    if (tireMarkTimer % 3 === 0) { // Create marks every 3 frames
      createTireMark();
    }
  } else {
    tireMarkTimer = 0;
  }

  const oldPosition = car.position.clone();

  // Apply forward movement
  car.translateZ(carVelocity.z);

  // Apply lateral (sideways) movement for drift effect
  if (Math.abs(lateralVelocity) > 0.001) {
    const lateralOffset = new THREE.Vector3(lateralVelocity, 0, 0);
    lateralOffset.applyQuaternion(car.quaternion);
    car.position.add(lateralOffset);
  }

  const carBox = new THREE.Box3().setFromObject(car);
  let collided = false;

  // Check collision with buildings
  for (let b of buildings) {
    if (carBox.intersectsBox(new THREE.Box3().setFromObject(b))) {
      collided = true;
      break;
    }
  }

  // Check collision with compound walls
  if (!collided) {
    for (let wall of walls) {
      if (carBox.intersectsBox(new THREE.Box3().setFromObject(wall))) {
        collided = true;
        break;
      }
    }
  }
  if (collided) {
    if (!isColliding && collisionCooldown <= 0) {
      // Calculate impact force based on speed
      const impactSpeed = Math.abs(carVelocity.z);
      lastCollisionImpact = impactSpeed;

      // Store collision point for effects
      collisionPoint = car.position.clone();

      // Determine damage level based on impact speed
      let damageAmount = 0;
      let damageLevel = 'none';

      if (impactSpeed >= severeDamageThreshold) {
        damageAmount = 30;
        damageLevel = 'severe';
        carDamageLevel = Math.max(carDamageLevel, 3);
      } else if (impactSpeed >= mediumDamageThreshold) {
        damageAmount = 15;
        damageLevel = 'medium';
        carDamageLevel = Math.max(carDamageLevel, 2);
      } else if (impactSpeed >= minorDamageThreshold) {
        damageAmount = 5;
        damageLevel = 'minor';
        carDamageLevel = Math.max(carDamageLevel, 1);
      }

      // Apply damage to car health
      carHealth = Math.max(0, carHealth - damageAmount);

      // Check if car health reached zero
      if (carHealth <= 0) {
        isCarDisabled = true;
        carVelocity.set(0, 0, 0);
      }

      // Create collision effects
      if (damageLevel !== 'none') {
        createCollisionEffects(collisionPoint, impactSpeed, damageLevel);
        applyCarDamage(damageLevel);
        createBuildingDamage(collisionPoint, damageLevel);
      }

      car.position.copy(oldPosition);
      car.position.y = 1; // Ensure car stays on ground level, prevent flying
      carVelocity.z *= -0.3;
      collisionSound.currentTime = 0;
      collisionSound.play();
      isColliding = true;

      // Set collision cooldown
      collisionCooldown = collisionCooldownTime;

      // Update HUD to show new health status
      updateHUD();
    }
  } else {
    isColliding = false;
  }

  // Always ensure car stays at ground level (prevent underground glitch)
  if (car.position.y < 1) {
    car.position.y = 1;
  }
}

// --- Tire Mark Creation for Drift ---
function createTireMark() {
  if (!car) return;

  // Create two tire marks (left and right wheel)
  const markWidth = 0.4;
  const markLength = 1.2;
  const wheelOffset = 0.8; // Distance from center to wheel

  const markGeometry = new THREE.PlaneGeometry(markWidth, markLength);
  const markMaterial = new THREE.MeshBasicMaterial({
    color: 0x0a0a0a,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });

  // Left tire mark
  const leftMark = new THREE.Mesh(markGeometry, markMaterial.clone());
  const leftOffset = new THREE.Vector3(-wheelOffset, 0, 0);
  leftOffset.applyQuaternion(car.quaternion);
  leftMark.position.set(
    car.position.x + leftOffset.x,
    0.11,
    car.position.z + leftOffset.z
  );
  leftMark.rotation.x = -Math.PI / 2;
  leftMark.rotation.z = car.rotation.y;
  leftMark.userData.creationTime = Date.now();
  scene.add(leftMark);
  tireMarks.push(leftMark);

  // Right tire mark
  const rightMark = new THREE.Mesh(markGeometry, markMaterial.clone());
  const rightOffset = new THREE.Vector3(wheelOffset, 0, 0);
  rightOffset.applyQuaternion(car.quaternion);
  rightMark.position.set(
    car.position.x + rightOffset.x,
    0.11,
    car.position.z + rightOffset.z
  );
  rightMark.rotation.x = -Math.PI / 2;
  rightMark.rotation.z = car.rotation.y;
  rightMark.userData.creationTime = Date.now();
  scene.add(rightMark);
  tireMarks.push(rightMark);

  // Limit tire marks to prevent performance issues
  while (tireMarks.length > 300) {
    const oldMark = tireMarks.shift();
    scene.remove(oldMark);
    oldMark.geometry.dispose();
    oldMark.material.dispose();
  }
}

// --- Collision Effects (Particles, Sparks, Debris) ---
function createCollisionEffects(position, impactSpeed, damageLevel) {
  // Determine particle count based on damage level
  let particleCount = 10;
  if (damageLevel === 'severe') particleCount = 30;
  else if (damageLevel === 'medium') particleCount = 20;
  else if (damageLevel === 'minor') particleCount = 10;

  // Create spark and debris particles
  for (let i = 0; i < particleCount; i++) {
    // Create particle geometry (small cubes for debris, spheres for sparks)
    const isDebris = Math.random() > 0.5;
    const particleGeometry = isDebris
      ? new THREE.BoxGeometry(0.3, 0.3, 0.3)
      : new THREE.SphereGeometry(0.15, 4, 4);

    const particleColor = isDebris
      ? new THREE.Color(0x8b4513) // Brown debris
      : new THREE.Color(0xffaa00); // Orange sparks

    const particleMaterial = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 1.0
    });

    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position at collision point with slight randomness
    particle.position.set(
      position.x + (Math.random() - 0.5) * 2,
      position.y + Math.random() * 2,
      position.z + (Math.random() - 0.5) * 2
    );

    // Random velocity for particles
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * impactSpeed * 3,
      Math.random() * impactSpeed * 2 + 1,
      (Math.random() - 0.5) * impactSpeed * 3
    );

    particle.userData.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2
    );

    particle.userData.creationTime = Date.now();
    particle.userData.lifetime = 2000 + Math.random() * 1000; // 2-3 seconds

    scene.add(particle);
    debrisParticles.push(particle);
  }

  // Create dust cloud effect
  const dustCount = 5;
  for (let i = 0; i < dustCount; i++) {
    const dustGeometry = new THREE.SphereGeometry(0.5, 6, 6);
    const dustMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.3
    });

    const dust = new THREE.Mesh(dustGeometry, dustMaterial);
    dust.position.set(
      position.x + (Math.random() - 0.5) * 3,
      position.y + 0.5,
      position.z + (Math.random() - 0.5) * 3
    );

    dust.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.3,
      (Math.random() - 0.5) * 0.5
    );
    dust.userData.creationTime = Date.now();
    dust.userData.lifetime = 1500;
    dust.userData.isDust = true;

    scene.add(dust);
    debrisParticles.push(dust);
  }
}

// --- Apply Visual Damage to Car ---
function applyCarDamage(damageLevel) {
  if (!car) return;

  // Apply visual deformation based on damage level
  if (damageLevel === 'severe') {
    // Severe damage: significant deformation
    car.scale.z *= 0.92; // Compress front
    car.scale.y *= 0.95; // Slight vertical compression
    car.rotation.x += (Math.random() - 0.5) * 0.05; // Slight tilt
  } else if (damageLevel === 'medium') {
    // Medium damage: moderate deformation
    car.scale.z *= 0.96;
    car.scale.y *= 0.98;
  } else if (damageLevel === 'minor') {
    // Minor damage: slight deformation
    car.scale.z *= 0.99;
  }

  // Add damage indicator (red tint)
  if (car.traverse) {
    car.traverse((child) => {
      if (child.isMesh && child.material) {
        const damageTint = carDamageLevel / 3; // 0 to 1
        if (!child.material.originalColor) {
          child.material.originalColor = child.material.color.clone();
        }
        child.material.color.lerp(new THREE.Color(0xff0000), damageTint * 0.3);
      }
    });
  }
}

// --- Create Building Damage (Cracks, Debris) ---
function createBuildingDamage(position, damageLevel) {
  // Create crack/damage marker on building wall
  const crackSize = damageLevel === 'severe' ? 3 : damageLevel === 'medium' ? 2 : 1;

  // Create crack texture (dark lines)
  const crackGeometry = new THREE.PlaneGeometry(crackSize, crackSize);
  const crackMaterial = new THREE.MeshBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });

  const crack = new THREE.Mesh(crackGeometry, crackMaterial);
  crack.position.set(position.x, position.y + 2, position.z);

  // Orient crack to face outward from collision point
  crack.lookAt(camera.position);

  crack.userData.creationTime = Date.now();
  crack.userData.lifetime = 10000; // Cracks last 10 seconds

  scene.add(crack);
  damageMarkers.push(crack);

  // Spawn falling debris for severe damage
  if (damageLevel === 'severe' || damageLevel === 'medium') {
    const debrisCount = damageLevel === 'severe' ? 8 : 4;
    for (let i = 0; i < debrisCount; i++) {
      const debrisGeometry = new THREE.BoxGeometry(
        0.3 + Math.random() * 0.5,
        0.3 + Math.random() * 0.5,
        0.3 + Math.random() * 0.5
      );
      const debrisMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b7355 // Brown/brick color
      });

      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      debris.position.set(
        position.x + (Math.random() - 0.5) * 2,
        position.y + 3 + Math.random() * 2,
        position.z + (Math.random() - 0.5) * 2
      );

      debris.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3,
        (Math.random() - 0.5) * 2
      );
      debris.userData.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      debris.userData.creationTime = Date.now();
      debris.userData.lifetime = 5000;
      debris.userData.isDebris = true;

      scene.add(debris);
      debrisParticles.push(debris);
    }
  }
}

// --- Update Debris Particles (Physics and Cleanup) ---
function updateDebrisParticles() {
  const currentTime = Date.now();
  const gravity = -0.05;

  for (let i = debrisParticles.length - 1; i >= 0; i--) {
    const particle = debrisParticles[i];
    const age = currentTime - particle.userData.creationTime;

    if (age > particle.userData.lifetime) {
      // Remove old particles
      scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
      debrisParticles.splice(i, 1);
    } else {
      // Update particle physics
      if (particle.userData.velocity) {
        particle.userData.velocity.y += gravity; // Apply gravity
        particle.position.add(particle.userData.velocity);

        // Apply rotation
        if (particle.userData.rotationSpeed) {
          particle.rotation.x += particle.userData.rotationSpeed.x;
          particle.rotation.y += particle.userData.rotationSpeed.y;
          particle.rotation.z += particle.userData.rotationSpeed.z;
        }

        // Ground collision
        if (particle.position.y < 0.5) {
          particle.position.y = 0.5;
          particle.userData.velocity.y *= -0.3; // Bounce
          particle.userData.velocity.x *= 0.8; // Friction
          particle.userData.velocity.z *= 0.8;
        }

        // Fade out particles
        const fadeProgress = age / particle.userData.lifetime;
        if (particle.material.opacity !== undefined) {
          particle.material.opacity = 1 - fadeProgress;
        }

        // Expand dust clouds
        if (particle.userData.isDust) {
          const expandFactor = 1 + fadeProgress * 2;
          particle.scale.set(expandFactor, expandFactor, expandFactor);
        }
      }
    }
  }

  // Update damage markers (cracks on buildings)
  for (let i = damageMarkers.length - 1; i >= 0; i--) {
    const marker = damageMarkers[i];
    const age = currentTime - marker.userData.creationTime;

    if (age > marker.userData.lifetime) {
      scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
      damageMarkers.splice(i, 1);
    } else {
      // Fade out cracks over time
      const fadeProgress = age / marker.userData.lifetime;
      marker.material.opacity = 0.7 * (1 - fadeProgress);
    }
  }
}

// --- Update Tire Marks (fade over time) ---
function updateTireMarks() {
  const currentTime = Date.now();
  const fadeTime = 8000; // Fade out over 8 seconds

  for (let i = tireMarks.length - 1; i >= 0; i--) {
    const mark = tireMarks[i];
    const age = currentTime - mark.userData.creationTime;

    if (age > fadeTime) {
      scene.remove(mark);
      mark.geometry.dispose();
      mark.material.dispose();
      tireMarks.splice(i, 1);
    } else {
      const fadeProgress = age / fadeTime;
      mark.material.opacity = 0.6 * (1 - fadeProgress);
    }
  }
}

function updateCamera() {
  if (!car) return;

  // Base camera offset
  const offset = new THREE.Vector3(0, 2, -5).applyMatrix4(car.matrixWorld);
  camera.position.lerp(offset, 0.08);

  // Add camera shake during drift
  if (isDrifting) {
    const shakeIntensity = driftIntensity * 0.08;
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity;
  }

  // Look at car with slight tilt during drift
  const lookAtTarget = car.position.clone();
  if (isDrifting) {
    // Tilt camera based on drift direction
    const tiltAmount = lateralVelocity * 0.5;
    lookAtTarget.x += tiltAmount;
  }

  camera.lookAt(lookAtTarget);
}
function updateHUD() {
  // Check if car is disabled (health reached zero)
  if (isCarDisabled) {
    hud.innerHTML = `
      <div style="color: #ff0000; font-size: 28px; font-weight: bold; text-shadow: 0 0 10px #ff0000;">⚠️ CAR DISABLED - GAME OVER</div>
      <div style="color: #ffaa00; margin-top: 10px; font-size: 18px;">Vehicle Breakdown</div>
      <div style="color: white; margin-top: 10px;">Press R to restart the game</div>
      <div style="margin-top: 10px; color: #ff0000;">
        <div style="font-size: 14px;">Car Health: 0%</div>
        <div style="background: rgba(0,0,0,0.5); width: 150px; height: 15px; border: 1px solid white; margin-top: 3px; border-radius: 3px;">
          <div style="background: #ff0000; width: 0%; height: 100%; border-radius: 2px;"></div>
        </div>
      </div>
      <div style="margin-top: 5px; color: #ff0000; font-size: 12px;">Critical Damage</div>
    `;
    return;
  }

  if (missionComplete) {
    if (hasHitBuilding) {
      hud.innerHTML = `
        <div style="color: #ff0000; font-size: 24px; font-weight: bold;">❌ Hit the obstacle!</div>
        <div style="color: white; margin-top: 10px;">Press R to restart the game</div>
      `;
    } else {
      hud.innerHTML = `
        <div style="color: #00ff00; font-size: 24px; font-weight: bold;">✓ Reached successfully!</div>
        <div style="color: white; margin-top: 10px;">Press R to restart</div>
      `;
    }
  } else {
    // Determine health bar color
    let healthColor = '#00ff00'; // Green
    if (carHealth < 50) healthColor = '#ffaa00'; // Orange
    if (carHealth < 25) healthColor = '#ff0000'; // Red

    // Add flashing effect for critical health
    const isFlashing = carHealth < 25 && Math.floor(Date.now() / 300) % 2 === 0;
    const flashStyle = isFlashing ? 'opacity: 0.5;' : '';

    // Damage level text
    const damageLevelText = ['No Damage', 'Minor Damage', 'Medium Damage', 'Severe Damage'][carDamageLevel];
    const damageLevelColor = ['#00ff00', '#ffff00', '#ffaa00', '#ff0000'][carDamageLevel];

    // Warning message for low health
    let warningMessage = '';
    if (carHealth < 25) {
      warningMessage = '<div style="color: #ff0000; margin-top: 5px; font-weight: bold; animation: pulse 1s infinite;">⚠️ CRITICAL CONDITION!</div>';
    } else if (carHealth < 50) {
      warningMessage = '<div style="color: #ffaa00; margin-top: 5px;">⚠️ Low Health</div>';
    }

    hud.innerHTML = `
      <div style="color: white;">Drive to the red marker at the end</div>
      <div style="color: #ffff00; margin-top: 5px;">Avoid hitting buildings!</div>
      <div style="margin-top: 10px; color: white; ${flashStyle}">
        <div style="font-size: 14px;">Car Health: ${Math.round(carHealth)}%</div>
        <div style="background: rgba(0,0,0,0.5); width: 150px; height: 15px; border: 1px solid white; margin-top: 3px; border-radius: 3px;">
          <div style="background: ${healthColor}; width: ${carHealth}%; height: 100%; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
      <div style="margin-top: 5px; color: ${damageLevelColor}; font-size: 12px;">${damageLevelText}</div>
      ${warningMessage}
    `;
  }
}

// --- Mini-Map Rendering ---
function updateMiniMap() {
  if (!car) return;

  // Clear canvas
  miniMapCtx.clearRect(0, 0, miniMapSize, miniMapSize);

  // Save context state
  miniMapCtx.save();

  // Create circular clipping mask
  miniMapCtx.beginPath();
  miniMapCtx.arc(miniMapRadius, miniMapRadius, miniMapRadius - 5, 0, Math.PI * 2);
  miniMapCtx.clip();

  // Fill background with gradient
  const bgGradient = miniMapCtx.createRadialGradient(
    miniMapRadius, miniMapRadius, 0,
    miniMapRadius, miniMapRadius, miniMapRadius
  );
  bgGradient.addColorStop(0, 'rgba(30, 30, 40, 0.9)');
  bgGradient.addColorStop(1, 'rgba(10, 10, 20, 0.95)');
  miniMapCtx.fillStyle = bgGradient;
  miniMapCtx.fill();

  // Dynamic zoom based on speed
  const currentSpeed = Math.abs(carVelocity.z) / maxSpeed;
  const targetZoom = minZoom + (maxZoom - minZoom) * (1 - currentSpeed * 0.7);
  miniMapZoom += (targetZoom - miniMapZoom) * 0.1; // Smooth zoom transition

  // Translate to center
  miniMapCtx.translate(miniMapRadius, miniMapRadius);

  // Rotate map based on car heading if enabled
  if (mapRotationEnabled) {
    miniMapCtx.rotate(-car.rotation.y);
  }

  // Scale based on zoom
  miniMapCtx.scale(miniMapZoom, miniMapZoom);

  // Draw grid lines for reference
  miniMapCtx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
  miniMapCtx.lineWidth = 1 / miniMapZoom;
  for (let i = -1000; i <= 1000; i += 100) {
    miniMapCtx.beginPath();
    miniMapCtx.moveTo(i, -1000);
    miniMapCtx.lineTo(i, 1000);
    miniMapCtx.stroke();
    miniMapCtx.beginPath();
    miniMapCtx.moveTo(-1000, i);
    miniMapCtx.lineTo(1000, i);
    miniMapCtx.stroke();
  }

  // Draw route line from start to end
  miniMapCtx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
  miniMapCtx.lineWidth = 3 / miniMapZoom;
  miniMapCtx.setLineDash([10 / miniMapZoom, 5 / miniMapZoom]);
  miniMapCtx.beginPath();
  miniMapCtx.moveTo(startX - car.position.x, startZ - car.position.z);
  miniMapCtx.lineTo(endX - car.position.x, endZ - car.position.z);
  miniMapCtx.stroke();
  miniMapCtx.setLineDash([]);

  // Draw start point (green)
  const startRelX = startX - car.position.x;
  const startRelZ = startZ - car.position.z;
  miniMapCtx.fillStyle = '#00ff00';
  miniMapCtx.shadowColor = '#00ff00';
  miniMapCtx.shadowBlur = 10 / miniMapZoom;
  miniMapCtx.beginPath();
  miniMapCtx.arc(startRelX, startRelZ, 8 / miniMapZoom, 0, Math.PI * 2);
  miniMapCtx.fill();
  miniMapCtx.shadowBlur = 0;

  // Draw end point (red) with pulsing effect
  const endRelX = endX - car.position.x;
  const endRelZ = endZ - car.position.z;
  const pulseSize = 12 + Math.sin(Date.now() / 200) * 2;
  miniMapCtx.fillStyle = '#ff0000';
  miniMapCtx.shadowColor = '#ff0000';
  miniMapCtx.shadowBlur = 15 / miniMapZoom;
  miniMapCtx.beginPath();
  miniMapCtx.arc(endRelX, endRelZ, pulseSize / miniMapZoom, 0, Math.PI * 2);
  miniMapCtx.fill();
  miniMapCtx.shadowBlur = 0;

  // Draw directional arrow to end point
  const angleToEnd = Math.atan2(endRelZ, endRelX);
  const arrowDistance = 40 / miniMapZoom;
  const arrowX = Math.cos(angleToEnd) * arrowDistance;
  const arrowZ = Math.sin(angleToEnd) * arrowDistance;

  miniMapCtx.save();
  miniMapCtx.translate(arrowX, arrowZ);
  miniMapCtx.rotate(angleToEnd);
  miniMapCtx.fillStyle = '#ffff00';
  miniMapCtx.beginPath();
  miniMapCtx.moveTo(10 / miniMapZoom, 0);
  miniMapCtx.lineTo(-5 / miniMapZoom, -5 / miniMapZoom);
  miniMapCtx.lineTo(-5 / miniMapZoom, 5 / miniMapZoom);
  miniMapCtx.closePath();
  miniMapCtx.fill();
  miniMapCtx.restore();

  // Draw car icon at center (always centered)
  miniMapCtx.save();
  if (mapRotationEnabled) {
    // Car points up when map rotates
    miniMapCtx.rotate(0);
  } else {
    // Car rotates when map is fixed
    miniMapCtx.rotate(car.rotation.y);
  }

  // Car body
  miniMapCtx.fillStyle = '#00ccff';
  miniMapCtx.shadowColor = '#00ccff';
  miniMapCtx.shadowBlur = 8 / miniMapZoom;
  miniMapCtx.fillRect(-6 / miniMapZoom, -4 / miniMapZoom, 12 / miniMapZoom, 8 / miniMapZoom);

  // Car direction indicator (front)
  miniMapCtx.fillStyle = '#ffffff';
  miniMapCtx.beginPath();
  miniMapCtx.moveTo(6 / miniMapZoom, 0);
  miniMapCtx.lineTo(10 / miniMapZoom, -3 / miniMapZoom);
  miniMapCtx.lineTo(10 / miniMapZoom, 3 / miniMapZoom);
  miniMapCtx.closePath();
  miniMapCtx.fill();
  miniMapCtx.shadowBlur = 0;

  miniMapCtx.restore();

  // Restore context
  miniMapCtx.restore();

  // Draw compass indicator (N/S/E/W)
  miniMapCtx.save();
  miniMapCtx.font = 'bold 12px Arial';
  miniMapCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  miniMapCtx.textAlign = 'center';
  miniMapCtx.textBaseline = 'middle';

  // North indicator
  const compassOffset = miniMapRadius - 25;
  if (mapRotationEnabled) {
    const northAngle = -car.rotation.y;
    const northX = miniMapRadius + Math.sin(northAngle) * compassOffset;
    const northY = miniMapRadius - Math.cos(northAngle) * compassOffset;
    miniMapCtx.fillText('N', northX, northY);
  } else {
    miniMapCtx.fillText('N', miniMapRadius, 25);
  }

  miniMapCtx.restore();

  // Draw distance to destination
  const distanceToEnd = Math.sqrt(
    Math.pow(car.position.x - endX, 2) +
    Math.pow(car.position.z - endZ, 2)
  );

  miniMapCtx.save();
  miniMapCtx.font = 'bold 11px Arial';
  miniMapCtx.fillStyle = '#ffff00';
  miniMapCtx.textAlign = 'center';
  miniMapCtx.fillText(`${Math.round(distanceToEnd)}m`, miniMapRadius, miniMapSize - 10);
  miniMapCtx.restore();
}

// --- Start Marker (Green) ---
const startMarkerGeometry = new THREE.BoxGeometry(30, 0.2, 30);
const startMarkerMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  emissive: 0x00ff00,
  emissiveIntensity: 0.5
});
const startMarker = new THREE.Mesh(startMarkerGeometry, startMarkerMaterial);
startMarker.position.set(startX, 0.1, startZ);
scene.add(startMarker);

// --- End Marker (Red) ---
const endMarkerGeometry = new THREE.BoxGeometry(30, 0.2, 30);
const endMarkerMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  emissive: 0xff0000,
  emissiveIntensity: 0.5
});
const endMarker = new THREE.Mesh(endMarkerGeometry, endMarkerMaterial);
endMarker.position.set(endX, 0.1, endZ);
scene.add(endMarker);

// --- End Point Detection ---
function checkEndPoint() {
  if (!car || missionComplete) return;

  // Check if car reached the end marker (diagonal corner)
  const distanceToEnd = Math.sqrt(
    Math.pow(car.position.x - endX, 2) +
    Math.pow(car.position.z - endZ, 2)
  );

  if (distanceToEnd < 30) {
    missionComplete = true;
    carVelocity.set(0, 0, 0);
    updateHUD();
  }
}

// --- Restart Function ---
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && (missionComplete || isCarDisabled)) {
    if (!car) return;

    // Reset car to start (diagonal corner)
    car.position.set(startX, 1, startZ);
    car.rotation.y = 0;
    car.rotation.x = 0; // Reset any tilt from damage
    carVelocity.set(0, 0, 0);

    // Reset car damage and health
    carHealth = 100;
    carDamageLevel = 0;

    // Reset car scale (undo deformation)
    car.scale.set(10, 10, 10);

    // Reset car material colors
    if (car.traverse) {
      car.traverse((child) => {
        if (child.isMesh && child.material && child.material.originalColor) {
          child.material.color.copy(child.material.originalColor);
        }
      });
    }

    // Clear all debris particles
    debrisParticles.forEach(particle => {
      scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    });
    debrisParticles.length = 0;

    // Clear all damage markers
    damageMarkers.forEach(marker => {
      scene.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    });
    damageMarkers.length = 0;

    // Reset car disabled state and collision cooldown
    isCarDisabled = false;
    collisionCooldown = 0;

    // Reset mission state
    hasHitBuilding = false;
    missionComplete = false;
    isColliding = false;
    updateHUD();
  }
});

// --- Old finish line (keeping for reference) ---
const finishLineZ = citySize / 2 - 30;
const finishGeometry = new THREE.BoxGeometry(20, 0.12, 2.2);
const finishMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const finishLine = new THREE.Mesh(finishGeometry, finishMaterial);
finishLine.position.set(0, 0.05, finishLineZ);
scene.add(finishLine);
const crosswalkMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
for (let x = -8; x <= 8; x += 2) {
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.6), crosswalkMaterial);
  stripe.position.set(x, 0.06, finishLineZ + 5);
  scene.add(stripe);
}
function animate() {
  requestAnimationFrame(animate);
  updateCar();
  updateCamera();
  updateTireMarks(); // Update and fade tire marks
  updateDebrisParticles(); // Update collision debris and damage effects
  checkEndPoint();
  updateHUD();
  updateMiniMap(); // Update mini-map display
  renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});