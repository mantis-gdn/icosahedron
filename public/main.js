import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

// --------------------
// Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

// --------------------
// Camera
// --------------------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(6, 5, 6);

// --------------------
// Renderer
// --------------------
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --------------------
// Controls
// --------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.6, 0);

// --------------------
// Camera follow (tracks die position without breaking OrbitControls)
// --------------------
const FOLLOW_SMOOTH = 0.18;     // lower = snappier (0.12–0.25 sweet spot)
const FOLLOW_TARGET_Y = 0.25;   // aim a bit above center so top stays favored

const _desiredTarget = new THREE.Vector3();
const _smoothedTarget = new THREE.Vector3().copy(controls.target);
const _delta = new THREE.Vector3();

function updateCameraFollow() {
  _desiredTarget.set(d20.position.x, d20.position.y + FOLLOW_TARGET_Y, d20.position.z);
  _smoothedTarget.lerp(_desiredTarget, FOLLOW_SMOOTH);
  _delta.subVectors(_smoothedTarget, controls.target);
  camera.position.add(_delta);
  controls.target.copy(_smoothedTarget);
}

// --------------------
// Lights
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const key = new THREE.DirectionalLight(0xffffff, 1.0);
key.position.set(8, 10, 6);
scene.add(key);

const rim = new THREE.DirectionalLight(0xffffff, 0.6);
rim.position.set(-8, 3, -6);
scene.add(rim);

// --------------------
// UI
// --------------------
const ui = document.createElement("div");
ui.style.cssText = `
  position: fixed;
  left: 16px;
  bottom: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  z-index: 10;
  user-select: none;
`;

const rollBtn = document.createElement("button");
rollBtn.textContent = "ROLL D20";
rollBtn.style.cssText = `
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.18);
  color: rgba(255,255,255,0.92);
  padding: 10px 14px;
  font: 700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial;
  letter-spacing: 0.08em;
  border-radius: 12px;
  cursor: pointer;
  backdrop-filter: blur(8px);
`;
rollBtn.onmouseenter = () => (rollBtn.style.background = "rgba(255,255,255,0.12)");
rollBtn.onmouseleave = () => (rollBtn.style.background = "rgba(255,255,255,0.08)");

const resultPill = document.createElement("div");
resultPill.textContent = "TOP: —";
resultPill.style.cssText = `
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(0,0,0,0.28);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.85);
  font: 700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial;
`;

ui.appendChild(rollBtn);
ui.appendChild(resultPill);
document.body.appendChild(ui);

// --------------------
// Helpers
// --------------------
function rand(min, max) {
  return min + Math.random() * (max - min);
}

function ensureNonIndexed(geo) {
  return geo.index ? geo.toNonIndexed() : geo;
}

