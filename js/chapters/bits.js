// Chapter 2: putting bits on a wave. The router nudges the height and timing (phase) of a steady carrier
// wave. Each distinct nudge is a symbol, drawn as a dot on a constellation: BPSK has two dots (1 bit per
// symbol), QPSK four (2), 16-QAM sixteen (4), and so on up to 1024-QAM (10 bits) in Wi-Fi 6.
// The noise is simple Gaussian noise added to each symbol; the error counts come from a small simulation
// of 800 symbols, so they show the shape of the trade-off, not exact figures for any real radio.
// The rate row uses the 802.11a recipe (48 data subcarriers, 4 microsecond symbols, 3/4 coding).
import { THREE, M, COL, CSS, Lines, clamp, sphere, canvasTexture, hash, gauss, MONO, SANS } from '../wifi.js';
import { swarm } from '../kit.js';

const SCHEMES = [
  { id: 'bpsk', n: 'BPSK', b: 1 }, { id: 'qpsk', n: 'QPSK', b: 2 }, { id: 'qam16', n: '16-QAM', b: 4 },
  { id: 'qam64', n: '64-QAM', b: 6 }, { id: 'qam256', n: '256-QAM', b: 8 }, { id: 'qam1024', n: '1024-QAM', b: 10 },
];
const byId = (id) => SCHEMES.find((x) => x.id === id) || SCHEMES[2];
const gray = (g) => { let n = 0; for (; g; g >>= 1) n ^= g; return n; };
const levels = (b) => (b === 1 ? 2 : 1 << (b / 2));
function pos(b, sIdx) {
  if (b === 1) return [sIdx ? 1 : -1, 0];
  const h = b / 2, L = 1 << h, ib = sIdx >> h, qb = sIdx & (L - 1);
  const c = (g) => (2 * gray(g) - (L - 1)) / (L - 1);
  return [c(ib), c(qb)];
}
const power = (b) => { const L = levels(b), p = (L + 1) / (3 * (L - 1)); return b === 1 ? 1 : 2 * p; };
const sigma = (b, snr) => Math.sqrt(power(b) / Math.pow(10, snr / 10) / 2);
const symAt = (n, b) => Math.floor(hash(n * 7 + 3) * (1 << b));
const decide = (v, L) => clamp(Math.round((v * (L - 1) + (L - 1)) / 2), 0, L - 1);
const serCache = new Map();
function ser(b, snr) {
  const key = b + '|' + snr.toFixed(1);
  if (serCache.has(key)) return serCache.get(key);
  const L = levels(b), sg = sigma(b, snr); let bad = 0;
  for (let n = 0; n < 800; n++) {
    const sIdx = symAt(n + 5000, b), [x, y] = pos(b, sIdx);
    const rx = x + sg * gauss(n * 2), ry = y + sg * gauss(n * 2 + 1);
    const okI = decide(rx, L) === decide(x, L), okQ = b === 1 ? true : decide(ry, L) === decide(y, L);
    if (!(okI && okQ)) bad++;
  }
  serCache.set(key, bad); return bad;
}

const XW0 = -6.3, XW1 = 0.7, YW = 2.55, W = 6, CPS = 2.5, NP = 520, CS = 4.0, CX = 4.2, CY = 2.5;

