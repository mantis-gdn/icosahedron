import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------
// Static app files
// --------------------
app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"]
  })
);

// --------------------
// Vendor libraries
// --------------------

// Three.js
app.use(
  "/vendor/three",
  express.static(path.join(__dirname, "node_modules", "three"))
);

// Cannon-ES (PHYSICS)
app.use(
  "/vendor/cannon-es",
  express.static(path.join(__dirname, "node_modules", "cannon-es", "dist"))
);

// --------------------
// Root
// --------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------
// Start server
// --------------------
app.listen(PORT, () => {
  console.log(`🎲 D20 running at http://localhost:${PORT}`);
});
