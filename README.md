# Icosahedron D20 (Three.js + Cannon-ES)

A physically simulated **Dungeons & Dragons D20** built with **Three.js** for rendering and **Cannon-ES** for real gravity, collisions, and rolling behavior.

The die is **stationary by default**, rolls only when triggered, settles naturally under gravity, and correctly detects and highlights the **top face** after each roll.

The camera **follows the die dynamically while rolling**, keeping the action centered without snapping or breaking orbit controls.

The playfield is a **compact dice tray**: casino-felt base plus **4 surrounding walls** so the die can **bounce** and stay contained.

---

## ✨ Features

- 🎲 True **D20 (icosahedron)** geometry
- 🧲 **Gravity + physics** (Cannon-ES)
- 🧮 Upright, centered face numbers
- ⬆️ Automatic **top face detection**
- 🔺 Visual highlight of the top face
- 🛑 Reliable roll completion (no frozen states)
- 🧠 Deterministic settle detection (velocity-based, not sleep-state hacks)
- 🧱 **Compact casino-felt playfield** (tight tabletop scale)
- 🧱 **4-wall dice tray** (die bounces off rails, stays on the table)
- 🎥 **Die-following orbit camera** (smooth, non-snapping)
- 🎛 Orbit camera controls (user-adjustable)

---

## 🧰 Tech Stack

- **Three.js** — 3D rendering
- **Cannon-ES** — Physics engine
- **Node.js + Express** — Local dev server
- **ES Modules** — Modern browser imports

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the server

```bash
node server.js
```

### 3. Open in browser

```
http://localhost:3000
```

---

## 🎮 How It Works

- The die starts **at rest** on a compact, flat felt surface.
- Clicking **ROLL D20**:
  - Applies impulse + torque on all 3 axes
  - Lets physics resolve motion naturally
- During the roll:
  - The camera smoothly **tracks the die’s position**
  - Orbit angle and zoom are preserved
- The die is contained by **4 tray walls**:
  - The die can **bounce** off the rails instead of escaping the playfield
  - Walls are static physics bodies (mass = 0) positioned at the edges of the felt
- When linear + angular velocity drop below thresholds:
  - The roll finalizes
  - The **top face value is calculated**
  - The top triangle is highlighted visually

No fake animations.  
No snapping.  
No camera hacks.  
Just real physics and spatial continuity.

---

## 🧱 Dice Tray (Felt + Walls)

The tray is made of:

- **Visual base**: a 15×15 plane tinted casino-felt green
- **Physics base**: a single infinite Cannon plane (flat ground)
- **4 walls**: thin box colliders placed at the playfield edges

Contacts are tuned with separate materials:

- **Die vs felt**: higher friction, lower bounce (stable settle)
- **Die vs wall**: lower friction, higher restitution (snappy rebounds)

If you want a tighter/looser tray, change the constants in `main.js`:

- `PLAYFIELD_SIZE`
- `WALL_HEIGHT`
- `WALL_THICKNESS`

---

## 🧠 Top Face Detection

Top face is determined by:

1. Precomputing **local face normals**
2. Transforming them by the die’s quaternion
3. Selecting the face whose normal most closely aligns with world-up `(0,1,0)`

This guarantees correct results regardless of orientation.

---

## 📁 Project Structure

```
/
├─ public/
│  ├─ index.html
│  ├─ main.js
│  └─ favicon.ico (optional)
├─ node_modules/
├─ server.js
└─ README.md
```

---

## 🧪 Known Limitations (By Design)

- Face numbering is **sequential**, not casino-balanced  
  (opposite faces do NOT yet sum to 21)
- No sound effects yet
- No multiplayer / networking (single die, single client)

These are intentional next-step upgrades.

---

## 🔮 Possible Extensions

- 🎯 True D&D numbering layout (opposites = 21)
- 🔊 Roll & collision sounds (including wall hits)
- 📷 Camera snap to top face (optional mode)
- 🎲 Multiple dice / dice tray variations (higher walls, rounded corners, etc.)
- 🔁 Seeded deterministic rolls
- 🕹 UI history / roll log

---

## 📜 License

MIT — do whatever you want, roll responsibly.

---

Built for learning, experimentation, and tabletop-adjacent mischief.
