// Shared parts for WifiClear: colours, radio maths, deterministic noise, fat-line sets, and small
// models of a router, a laptop and a phone.
import { THREE, M, sphere, box, clamp, lerp, smooth, canvasTexture } from './kit.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export { THREE, M, sphere, box, clamp, lerp, smooth, canvasTexture };
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const COL = { e: 0x8ef0ff, b: 0xc49bff, hot: 0xffb547, ok: 0xa3e635, bad: 0xff7a59, dim: 0x8f9bb5, white: 0xe9eef8 };
export const CSS = { e: '#8ef0ff', b: '#c49bff', hot: '#ffb547', ok: '#a3e635', bad: '#ff7a59', dim: '#8f9bb5', white: '#e9eef8' };

// Deterministic noise: the same number in gives the same number out, so frames are repeatable.
export const hash = (n) => { let t = (n | 0) + 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const gauss = (n) => Math.sqrt(-2 * Math.log(Math.max(1e-9, hash(2 * n + 1)))) * Math.cos(2 * Math.PI * hash(2 * n + 2));

// Radio maths. Frequencies are in GHz.
export const lambdaCm = (fGHz) => 29.9792458 / fGHz;
export const fspl = (dMetres, fGHz) => 20 * Math.log10(Math.max(dMetres, 0.01)) + 20 * Math.log10(fGHz * 1000) - 27.55;
export const BANDS = [
  { id: '2.4', f: 2.44, name: '2.4 GHz', lo: 2.4, hi: 2.4835, color: CSS.ok },
  { id: '5', f: 5.5, name: '5 GHz', lo: 5.15, hi: 5.895, color: CSS.hot },
  { id: '6', f: 6.5, name: '6 GHz', lo: 5.925, hi: 7.125, color: CSS.b },
];
export const bandOf = (f) => BANDS.find((b) => f >= b.lo - 1e-6 && f <= b.hi + 1e-6) || null;

// Many segments in one fat line. fn(i, out) fills out[0..5] with the two ends of segment i.
export class Lines {
  constructor(stage, count, { color = COL.white, width = 1.6, opacity = 1 } = {}) {
    this.n = count;
    this.geo = new LineSegmentsGeometry();
    this.geo.setPositions(new Float32Array(Math.max(1, count) * 6).fill(0.0001));
    this.mat = stage.lineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, worldUnits: false });
    this.obj = new LineSegments2(this.geo, this.mat);
    this.obj.frustumCulled = false;
    this.arr = new Float32Array(Math.max(1, count) * 6);
    this.out = new Float32Array(6);
  }
  set(fn, count = this.n) {
    const a = this.arr, o = this.out; let c = 0;
    for (let i = 0; i < count; i++) {
      if (fn(i, o) === false) continue;
      a.set(o, c * 6); c++;
    }
    const buf = this.geo.attributes.instanceStart.data;
    buf.array.set(a); buf.needsUpdate = true;
    this.geo.instanceCount = c;
  }
  // A polyline through n points: pt(i, out3) fills x, y, z.
  setPoly(pt, n = this.n + 1) {
    const p = (this._p ||= new Float32Array(3)), q = (this._q ||= new Float32Array(3));
    let have = false;
    this.set((i, o) => {
      if (!have) { pt(i, p); have = true; }
      pt(i + 1, q);
      o[0] = p[0]; o[1] = p[1]; o[2] = p[2]; o[3] = q[0]; o[4] = q[1]; o[5] = q[2];
      p[0] = q[0]; p[1] = q[1]; p[2] = q[2];
    }, n - 1);
  }
}

// ---------------------------------------------------------------- devices
export function makeRouter(scale = 1) {
  const g = new THREE.Group();
  const body = box(1.5, 0.2, 0.95, M.plastic(0x232830)); body.position.y = 0.1;
  const top = box(1.5, 0.02, 0.95, M.plastic(0x2f3540)); top.position.y = 0.205;
  g.add(body, top);
  g.leds = [];
  for (let i = 0; i < 4; i++) {
    const l = sphere(0.032, M.glow(0x3a4352), 10); l.position.set(-0.45 + i * 0.22, 0.12, 0.48); g.add(l); g.leds.push(l);
  }
  g.antennas = [];
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Group();
    const rodm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 1, 10), M.plastic(0x15181e));
    rodm.position.y = 0.5; rodm.castShadow = true;
    const tip = sphere(0.05, M.glow(COL.e), 10); tip.position.y = 1.02;
    a.add(rodm, tip);
    a.position.set(-0.62 + i * 0.41, 0.2, -0.38);
    a.rotation.z = (i - 1.5) * -0.12;
    g.add(a); g.antennas.push(a);
  }
  g.setAntennas = (n) => g.antennas.forEach((a, i) => { a.visible = i < n; a.position.x = n === 1 ? 0 : -0.6 + i * (1.2 / (n - 1)); a.rotation.z = n === 1 ? 0 : (i - (n - 1) / 2) * -0.14; });
  g.setLed = (color, on = true) => g.leds.forEach((l) => l.material.color.setHex(on ? color : 0x3a4352));
  g.scale.setScalar(scale);
  g.setAntennas(2);
  return g;
}

export function makeLaptop(scale = 1, screenColor = 0x2a6df4) {
  const g = new THREE.Group();
  const base = box(0.95, 0.04, 0.62, M.metal(0xaeb4c0, { roughness: 0.4 })); base.position.y = 0.02;
  const hinge = new THREE.Group(); hinge.position.set(0, 0.04, -0.31);
  const lid = box(0.95, 0.62, 0.03, M.metal(0xaeb4c0, { roughness: 0.4 })); lid.position.y = 0.31;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.54), M.glow(screenColor)); screen.position.set(0, 0.31, 0.017);
  hinge.add(lid, screen); hinge.rotation.x = -0.28;
  g.add(base, hinge);
  g.screen = screen;
  g.scale.setScalar(scale);
  return g;
}

export function makePhone(scale = 1, color = 0x3a3f4a) {
  const g = new THREE.Group();
  const b = box(0.2, 0.02, 0.4, M.plastic(color)); b.position.y = 0.01;
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.35), M.glow(0x2a6df4)); sc.rotation.x = -Math.PI / 2; sc.position.y = 0.0215;
  g.add(b, sc); g.screen = sc;
  g.scale.setScalar(scale);
  return g;
}

// A flat card with text, for packets and panels.
export function cardTexture(w, h, draw) { return canvasTexture(w, h, draw); }
export const MONO = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
export const SANS = '"Geist", system-ui, -apple-system, sans-serif';
