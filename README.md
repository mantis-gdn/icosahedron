# Icosahedron D20 (Three.js + Cannon-ES)

A physically simulated **Dungeons & Dragons D20** built with **Three.js** for rendering and **Cannon-ES** for real gravity, collisions, and rolling behavior.

The die is **stationary by default**, rolls only when triggered, settles naturally under gravity, and correctly detects and highlights the **top face** after each roll.

---

## ✨ Features

- 🎲 True **D20 (icosahedron)** geometry
- 🧲 **Gravity + physics** (Cannon-ES)
- 🧮 Upright, centered face numbers
- ⬆️ Automatic **top face detection**
- 🔺 Visual highlight of the top face
- 🛑 Reliable roll completion (no frozen states)
- 🧠 Deterministic settle detection (velocity-based, not sleep-state hacks)
- 🧱 Flat ground plane with friction & restitution tuning
- 🎥 Orbit camera controls

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

- The die starts **at rest** on a flat surface.
- Clicking **ROLL D20**:
  - Applies impulse + torque on all 3 axes
  - Lets physics resolve motion naturally
- When linear + angular velocity drop below thresholds:
  - The roll finalizes
  - The **top face value is calculated**
  - The top triangle is highlighted visually

No fake animations. No snapping. Real physics.

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
- 🔊 Roll & collision sounds
- 📷 Camera snap to top face
- 🎲 Multiple dice / dice tray
- 🔁 Seeded deterministic rolls
- 🕹 UI history / roll log

---

## 📜 License

MIT — do whatever you want, roll responsibly.

---

Built for learning, experimentation, and tabletop-adjacent mischief.
