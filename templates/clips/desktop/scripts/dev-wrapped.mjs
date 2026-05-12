#!/usr/bin/env node
// Dev runner that wraps the Tauri debug binary in a minimal Clips.app skeleton
// so macOS TCC honors the privacy usage strings in Info.plist (camera, mic,
// screen capture, speech recognition, accessibility). `tauri dev` launches a
// bare Mach-O which TCC refuses to grant permissions to, so the app crashes on
// first privacy-sensitive call. Wrapping it in a real .app + ad-hoc codesign
// gets us a stable bundle id that TCC can attach grants to.
//
// Trade-off: Rust changes require Ctrl-C and rerun. Frontend (Vite) hot-reloads
// normally because the .app loads from the dev server URL.

import { spawn, spawnSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const srcTauri = resolve(root, "src-tauri");
const targetDebug = resolve(srcTauri, "target/debug");
const binary = resolve(targetDebug, "Clips");
const appPath = resolve(targetDebug, "Clips.app");
const infoPlistSrc = resolve(srcTauri, "Info.plist");

function log(msg) {
  process.stdout.write(`[dev-wrapped] ${msg}\n`);
}

function killExisting() {
  spawnSync("pkill", ["-x", "Clips"], { stdio: "ignore" });
}

function buildBinary() {
  log("Building Tauri debug binary (cargo build)...");
  const result = spawnSync("cargo", ["build"], {
    cwd: srcTauri,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`cargo build exited with code ${result.status}`);
  }
  if (!existsSync(binary)) {
    throw new Error(`Expected binary at ${binary} after cargo build`);
  }
}

function wrapApp() {
  log(`Wrapping ${binary} into ${appPath}`);
  rmSync(appPath, { recursive: true, force: true });
  mkdirSync(resolve(appPath, "Contents/MacOS"), { recursive: true });
  mkdirSync(resolve(appPath, "Contents/Resources"), { recursive: true });

  // Symlink the live debug binary so subsequent cargo rebuilds flow through
  // without re-wrapping.
  symlinkSync(binary, resolve(appPath, "Contents/MacOS/Clips"));

  // Take the source Info.plist (which already declares the privacy usage
  // strings) and inject the bundle keys macOS needs for a launchable .app.
  const sourcePlist = readFileSync(infoPlistSrc, "utf8");
  const bundleKeys = `
    <key>CFBundleExecutable</key>
    <string>Clips</string>
    <key>CFBundleIdentifier</key>
    <string>com.clips.tray</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleName</key>
    <string>Clips</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.1-dev</string>
    <key>CFBundleVersion</key>
    <string>0.1.1-dev</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>LSUIElement</key>
    <true/>
`;
  const merged = sourcePlist.replace("<dict>", `<dict>${bundleKeys}`);
  writeFileSync(resolve(appPath, "Contents/Info.plist"), merged);
}

function codesignApp() {
  log("Ad-hoc codesigning the dev .app (required for TCC bundle id)...");
  const entitlements = resolve(srcTauri, "Entitlements.plist");
  const args = [
    "--force",
    "--deep",
    "--sign",
    "-",
    "--timestamp=none",
    "--options",
    "runtime",
  ];
  if (existsSync(entitlements)) {
    args.push("--entitlements", entitlements);
  }
  args.push(appPath);
  const res = spawnSync("codesign", args, { stdio: "inherit" });
  if (res.status !== 0) {
    log("codesign failed — continuing anyway, but TCC may still reject grants");
  }
}

function launchApp() {
  killExisting();
  log(`Launching ${appPath}...`);
  spawnSync("open", ["-W", "--background", appPath], { stdio: "ignore" });
  // Open without blocking — `open` returns immediately for .app launches.
  spawnSync("open", [appPath], { stdio: "inherit" });
}

function startVite() {
  log("Starting Vite dev server (frontend hot-reload)...");
  const child = spawn("pnpm", ["vite:dev"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  child.on("exit", (code, signal) => {
    log(`Vite exited (code=${code} signal=${signal}). Shutting down.`);
    cleanup();
    process.exit(code ?? 0);
  });
  return child;
}

let vite;
let shuttingDown = false;
function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  killExisting();
  try {
    vite?.kill("SIGTERM");
  } catch {}
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(sig, () => {
    cleanup();
    process.exit(0);
  });
}

try {
  vite = startVite();
  buildBinary();
  wrapApp();
  codesignApp();
  launchApp();
  log("Ready. Frontend hot-reloads via Vite. Rust changes: Ctrl-C and rerun.");
} catch (err) {
  log(`Failed: ${err.message}`);
  cleanup();
  process.exit(1);
}