export default {
  id: 'bits',
  short: 'Bits on a wave',
  title: 'Nudging the wave to carry bits',
  subtitle: 'From BPSK to 1024-QAM: more dots, more bits, less tolerance for noise.',
  view: { pos: [-0.2, 3.4, 14.6], target: [-0.2, 1.9, 0] },
  learn: `<p>A plain wave carries no message. To send data the router <b>modulates</b> a steady <b>carrier wave</b>: it changes the wave’s <b>height</b> (amplitude) or its <b>timing</b> (phase) for a short moment. Each distinct nudge is a <b>symbol</b>, and the receiver measures the nudge and looks up which bits it stands for.</p>
    <p>The simplest scheme, <b>BPSK</b>, flips the wave upside down or leaves it alone. That is two symbols and <b>one bit</b>. <b>QAM</b> changes height and timing together. The receiver sees each symbol as a dot on a <b>constellation</b>: 16-QAM has 16 dots and carries <b>4 bits</b> per symbol, 1024-QAM has 1,024 dots and carries <b>10</b>.</p>
    <p>The catch is noise. Every bit of hiss moves the received dot a little. When the dots are close together, a nudge of noise lands a symbol on its neighbour and the bits are wrong. So a router sends <b>fast, dense</b> symbols when your signal is clean and falls back to <b>slow, sparse</b> ones when it is not.</p>
    <p class="tip"><b>Try it:</b> pick 64-QAM, then slide the signal-to-noise ratio down and watch the green dots blur across the grid.</p>`,
  terms: [
    { t: 'Modulation', d: 'Changing a steady carrier wave, in height or timing, so that it carries information.' },
    { t: 'Symbol', d: 'One distinct nudge of the wave. Each symbol stands for a few bits.' },
    { t: 'Constellation', d: 'A map of all the possible symbols, as dots. The receiver picks the nearest dot to what it measured.' },
    { t: 'SNR', d: 'Signal-to-noise ratio: how much stronger the signal is than the background hiss, in decibels.' },
  ],
  defaults: { scheme: 'qam16', snr: 30, rate: 1.4 },
  controls: [
    { key: 'scheme', type: 'seg', label: 'Scheme', options: SCHEMES.map((x) => ({ v: x.id, label: x.n })), fmt: (v) => byId(v).b + (byId(v).b === 1 ? ' bit' : ' bits') + ' per symbol' },
    { key: 'snr', type: 'range', label: 'Signal-to-noise ratio', min: 5, max: 45, step: 0.1, fmt: (v) => v.toFixed(0) + ' dB', ends: ['Noisy', 'Clean'] },
    { key: 'rate', type: 'range', label: 'Symbol speed', min: 0.4, max: 3, step: 0.01, fmt: (v) => v.toFixed(1) + '×' },
  ],
  quiz: [
    { q: 'How does a router put bits on a radio wave?', options: ['It turns the wave on and off once a second', 'It nudges the wave’s height and timing', 'It shouts louder', 'It changes the speed of the wave'], answer: 1, why: 'Modulation changes the amplitude and phase of a carrier. Each nudge is a symbol that stands for some bits.' },
    { q: 'How many bits does one 64-QAM symbol carry?', options: ['2', '4', '6', '64'], answer: 2, why: '64 = 2⁶ dots, so each symbol picks one of 64 and carries 6 bits.' },
    { q: 'Why does a weak signal make the router use simpler modulation?', options: ['Simple modulation is louder', 'Noise blurs the dots, and dense dots get confused with each other', 'The law requires it', 'Dense modulation uses more power'], answer: 1, why: 'With noise the received dot moves. Dots that are far apart survive it, closely spaced ones do not.' },
    { q: 'You get a clean signal. What can the router do?', options: ['Use denser modulation and send more bits per symbol', 'Send fewer bits', 'Stop sending', 'Change the speed of light'], answer: 0, why: 'High SNR lets it use many closely spaced dots, so every symbol carries more bits.' },
  ],
  reel: [
    { ms: 5600, caption: 'To send data, nudge the wave. More dots means more bits per symbol, but noise blurs them together.', set: { scheme: 'qam256', rate: 1.2 }, anim: { snr: [44, 22] }, view: { pos: [-0.2, 3.2, 12.2], target: [-0.2, 2.2, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = false;
    const root = stage.root;
    const cx = (XW0 + XW1) / 2, wW = XW1 - XW0;
    const wave = new Lines(stage, NP, { color: COL.e, width: 3 });
    const now = new Lines(stage, 120, { color: COL.hot, width: 4.5 });
    const ticks = new Lines(stage, W + 2, { color: COL.dim, width: 1, opacity: 0.55 });
    const axis = new Lines(stage, 1, { color: COL.dim, width: 1, opacity: 0.5 });
    axis.set((i, o) => o.set([XW0, YW, 0, XW1, YW, 0]));
    root.add(ticks.obj, axis.obj, wave.obj, now.obj);

    const strip = canvasTexture(1640, 190, () => {});
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(wW, wW * 190 / 1640), new THREE.MeshBasicMaterial({ map: strip.tex, transparent: true, toneMapped: false }));
    sp.position.set(cx, 0.45, 0); root.add(sp);
    stage.label('Bits to send', [XW0 + 0.9, 1.15, 0]);
    stage.label('The wave: height and timing carry the bits', [cx, -0.35, 0], root, 'hot');

    const cons = canvasTexture(560, 560, (g, w, h) => {
      g.fillStyle = 'rgba(8,10,16,0.88)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2c3344'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
      g.strokeStyle = '#3b4358'; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.moveTo(20, h / 2); g.lineTo(w - 20, h / 2); g.stroke();
      g.fillStyle = CSS.dim; g.font = `600 24px ${SANS}`; g.fillText('Q  (timing, 90° shifted)', w / 2 + 10, 38); g.textAlign = 'right'; g.fillText('I  (height)', w - 22, h / 2 - 12);
    });
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(CS, CS), new THREE.MeshBasicMaterial({ map: cons.tex, transparent: true, toneMapped: false }));
    cp.position.set(CX, CY, 0); root.add(cp);
    stage.label('Constellation: every dot is one symbol', [CX, CY + CS / 2 + 0.3, 0]);

    const dots = swarm(1024, new THREE.SphereGeometry(1, 8, 6), M.glow(0x5e6a85)); dots.frustumCulled = false; dots.position.set(CX, CY, 0.04); root.add(dots);
    const got = swarm(60, new THREE.SphereGeometry(1, 8, 6), M.glow(COL.ok)); got.frustumCulled = false; got.position.set(CX, CY, 0.07); root.add(got);
    const cur = sphere(1, M.glow(0xffffff), 12); cur.position.z = 0.1; cur.material.transparent = true; cur.material.opacity = 0.9; got.parent.add(cur);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), M.glow(COL.hot, { side: THREE.DoubleSide })); ring.position.z = 0.09; root.add(ring);

    const R = CS / 2 - 0.4;
    let last = null, T = 6, sg = 0.1, curB = 4;
    const rebuild = (b) => {
      const M2 = 1 << b, L = levels(b), sp2 = b === 1 ? 1 : 2 / (L - 1);
      dots.userData.r = clamp(sp2 * R * 0.12, 0.016, 0.07);
      for (let i = 0; i < 1024; i++) {
        if (i < M2) { const [x, y] = pos(b, i); dots.place(i, [x * R, y * R, 0], null, dots.userData.r); } else dots.place(i, [0, 0, 0], null, 0.0001);
      }
      dots.done();
    };
    const drawStrip = (b) => {
      strip.redraw = strip.redraw; // keep reference
      const g = strip.canvas.getContext('2d'), w = 1640, h = 190, cell = w / W;
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(8,10,16,0.82)'; g.fillRect(0, 0, w, h);
      const n0 = Math.floor(T - W), off = (T - W - n0) * cell;
      g.textAlign = 'center';
      for (let k = 0; k <= W; k++) {
        const n = n0 + k, x0 = k * cell - off;
        const isNow = n === Math.floor(T);
        g.fillStyle = isNow ? 'rgba(255,181,71,0.16)' : (k % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.0)'); g.fillRect(x0, 0, cell, h);
        g.strokeStyle = '#2c3344'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, h); g.stroke();
        const bits = symAt(n, b).toString(2).padStart(b, '0');
        g.fillStyle = isNow ? '#ffb547' : '#e9eef8'; g.font = `600 ${b > 6 ? 30 : 38}px ${MONO}`;
        const half = Math.ceil(bits.length / 2);
        if (bits.length > 4) { g.fillText(bits.slice(0, half), x0 + cell / 2, 78); g.fillText(bits.slice(half), x0 + cell / 2, 128); } else g.fillText(bits, x0 + cell / 2, 100);
      }
      strip.tex.needsUpdate = true;
    };

    return {
      update(dt, st) {
        T += dt * st.rate;
        const sc = byId(st.scheme), b = sc.b;
        if (sc.id !== last) { last = sc.id; curB = b; rebuild(b); }
        sg = sigma(b, st.snr);
        const norm = 0.78;
        const wval = (u) => {
          const n = Math.floor(u), [I, Q] = pos(b, symAt(n, b)), ph = 2 * Math.PI * CPS * u;
          return (I * Math.cos(ph) - Q * Math.sin(ph) + sg * 0.55 * gauss(Math.floor(u * 40) + 91)) * norm;
        };
        const ux = (u) => XW0 + ((u - (T - W)) / W) * wW;
        wave.setPoly((i, o) => { const u = T - W + (W * i) / NP; o[0] = ux(u); o[1] = YW + wval(u); o[2] = 0; }, NP + 1);
        const nb = Math.floor(T);
        now.setPoly((i, o) => { const u = nb + ((T - nb) * i) / 120; o[0] = ux(u); o[1] = YW + wval(u); o[2] = 0.02; }, 121);
        ticks.set((i, o) => { const u = Math.floor(T - W) + i + 1; o.set([ux(u), YW - 1.25, 0, ux(u), YW + 1.25, 0]); if (ux(u) < XW0 - 0.01 || ux(u) > XW1 + 0.01) return false; }, W + 1);
        drawStrip(b);
        // constellation: the last 60 symbols as received, with noise
        for (let k = 0; k < 60; k++) {
          const n = nb - k, [x, y] = pos(b, symAt(n, b));
          const rx = x + sg * gauss(n * 2 + 11), ry = (b === 1 ? 0 : y) + sg * gauss(n * 2 + 12);
          got.place(k, [clamp(rx, -1.6, 1.6) * R, clamp(ry, -1.6, 1.6) * R, 0], null, k === 0 ? 0.0001 : Math.max(0.012, (dots.userData.r + 0.012) * (1 - k / 90)));
        }
        got.done();
        const [ix, iy] = pos(b, symAt(nb, b));
        const nrx = ix + sg * gauss(nb * 2 + 11), nry = (b === 1 ? 0 : iy) + sg * gauss(nb * 2 + 12);
        cur.position.set(CX + clamp(nrx, -1.6, 1.6) * R, CY + clamp(nry, -1.6, 1.6) * R, 0.1); cur.scale.setScalar(Math.max(0.04, dots.userData.r * 1.9));
        ring.position.set(CX + ix * R, CY + iy * R, 0.09); ring.scale.setScalar(Math.max(0.07, dots.userData.r * 3.4 + 0.02 * Math.sin(T * 9)));
      },
      readout(st) {
        const sc = byId(st.scheme), bad = ser(sc.b, st.snr), pct = (bad / 8);
        const mbit = (48 * sc.b * 0.75) / 4;
        return `<div class="big">${sc.n}</div>
          <div class="row"><span>Dots in the constellation</span><b>${1 << sc.b}</b></div>
          <div class="row"><span>Bits per symbol</span><b>${sc.b}</b></div>
          <div class="row"><span>Symbols read wrongly</span><b style="color:${pct < 1 ? CSS.ok : pct < 10 ? CSS.hot : CSS.bad}">${pct.toFixed(pct < 10 ? 1 : 0)}%</b></div>
          <div class="row"><span>Rate, 802.11a-style channel</span><b>${mbit % 1 ? mbit.toFixed(1) : mbit} Mbit/s</b></div>
          <p class="r-say">${pct < 1 ? 'The dots stay apart. A clean read.' : pct < 10 ? 'Some dots are landing on a neighbour.' : 'Too much noise for this many dots. A real router would drop to a simpler scheme.'}</p>`;
      },
    };
  },
};
