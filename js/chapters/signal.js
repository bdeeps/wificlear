// Chapter 3: how far the signal goes. A router radiates in all directions, so the power per square metre
// falls with the square of distance (free-space path loss, 20*log10(d) + 20*log10(f) - 27.55 dB with d in
// metres and f in MHz). Indoors it drops faster than that, so the model uses 40 dB at 1 m (2.4 GHz) plus
// 10*n*log10(d) with n between 2 (open) and 4 (cluttered), and adds a loss for every wall the straight line
// crosses. Wall losses are rough rules of thumb (drywall about 3 dB, brick about 8, concrete about 13 at 2.4 GHz,
// a little more at 5 and 6 GHz); real walls vary a lot. The rate table is the minimum receiver sensitivity
// for 20 MHz channels, one stream (802.11ac, MCS 0-9), shifted 3 dB per doubling of channel width. Real
// devices differ by several dB and rates are theoretical link rates, not throughput.
import { THREE, M, COL, CSS, Lines, V, clamp, lerp, sphere, box, canvasTexture, fspl, BANDS, makeRouter, makeLaptop, SANS } from '../wifi.js';

const XMIN = -7, XMAX = 7, ZMIN = -4.5, ZMAX = 4.5, RX = -5.3, RZ = 0;
const WALLS = [[-1.5, ZMIN, -1.5, ZMAX], [3.2, ZMIN, 3.2, ZMAX]];
const MAT = { none: { n: 'No walls', db: 0, c: 0x8f9bb5 }, drywall: { n: 'Drywall', db: 3, c: 0xc9d3e6 }, brick: { n: 'Brick', db: 8, c: 0xff9a6b }, concrete: { n: 'Concrete', db: 13, c: 0x9aa3b2 } };
const BAND_F = { 2.4: 2.44, 5: 5.5, 6: 6.5 }, BAND_WALL = { 2.4: 1, 5: 1.2, 6: 1.3 };
const SENS = [-82, -79, -77, -74, -70, -66, -65, -64, -59, -57];
const RATE20 = [6.5, 13, 19.5, 26, 39, 52, 58.5, 65, 78, 86.7];
const MOD = ['BPSK 1/2', 'QPSK 1/2', 'QPSK 3/4', '16-QAM 1/2', '16-QAM 3/4', '64-QAM 2/3', '64-QAM 3/4', '64-QAM 5/6', '256-QAM 3/4', '256-QAM 5/6'];
const WF = { 20: 1, 40: 13.5 / 6.5, 80: 29.25 / 6.5 };
const PATH = [[-4.4, -2.9], [6.4, -2.9]];
const EIRP = 20;

const cross = (ax, az, bx, bz, cx, cz, dx, dz) => {
  const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
};
const wallsBetween = (x, z) => WALLS.filter((w) => cross(RX, RZ, x, z, w[0], w[1], w[2], w[3]));
function rssiAt(x, z, st) {
  const f = BAND_F[st.band], d = Math.max(1, Math.hypot(x - RX, z - RZ));
  const loss = fspl(1, f) + 10 * st.n * Math.log10(d) + wallsBetween(x, z).length * MAT[st.wall].db * BAND_WALL[st.band];
  return EIRP - loss;
}
function linkOf(rssi, st) {
  const shift = 3 * Math.log2(st.width / 20);
  let mcs = -1;
  for (let i = 0; i < SENS.length; i++) if (rssi >= SENS[i] + shift) mcs = i;
  return { mcs, rate: mcs < 0 ? 0 : RATE20[mcs] * WF[st.width] * st.streams };
}
const heat = (r) => (r >= -50 ? [163, 230, 53] : r >= -60 ? [150, 220, 90] : r >= -67 ? [235, 210, 70] : r >= -75 ? [255, 181, 71] : r >= -82 ? [255, 122, 89] : [40, 44, 58]);
const quality = (r) => (r >= -50 ? 'Excellent' : r >= -60 ? 'Very good' : r >= -67 ? 'Good' : r >= -75 ? 'Fair' : r >= -82 ? 'Weak' : 'No link');

