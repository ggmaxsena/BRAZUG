/**
 * Gera pasta dist/ para a Hostinger (Output directory = dist).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function cpDir(name) {
  const src = path.join(root, name);
  const dest = path.join(out, name);
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

rmDir(out);
fs.mkdirSync(out, { recursive: true });

for (const file of ["index.html", "server.mjs", "server.js"]) {
  cp(path.join(root, file), path.join(out, file));
}

cpDir("css");
cpDir("js");
cpDir("lib");
cpDir("assets");

const distPkg = {
  name: "brazug-website-dist",
  private: true,
  type: "module",
  scripts: {
    start: "node server.js",
  },
};

fs.writeFileSync(
  path.join(out, "package.json"),
  JSON.stringify(distPkg, null, 2),
  "utf8"
);

console.log("[build-dist] OK → dist/ (" + fs.readdirSync(out).join(", ") + ")");
