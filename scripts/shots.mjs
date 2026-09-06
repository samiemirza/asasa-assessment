// Phone-viewport screenshots through the Chrome DevTools Protocol (no extra dependencies).
// Usage: node scripts/shots.mjs <outDir> <baseUrl> <path>[=name] ...   e.g. node scripts/shots.mjs /tmp/shots http://localhost:3000 / /history
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, base, ...paths] = process.argv.slice(2);
if (!outDir || !base || paths.length === 0) {
  console.error("usage: node scripts/shots.mjs <outDir> <baseUrl> <path>[=name] ...");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333 + Math.floor(Math.random() * 500);
const desktop = process.env.DESKTOP === "1";
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, ".chrome-profile")}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
let seq = 0;
const pending = new Map();
const events = [];
function send(method, params = {}, sessionId) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
function waitEvent(name, sessionId) {
  return new Promise((resolve) => events.push({ name, sessionId, resolve }));
}

try {
  let version;
  for (let i = 0; i < 50 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(200); }
  }
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    } else if (msg.method) {
      for (let i = events.length - 1; i >= 0; i--) {
        const e = events[i];
        if (e.name === msg.method && (!e.sessionId || e.sessionId === msg.sessionId)) { events.splice(i, 1); e.resolve(msg.params); }
      }
    }
  };
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", desktop
    ? { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }
    : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId);

  for (const spec of paths) {
    const [path, nameRaw] = spec.split("=");
    const name = nameRaw ?? (path === "/" ? "home" : path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-"));
    const loaded = waitEvent("Page.loadEventFired", sessionId);
    await send("Page.navigate", { url: base.replace(/\/$/, "") + path }, sessionId);
    await loaded;
    await sleep(1200);
    const { cssContentSize } = await send("Page.getLayoutMetrics", {}, sessionId);
    const height = Math.ceil(cssContentSize.height);
    const width = desktop ? 1280 : 390;
    await send("Emulation.setDeviceMetricsOverride", { width, height: Math.max(desktop ? 900 : 844, height), deviceScaleFactor: desktop ? 1 : 2, mobile: !desktop }, sessionId);
    await sleep(200);
    const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
    const file = join(outDir, `${name}.png`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(`${file}  ${width}x${height}`);
  }
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  chrome.kill();
}
