#!/usr/bin/env node
// Regenerates every published app icon/favicon from the source art in
// design/logos/. Run after the logo artwork changes. Requires macOS
// (shells out to `sips` for PNG resizing) and the Tauri CLI (via npx).
//
//   npm run update-icons

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logos = path.join(root, "design/logos");

const APP_ICON_PNG = path.join(logos, "App Icon.png");
const APP_ICON_SVG = path.join(logos, "App Icon.svg");
const ICON_ON_COLOR_PNG = path.join(logos, "Icon On Color.png");
const ICON_ON_COLOR_SVG = path.join(logos, "Icon On Color.svg");

function resize(src, size, out) {
  mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("sips", ["-z", String(size), String(size), src, "--out", out], { stdio: "pipe" });
  console.log(`  wrote ${path.relative(root, out)} (${size}x${size})`);
}

function copy(src, out) {
  mkdirSync(path.dirname(out), { recursive: true });
  copyFileSync(src, out);
  console.log(`  wrote ${path.relative(root, out)}`);
}

console.log("Desktop (Tauri) app icons");
const desktopDir = path.join(root, "packages/desktop");
execFileSync("npx", ["--no-install", "tauri", "icon", APP_ICON_PNG], { cwd: desktopDir, stdio: "inherit" });
// `tauri icon` also emits iOS/Android icon sets for mobile targets we don't
// build yet — drop them so only the icons tauri.conf.json references stay.
const iconsDir = path.join(desktopDir, "src-tauri/icons");
rmSync(path.join(iconsDir, "ios"), { recursive: true, force: true });
rmSync(path.join(iconsDir, "android"), { recursive: true, force: true });
rmSync(path.join(iconsDir, "64x64.png"), { force: true });

console.log("Chrome extension icons");
const extIcons = path.join(root, "packages/extension/icons");
for (const size of [16, 32, 48, 128]) {
  resize(ICON_ON_COLOR_PNG, size, path.join(extIcons, `icon-${size}.png`));
}

console.log("VS Code marketplace icon");
resize(APP_ICON_PNG, 128, path.join(root, "packages/vscode/media/icon.png"));

console.log("Web demo favicon");
copy(ICON_ON_COLOR_SVG, path.join(root, "packages/web/public/favicon.svg"));
resize(APP_ICON_PNG, 180, path.join(root, "packages/web/public/apple-touch-icon.png"));

console.log("Docs site favicon/logo");
copy(ICON_ON_COLOR_SVG, path.join(root, "packages/docs/public/favicon.svg"));
copy(APP_ICON_SVG, path.join(root, "packages/docs/public/logo.svg"));

console.log("Done.");