// --------------------
// Number Texture
// --------------------
function makeNumberTexture(n, size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(
    size * 0.5, size * 0.45, size * 0.12,
    size * 0.5, size * 0.5, size * 0.72
  );
  grad.addColorStop(0, "rgba(255,255,255,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(4, size * 0.012);
  ctx.beginPath();
  ctx.moveTo(size * 0.50, size * 0.16);
  ctx.lineTo(size * 0.18, size * 0.78);
  ctx.lineTo(size * 0.82, size * 0.78);
  ctx.closePath();
  ctx.stroke();

  const fontPx = Math.floor(size * 0.20);
  ctx.font = `800 ${fontPx}px system-ui, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(String(n), size * 0.502, size * 0.512);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(String(n), size * 0.50, size * 0.49);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

// --------------------
// Upright per-face UVs
// --------------------
function addWorldOrientedFaceUVs(geo, pad = 0.18) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackUp = new THREE.Vector3(0, 0, 1);
  const faceUp = new THREE.Vector3();
  const faceRight = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const p0 = new THREE.Vector2();
  const p1 = new THREE.Vector2();
  const p2 = new THREE.Vector2();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);

    ab.copy(b).sub(a);
    ac.copy(c).sub(a);
    n.copy(ab).cross(ac).normalize();

    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);

    faceUp.copy(worldUp).sub(tmp.copy(n).multiplyScalar(worldUp.dot(n)));
    if (faceUp.lengthSq() < 1e-6) {
      faceUp.copy(fallbackUp).sub(tmp.copy(n).multiplyScalar(fallbackUp.dot(n)));
    }
    faceUp.normalize();

    faceRight.copy(faceUp).cross(n).normalize();
    faceUp.copy(n).cross(faceRight).normalize();

    const project = (v, out) => {
      tmp.copy(v).sub(centroid);
      out.set(tmp.dot(faceRight), tmp.dot(faceUp));
    };

    project(a, p0);
    project(b, p1);
    project(c, p2);

    const minX = Math.min(p0.x, p1.x, p2.x);
    const maxX = Math.max(p0.x, p1.x, p2.x);
    const minY = Math.min(p0.y, p1.y, p2.y);
    const maxY = Math.max(p0.y, p1.y, p2.y);

    const w = Math.max(1e-6, maxX - minX);
    const h = Math.max(1e-6, maxY - minY);

    const map = (p) => ({
      u: pad + (1 - 2 * pad) * ((p.x - minX) / w),
      v: pad + (1 - 2 * pad) * ((p.y - minY) / h)
    });

    const u0 = map(p0);
    const u1 = map(p1);
    const u2 = map(p2);

    uv[(i + 0) * 2] = u0.u;
    uv[(i + 0) * 2 + 1] = u0.v;
    uv[(i + 1) * 2] = u1.u;
    uv[(i + 1) * 2 + 1] = u1.v;
    uv[(i + 2) * 2] = u2.u;
    uv[(i + 2) * 2 + 1] = u2.v;
  }

  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// --------------------
// Visual D20
// --------------------
let d20Geo = ensureNonIndexed(new THREE.IcosahedronGeometry(1, 0));
addWorldOrientedFaceUVs(d20Geo);

d20Geo.clearGroups();
for (let i = 0; i < 20; i++) d20Geo.addGroup(i * 3, 3, i);

const materials = Array.from({ length: 20 }, (_, i) =>
  new THREE.MeshStandardMaterial({
    map: makeNumberTexture(i + 1),
    metalness: 0.25,
    roughness: 0.45
  })
);

const d20 = new THREE.Mesh(d20Geo, materials);
scene.add(d20);

// Die edges
const dieEdges = new THREE.EdgesGeometry(d20Geo, 20);
d20.add(
  new THREE.LineSegments(
    dieEdges,
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.6, transparent: true })
  )
);

// --------------------
// Top-face highlight overlay
// --------------------
const topHighlightGeo = new THREE.BufferGeometry();
topHighlightGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(new Float32Array(9), 3)
);

const topHighlightMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthTest: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});

const topHighlight = new THREE.Mesh(topHighlightGeo, topHighlightMat);
d20.add(topHighlight);

const topOutline = new THREE.LineSegments(
  new THREE.EdgesGeometry(topHighlightGeo),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
);
d20.add(topOutline);

function setTopHighlightFace(faceIndex) {
  const pos = d20Geo.attributes.position;
  const base = faceIndex * 3;

  const a = new THREE.Vector3().fromBufferAttribute(pos, base + 0);
  const b = new THREE.Vector3().fromBufferAttribute(pos, base + 1);
  const c = new THREE.Vector3().fromBufferAttribute(pos, base + 2);

  const arr = topHighlightGeo.attributes.position.array;
  arr[0] = a.x; arr[1] = a.y; arr[2] = a.z;
  arr[3] = b.x; arr[4] = b.y; arr[5] = b.z;
  arr[6] = c.x; arr[7] = c.y; arr[8] = c.z;

  topHighlightGeo.attributes.position.needsUpdate = true;

  topOutline.geometry.dispose();
  topOutline.geometry = new THREE.EdgesGeometry(topHighlightGeo);
}

// --------------------
// Ground (visual) — UPDATED (smaller playfield)
// --------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 7),
  new THREE.MeshStandardMaterial({
    roughness: 1,
    color: 0x0f5a3c
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// --------------------
// Dice tray walls (constants)
// --------------------
const PLAYFIELD_SIZE = 7;
const WALL_HEIGHT = 2.0;
const WALL_THICKNESS = 0.35;

// --------------------
// Walls (visual)
// --------------------
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x2a1b12,
  roughness: 0.55,
  metalness: 0.05
});

const _half = PLAYFIELD_SIZE * 0.5;
const _wallY = WALL_HEIGHT * 0.5;

const wallZGeom = new THREE.BoxGeometry(
  PLAYFIELD_SIZE + WALL_THICKNESS * 2,
  WALL_HEIGHT,
  WALL_THICKNESS
);

const wallXGeom = new THREE.BoxGeometry(
  WALL_THICKNESS,
  WALL_HEIGHT,
  PLAYFIELD_SIZE + WALL_THICKNESS * 2
);

const wallNorth = new THREE.Mesh(wallZGeom, wallMat);
wallNorth.position.set(0, _wallY, +_half + WALL_THICKNESS * 0.5);
scene.add(wallNorth);

const wallSouth = new THREE.Mesh(wallZGeom, wallMat);
wallSouth.position.set(0, _wallY, -_half - WALL_THICKNESS * 0.5);
scene.add(wallSouth);

const wallEast = new THREE.Mesh(wallXGeom, wallMat);
wallEast.position.set(+_half + WALL_THICKNESS * 0.5, _wallY, 0);
scene.add(wallEast);

const wallWest = new THREE.Mesh(wallXGeom, wallMat);
wallWest.position.set(-_half - WALL_THICKNESS * 0.5, _wallY, 0);
scene.add(wallWest);

// --------------------
// Physics world (gravity)
// --------------------
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});

const matDie = new CANNON.Material("die");
const matGround = new CANNON.Material("ground");
const matWall = new CANNON.Material("wall");

world.defaultContactMaterial.friction = 0.35;
world.defaultContactMaterial.restitution = 0.12;

// Die vs felt
world.addContactMaterial(
  new CANNON.ContactMaterial(matDie, matGround, {
    friction: 0.38,
    restitution: 0.10
  })
);

// Die vs wood rails (MORE BOUNCY)
world.addContactMaterial(
  new CANNON.ContactMaterial(matDie, matWall, {
    friction: 0.06,
    restitution: 0.72
  })
);

// Ground body
const groundBody = new CANNON.Body({
  mass: 0,
  material: matGround,
  shape: new CANNON.Plane()
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// --------------------
// Walls (physics)
// --------------------
const wallShapeZ = new CANNON.Box(new CANNON.Vec3(
  (PLAYFIELD_SIZE * 0.5) + WALL_THICKNESS,
  (WALL_HEIGHT * 0.5),
  (WALL_THICKNESS * 0.5)
));

const wallShapeX = new CANNON.Box(new CANNON.Vec3(
  (WALL_THICKNESS * 0.5),
  (WALL_HEIGHT * 0.5),
  (PLAYFIELD_SIZE * 0.5) + WALL_THICKNESS
));

function addStaticWall(shape, x, y, z) {
  const body = new CANNON.Body({
    mass: 0,
    material: matWall
  });
  body.addShape(shape);
  body.position.set(x, y, z);
  world.addBody(body);
  return body;
}

addStaticWall(wallShapeZ, 0, _wallY, +_half + WALL_THICKNESS * 0.5);
addStaticWall(wallShapeZ, 0, _wallY, -_half - WALL_THICKNESS * 0.5);
addStaticWall(wallShapeX, +_half + WALL_THICKNESS * 0.5, _wallY, 0);
addStaticWall(wallShapeX, -_half - WALL_THICKNESS * 0.5, _wallY, 0);

// --------------------
// Physics D20 body (ConvexPolyhedron)
// --------------------
const physicsGeo = new THREE.IcosahedronGeometry(1, 0);
const pPos = physicsGeo.attributes.position;
const hasIndex = !!physicsGeo.index;

const verts = [];
for (let i = 0; i < pPos.count; i++) {
  verts.push(new CANNON.Vec3(pPos.getX(i), pPos.getY(i), pPos.getZ(i)));
}

const faces = [];
if (hasIndex) {
  const idx = physicsGeo.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    faces.push([idx[i], idx[i + 1], idx[i + 2]]);
  }
} else {
  for (let i = 0; i < pPos.count; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }
}

const dieShape = new CANNON.ConvexPolyhedron({ vertices: verts, faces });

const dieBody = new CANNON.Body({
  mass: 1.2,
  material: matDie,
  shape: dieShape,
  linearDamping: 0.20,
  angularDamping: 0.22
});

dieBody.position.set(0, 2.2, 0);
world.addBody(dieBody);

// --------------------
// Top face detection (render-geo normals)
// --------------------
const faceNormalsLocal = [];
{
  const pos = d20Geo.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    ab.copy(b).sub(a);
    ac.copy(c).sub(a);
    n.copy(ab).cross(ac).normalize();
    faceNormalsLocal.push(n.clone());
  }
}

const upWorld = new THREE.Vector3(0, 1, 0);

function getTopFaceFromQuaternion(q) {
  let bestIdx = 0;
  let bestDot = -Infinity;
  const nWorld = new THREE.Vector3();

  for (let i = 0; i < faceNormalsLocal.length; i++) {
    nWorld.copy(faceNormalsLocal[i]).applyQuaternion(q);
    const d = nWorld.dot(upWorld);
    if (d > bestDot) {
      bestDot = d;
      bestIdx = i;
    }
  }
  return { faceIndex: bestIdx, value: bestIdx + 1 };
}

// --------------------
// Roll state (settle detection)
// --------------------
let rolling = false;

let settleFrames = 0;
const SETTLE_FRAMES_REQUIRED = 18;
const LIN_EPS = 0.12;
const ANG_EPS = 0.22;

let rollStartTime = 0;
const MAX_ROLL_SECONDS = 6.0;

function finalizeRoll() {
  rolling = false;

  const top = getTopFaceFromQuaternion(d20.quaternion);
  resultPill.textContent = `TOP: ${top.value}`;
  setTopHighlightFace(top.faceIndex);

  rollBtn.disabled = false;
  rollBtn.style.opacity = "1";
  rollBtn.style.cursor = "pointer";
}

function startRoll() {
  if (rolling) return;
  rolling = true;

  settleFrames = 0;
  rollStartTime = performance.now();

  rollBtn.disabled = true;
  rollBtn.style.opacity = "0.55";
  rollBtn.style.cursor = "not-allowed";
  resultPill.textContent = "TOP: …";

  dieBody.wakeUp?.();
  dieBody.velocity.set(0, 0, 0);
  dieBody.angularVelocity.set(0, 0, 0);

  dieBody.position.set(rand(-1.0, 1.0), 3.0, rand(-1.0, 1.0));
  dieBody.quaternion.setFromEuler(
    rand(0, Math.PI * 2),
    rand(0, Math.PI * 2),
    rand(0, Math.PI * 2)
  );

  const impulse = new CANNON.Vec3(
    rand(-2.5, 2.5),
    rand(2.8, 4.4),
    rand(-2.5, 2.5)
  );
  dieBody.applyImpulse(impulse, dieBody.position);

  dieBody.torque.set(rand(-18, 18), rand(-18, 18), rand(-18, 18));
}

rollBtn.addEventListener("click", startRoll);

// --------------------
// Sync visuals to physics
// --------------------
function syncMeshFromBody() {
  d20.position.set(dieBody.position.x, dieBody.position.y, dieBody.position.z);
  d20.quaternion.set(
    dieBody.quaternion.x,
    dieBody.quaternion.y,
    dieBody.quaternion.z,
    dieBody.quaternion.w
  );
}

syncMeshFromBody();
{
  const top = getTopFaceFromQuaternion(d20.quaternion);
  resultPill.textContent = `TOP: ${top.value}`;
  setTopHighlightFace(top.faceIndex);
}

// --------------------
// Animate + physics stepping
// --------------------
let lastT = performance.now();
let acc = 0;
const FIXED = 1 / 60;

function animate(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  acc += dt;

  while (acc >= FIXED) {
    world.step(FIXED);
    acc -= FIXED;
  }

  syncMeshFromBody();
  updateCameraFollow();

  if (rolling) {
    const lin = dieBody.velocity.length();
    const ang = dieBody.angularVelocity.length();

    if (lin < LIN_EPS && ang < ANG_EPS) {
      settleFrames++;
    } else {
      settleFrames = 0;
    }

    if (settleFrames >= SETTLE_FRAMES_REQUIRED) {
      finalizeRoll();
    } else {
      const elapsed = (performance.now() - rollStartTime) / 1000;
      if (elapsed > MAX_ROLL_SECONDS) {
        finalizeRoll();
      }
    }
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// --------------------
// Resize
// --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
