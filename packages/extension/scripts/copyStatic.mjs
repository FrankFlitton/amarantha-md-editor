import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

mkdirSync(dist, { recursive: true });
cpSync(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));
cpSync(path.join(root, "icons"), path.join(dist, "icons"), { recursive: true });

console.log("Copied manifest.json and icons/ to dist/");
