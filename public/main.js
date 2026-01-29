import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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
  100
);
camera.position.set(2.8, 2.2, 2.8);

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

// --------------------
// Lights
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const key = new THREE.DirectionalLight(0xffffff, 1.0);
key.position.set(5, 6, 4);
scene.add(key);

const rim = new THREE.DirectionalLight(0xffffff, 0.6);
rim.position.set(-5, 2, -4);
scene.add(rim);

// --------------------
// Number Texture
// --------------------
function makeNumberTexture(n, size = 512) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");

  // Background
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, size, size);

  // Subtle vignette
  const grad = ctx.createRadialGradient(
    size * 0.5, size * 0.45, size * 0.12,
    size * 0.5, size * 0.5, size * 0.72
  );
  grad.addColorStop(0, "rgba(255,255,255,0.06)");
  grad.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Inner triangle guide (visual centering aid)
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(4, size * 0.012);
  ctx.beginPath();
  ctx.moveTo(size * 0.50, size * 0.16);
  ctx.lineTo(size * 0.18, size * 0.78);
  ctx.lineTo(size * 0.82, size * 0.78);
  ctx.closePath();
  ctx.stroke();

  // Number
  const fontPx = Math.floor(size * 0.30);
  ctx.font = `800 ${fontPx}px system-ui, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillText(String(n), size * 0.502, size * 0.532);

  // Main glyph
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(String(n), size * 0.50, size * 0.52);

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
    a.fromBufferAttribute(pos, i + 0);
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
// D20
// --------------------
let d20Geo = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
addWorldOrientedFaceUVs(d20Geo);

const materials = Array.from({ length: 20 }, (_, i) =>
  new THREE.MeshStandardMaterial({
    map: makeNumberTexture(i + 1),
    metalness: 0.25,
    roughness: 0.45
  })
);

d20Geo.clearGroups();
for (let i = 0; i < 20; i++) d20Geo.addGroup(i * 3, 3, i);

const d20 = new THREE.Mesh(d20Geo, materials);
scene.add(d20);

// Edges
const edges = new THREE.EdgesGeometry(d20Geo, 20);
d20.add(
  new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.6, transparent: true })
  )
);

// --------------------
// Ground
// --------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.4;
scene.add(ground);

// --------------------
// Animate
// --------------------
function animate() {
  controls.update();
  d20.rotation.y += 0.003;
  d20.rotation.x += 0.0015;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// --------------------
// Resize
// --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