export default {
  id: 'signal',
  short: 'Distance and walls',
  title: 'How far the signal goes',
  subtitle: 'Signal fades with distance and with every wall in the way.',
  view: { pos: [0, 10, 11.5], target: [0.3, 0.4, 0.3] },
  learn: `<p>A router sends its signal out in <b>every direction</b> at once. As the wave spreads over a bigger and bigger sphere, the same power is shared over more area, so the signal you receive drops with the <b>square of the distance</b>. Double the distance and you get about a quarter of the power. Engineers count in <b>decibels (dB)</b>: every 3 dB is a halving, and every 10 dB is a factor of ten.</p>
    <p><b>Walls</b> take their own toll. Drywall may cost you 3 dB, brick around 8, concrete 13 or more. And <b>higher bands lose more</b>: 5 and 6 GHz waves are shorter and are soaked up faster by walls, which is why 2.4 GHz reaches further and 6 GHz is quicker but more local.</p>
    <p>Your laptop reports the strength as <b>RSSI</b> in dBm (a negative number, closer to zero is stronger). The stronger it is above the background noise, the denser the modulation from the last chapter the radio can use, which sets the <b>link rate</b>. More antennas help too: <b>MIMO</b> sends several independent streams at once, and a wider channel carries more but needs more signal.</p>
    <p class="tip"><b>Try it:</b> walk the laptop through the house, switch the band, and then change the wall material. Watch the terrain line above the floor step down at each wall.</p>`,
  terms: [
    { t: 'dBm', d: 'A measure of power on a log scale. 0 dBm is one milliwatt. Wi-Fi signals at the receiver are tiny, from about −30 down to −90 dBm.' },
    { t: 'RSSI', d: 'Received signal strength indicator: how strong the signal is at your device.' },
    { t: 'Path loss', d: 'How much the signal weakens between the transmitter and receiver, through distance and obstacles.' },
    { t: 'MIMO', d: 'Multiple antennas at each end that send several streams at once, multiplying the rate when the signal is good.' },
  ],
  defaults: { band: '2.4', wall: 'drywall', n: 2.8, pos: 0.15, width: 20, streams: 2 },
  controls: [
    { key: 'pos', type: 'range', label: 'Where the laptop is', min: 0, max: 1, step: 0.002, fmt: (v) => ((v * (PATH[1][0] - PATH[0][0]) + PATH[0][0]) - RX).toFixed(0) + ' m from the router', ends: ['Next to it', 'Far room'] },
    { key: 'band', type: 'seg', label: 'Band', options: BANDS.map((b) => ({ v: b.id, label: b.name })) },
    { key: 'wall', type: 'seg', label: 'Walls', options: Object.entries(MAT).map(([v, m]) => ({ v, label: m.n })) },
    { key: 'n', type: 'range', label: 'Clutter', min: 2, max: 4, step: 0.05, fmt: (v) => (v < 2.4 ? 'Open space' : v < 3.2 ? 'Furnished rooms' : 'Very cluttered'), ends: ['Open', 'Cluttered'] },
    { key: 'width', type: 'seg', label: 'Channel width', options: [20, 40, 80].map((v) => ({ v, label: v + ' MHz' })) },
    { key: 'streams', type: 'seg', label: 'Antennas (MIMO streams)', options: [1, 2, 4].map((v) => ({ v, label: v + '×' + v })) },
  ],
  quiz: [
    { q: 'You double your distance from the router. About how much power is left, in free space?', options: ['Half', 'A quarter', 'A tenth', 'The same'], answer: 1, why: 'Power is spread over the surface of a sphere, whose area grows with the square of the radius.' },
    { q: 'Which band usually reaches furthest through walls?', options: ['2.4 GHz', '5 GHz', '6 GHz', 'They are all the same'], answer: 0, why: 'Longer waves lose less in walls and in free space, so 2.4 GHz carries furthest, though it is the slowest and busiest.' },
    { q: 'What does an RSSI of −80 dBm mean compared with −50 dBm?', options: ['Much stronger', 'Much weaker, about a thousand times less power', 'The same, just negative', 'Faster'], answer: 1, why: '30 dB lower is a factor of 1,000 in power.' },
    { q: 'Why does the link rate drop as you walk away?', options: ['The router slows down', 'The radio switches to sparser modulation that survives noise', 'The air gets thicker', 'Your laptop runs out of battery'], answer: 1, why: 'With a weaker signal the dots must be further apart to be read correctly, so each symbol carries fewer bits.' },
  ],
  reel: [
    { ms: 5600, caption: 'The signal spreads out, so it fades with distance, and walls take a bite out of it.', set: { band: '2.4', wall: 'brick', n: 2.8, width: 20, streams: 2 }, anim: { pos: [0.02, 1] }, view: { pos: [0, 9, 10.5], target: [0.3, 0.4, 0.3] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    const root = stage.root;
    const W = XMAX - XMIN, D = ZMAX - ZMIN, PX = 14, hw = W * PX, hd = D * PX;
    const hm = canvasTexture(hw, hd, () => {});
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: hm.tex, transparent: true, opacity: 0.92, toneMapped: false }));
    hp.rotation.x = -Math.PI / 2; hp.position.y = 0.01; root.add(hp);
    const edge = new Lines(stage, 4, { color: COL.dim, width: 1.4, opacity: 0.8 });
    const E = [[XMIN, ZMIN, XMAX, ZMIN], [XMAX, ZMIN, XMAX, ZMAX], [XMAX, ZMAX, XMIN, ZMAX], [XMIN, ZMAX, XMIN, ZMIN]];
    edge.set((i, o) => o.set([E[i][0], 0.03, E[i][1], E[i][2], 0.03, E[i][3]]));
    root.add(edge.obj);
    const wallMeshes = WALLS.map((w) => {
      const len = Math.hypot(w[2] - w[0], w[3] - w[1]);
      const m = box(0.14, 2.2, len, M.ghost(0xc9d3e6, 0.34)); m.castShadow = false; m.position.set(w[0], 1.1, (w[1] + w[3]) / 2); root.add(m); return m;
    });
    const router = makeRouter(1); router.position.set(RX, 0.02, RZ); root.add(router);
    stage.label('Router', [RX, 1.7, RZ]);
    const lap = makeLaptop(0.85); root.add(lap);
    const lblDev = stage.label('', [0, 0.95, 0], lap, 'hot');
    const prof = new Lines(stage, 90, { color: 0xffffff, width: 3 });
    const curtain = new Lines(stage, 45, { color: COL.dim, width: 1, opacity: 0.35 });
    const pathLine = new Lines(stage, 1, { color: COL.dim, width: 1.2, opacity: 0.6 });
    pathLine.set((i, o) => o.set([PATH[0][0], 0.04, PATH[0][1], PATH[1][0], 0.04, PATH[1][1]]));
    root.add(curtain.obj, prof.obj, pathLine.obj);
    const link = new Lines(stage, 1, { color: COL.hot, width: 2, opacity: 0.7 }); root.add(link.obj);
    const pulses = Array.from({ length: 7 }, () => { const p = sphere(0.07, M.glow(COL.e), 8); root.add(p); return p; });
    const marker = sphere(0.1, M.glow(0xffffff), 10); root.add(marker);
    stage.label('Signal strength along the path', [PATH[0][0] + 0.5, 2.75, PATH[0][1]], root);

    let key = '', vt = 0, shownTxt = '';
    const recompute = (st) => {
      const k = [st.band, st.wall, st.n, st.streams].join('|');
      if (k === key) return; key = k;
      router.setAntennas(st.streams);
      wallMeshes.forEach((m) => { m.visible = st.wall !== 'none'; m.material.color.setHex(MAT[st.wall].c); m.material.opacity = st.wall === 'concrete' ? 0.55 : st.wall === 'brick' ? 0.5 : 0.3; });
      const g = hm.canvas.getContext('2d'), img = g.createImageData(hw, hd);
      for (let j = 0; j < hd; j++) for (let i = 0; i < hw; i++) {
        const x = XMIN + (i + 0.5) / PX, z = ZMIN + (j + 0.5) / PX, c = heat(rssiAt(x, z, st)), o = (j * hw + i) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = c[0] === 40 ? 150 : 200;
      }
      g.putImageData(img, 0, 0); hm.tex.needsUpdate = true;
      const hy = (r) => 0.12 + clamp((r + 95) / 65, 0, 1) * 2.3;
      prof.setPoly((i, o) => { const u = i / 90, x = lerp(PATH[0][0], PATH[1][0], u), z = PATH[0][1]; o[0] = x; o[1] = hy(rssiAt(x, z, st)); o[2] = z; }, 91);
      curtain.set((i, o) => { const u = i / 45, x = lerp(PATH[0][0], PATH[1][0], u), z = PATH[0][1]; o.set([x, 0.05, z, x, hy(rssiAt(x, z, st)), z]); });
    };
    const hyf = (r) => 0.12 + clamp((r + 95) / 65, 0, 1) * 2.3;
    return {
      update(dt, st) {
        vt += dt;
        recompute(st);
        const x = lerp(PATH[0][0], PATH[1][0], st.pos), z = PATH[0][1];
        const r = rssiAt(x, z, st), L = linkOf(r, st), crossed = wallsBetween(x, z);
        lap.position.set(x, 0.02, z); lap.rotation.y = Math.PI * 0.5 + 0.35;
        const col = r >= -67 ? COL.ok : r >= -75 ? COL.hot : COL.bad;
        lap.screen.material.color.setHex(L.mcs < 0 ? 0x30384a : 0x2a6df4);
        marker.position.set(x, hyf(r), z); marker.material.color.setHex(col);
        link.mat.color.setHex(col); link.set((i, o) => o.set([RX, 0.9, RZ, x, 0.6, z]));
        wallMeshes.forEach((m, i) => { m.material.color.setHex(crossed.includes(WALLS[i]) ? COL.hot : MAT[st.wall].c); });
        const q = clamp((r + 95) / 60, 0, 1);
        pulses.forEach((p, i) => { const u = (vt * 0.5 + i / pulses.length) % 1; p.position.set(lerp(RX, x, u), lerp(0.9, 0.6, u), lerp(RZ, z, u)); p.scale.setScalar(Math.max(0.15, (1 - u * (1 - q)) * 0.9 + 0.1)); p.material.color.setHex(col); p.visible = L.mcs >= 0 || u < 0.5; });
        const txt = `${r.toFixed(0)} dBm`;
        if (txt !== shownTxt) { shownTxt = txt; lblDev.element.textContent = txt; }
      },
      readout(st) {
        const x = lerp(PATH[0][0], PATH[1][0], st.pos), z = PATH[0][1];
        const r = rssiAt(x, z, st), L = linkOf(r, st), n = wallsBetween(x, z).length;
        const col = r >= -67 ? CSS.ok : r >= -75 ? CSS.hot : CSS.bad;
        const rate = L.mcs < 0 ? 'No link' : (L.rate >= 1000 ? (L.rate / 1000).toFixed(2) + ' Gbit/s' : L.rate.toFixed(0) + ' Mbit/s');
        return `<div class="big" style="color:${col}">${r.toFixed(0)} dBm</div><p class="r-say">${quality(r)} · ${n} wall${n === 1 ? '' : 's'} in the way</p>
          <div class="row"><span>Distance</span><b>${Math.hypot(x - RX, z - RZ).toFixed(1)} m</b></div>
          <div class="row"><span>Modulation chosen</span><b>${L.mcs < 0 ? '—' : MOD[L.mcs]}</b></div>
          <div class="row"><span>Link rate (theoretical)</span><b>${rate}</b></div>`;
      },
    };
  },
};
