import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve your app
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

// Serve Three.js directly from node_modules
app.use(
  "/vendor/three",
  express.static(path.join(__dirname, "node_modules", "three"))
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ D20 running at http://localhost:${PORT}`);
});
