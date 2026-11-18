// Chapter 4: sharing the air. Only one device on a channel can talk at a time, so Wi-Fi uses CSMA/CA
// (carrier sense multiple access with collision avoidance, the DCF in 802.11): listen, wait a random
// number of 9 microsecond slots (the backoff), send, and if the acknowledgement does not come, double the
// range the random wait is drawn from. This is a simplified round-by-round model: every device always has
// something to send, all devices hear each other (no hidden nodes), a whole frame exchange takes 500 us,
// DIFS is 34 us, and the contention window runs from 15 to 1023 slots (the 802.11a/g/n values).
// A neighbour on the same channel joins the contest; one on a partly overlapping channel cannot be
// heard, so it simply corrupts about 40% of frames (an assumption, to show why 1, 6 and 11 are used).
import { THREE, M, COL, CSS, Lines, V, clamp, sphere, box, canvasTexture, hash, makeRouter, makePhone, SANS } from '../wifi.js';

const SLOT = 9, DIFS = 34, TF = 500, CWMIN = 15, CWMAX = 1023, NB = 3, NBCH = 1;
const PAL = [0xff7a59, 0x8ef0ff, 0xa3e635, 0xc49bff, 0xffb547, 0xff6fb5, 0x5ec2ff, 0xe9d36a, 0x7ee0b0, 0xb39cff];
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const GREY = 0x8f9bb5;
const RAD = 3.5, NBX = 8.6;
const mode = (ch) => (ch === NBCH ? 'same' : Math.abs(ch - NBCH) < 5 ? 'overlap' : 'apart');

function drawChannels(g, w, h, ch) {
  g.fillStyle = 'rgba(8,10,16,0.84)'; g.fillRect(0, 0, w, h);
  const fx = (f) => 40 + ((f - 2400) / 95) * (w - 80), base = h - 52;
  g.strokeStyle = '#2c3344'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, base); g.lineTo(w - 30, base); g.stroke();
  const bell = (c, fill, stroke, lw = 3) => {
    const fc = c === 14 ? 2484 : 2412 + 5 * (c - 1);
    g.beginPath(); g.moveTo(fx(fc - 11), base);
    for (let k = 0; k <= 24; k++) { const f = fc - 11 + (22 * k) / 24; g.lineTo(fx(f), base - (h - 100) * Math.sin((Math.PI * k) / 24) ** 0.8); }
    g.lineTo(fx(fc + 11), base); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    g.strokeStyle = stroke; g.lineWidth = lw; g.stroke();
  };
  for (let c = 1; c <= 14; c++) bell(c, null, 'rgba(143,155,181,0.35)', 1.5);
  bell(NBCH, 'rgba(143,155,181,0.28)', CSS.dim, 3);
  bell(ch, 'rgba(163,230,53,0.30)', CSS.ok, 4);
  g.font = `600 22px ${SANS}`; g.textAlign = 'center';
  for (let c = 1; c <= 14; c++) { const fc = c === 14 ? 2484 : 2412 + 5 * (c - 1); g.fillStyle = [1, 6, 11].includes(c) ? '#e9eef8' : CSS.dim; g.fillText(c, fx(fc), base + 28); }
  g.textAlign = 'left'; g.fillStyle = CSS.dim; g.font = `500 21px ${SANS}`;
  g.fillText('2.4 GHz channel number (5 MHz apart, each one about 20 MHz wide)', 40, base + 48);
  g.fillStyle = CSS.ok; g.fillText('your network: channel ' + ch, 40, 30);
  g.fillStyle = CSS.dim; g.fillText('neighbour: channel ' + NBCH, 360, 30);
}

export default {
  id: 'air',
  short: 'Sharing the air',
  title: 'Taking turns on the air',
  subtitle: 'Listen, wait a random time, then talk. Collisions double the wait.',
  view: { pos: [3.6, 8.6, 13.6], target: [3.6, 1.2, -0.6] },
  learn: `<p>The air is shared by <b>everyone on the same channel</b>. If two devices transmit at once, their waves add up into garbage and both frames are lost. A router cannot easily listen while it talks, so Wi-Fi does not detect collisions. It tries to <b>avoid</b> them.</p>
    <p>The rule is <b>CSMA/CA</b>. A device with something to send <b>listens</b> first. If the air is quiet it picks a random number of tiny time slots (each 9 millionths of a second) and counts them down, pausing whenever someone else talks. The first to reach zero sends. The receiver replies with a short <b>acknowledgement</b>. If none arrives, the sender assumes a collision, <b>doubles</b> the range its random wait is drawn from, and tries again.</p>
    <p>More devices means more waiting and more collisions, so each gets a smaller slice. The 2.4 GHz band has 14 channel numbers but they overlap, so only <b>1, 6 and 11</b> are clear of each other. A neighbour on the same channel shares your air. A neighbour on a <b>partly overlapping</b> channel is worse: you cannot hear their frames well enough to wait, but they still scramble yours.</p>
    <p class="tip"><b>Try it:</b> add devices and watch the airtime strip fill with red collisions. Then move your channel on top of the neighbour’s, and next to it.</p>`,
  terms: [
    { t: 'CSMA/CA', d: 'Listen before talking, wait a random time, and double the wait after a failure. Wi-Fi’s way of avoiding collisions.' },
    { t: 'Backoff', d: 'The random number of slots a device counts down before sending.' },
    { t: 'Channel', d: 'A slice of a band, about 20 MHz wide in the 2.4 GHz band, that one network uses at a time.' },
    { t: 'Interference', d: 'Any other signal on or near your channel that garbles your frames: a neighbour, a microwave oven, a Bluetooth speaker.' },
  ],
  defaults: { n: 4, ch: 6, speed: 1 },
  controls: [
    { key: 'n', type: 'range', label: 'Devices on your network', min: 1, max: 10, step: 1, fmt: (v) => v + (v === 1 ? ' device' : ' devices') },
    { key: 'ch', type: 'seg', label: 'Your channel', options: [1, 3, 6, 11].map((v) => ({ v, label: String(v) })), fmt: (v) => ({ same: 'Same as the neighbour’s', overlap: 'Overlaps the neighbour’s', apart: 'Clear of the neighbour’s' }[mode(v)]) },
    { key: 'speed', type: 'range', label: 'Speed', min: 0.4, max: 4, step: 0.01, fmt: (v) => v.toFixed(1) + '×' },
    { key: 'act', type: 'buttons', label: 'Start again', items: [{ label: 'Reset the counts', act: (s, inst) => inst.reset() }] },
  ],
  quiz: [
    { q: 'Two devices on the same channel send at the same moment. What happens?', options: ['Both get through at half speed', 'The frames collide and are lost, so both retry later', 'The router picks the stronger', 'Nothing, Wi-Fi can send in parallel'], answer: 1, why: 'The waves add into noise. With no acknowledgement, each sender backs off and tries again.' },
    { q: 'What does a device do after a failed attempt?', options: ['Sends right away', 'Gives up', 'Doubles the range of its random wait', 'Shouts louder'], answer: 2, why: 'The contention window doubles (up to 1023 slots), so repeated collisions become less likely.' },
    { q: 'Why are channels 1, 6 and 11 the usual choice on 2.4 GHz?', options: ['They are the fastest', 'They are the only three that do not overlap', 'The law says so', 'They use less power'], answer: 1, why: 'Channels are 5 MHz apart but about 20 MHz wide, so only every fifth one is clear of its neighbours.' },
    { q: 'What happens when more devices share one channel?', options: ['Each gets a smaller share of the airtime', 'Speed adds up', 'Nothing changes', 'Only the first gets through'], answer: 0, why: 'The air is shared, and more devices also mean more collisions and retries.' },
  ],
  reel: [
    { ms: 5600, caption: 'One device talks at a time. Everyone listens, waits a random moment, then sends. More devices, more collisions.', set: { ch: 6, speed: 2 }, anim: { n: [3, 10] }, act: (s, inst) => inst.reset(), view: { pos: [3.6, 8, 12], target: [3.6, 1.2, -0.6] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    s.n = Math.round(s.n);
    const root = stage.root;
    const router = makeRouter(0.9); router.setAntennas(3); root.add(router);
    stage.label('Your router', [0, 1.7, 0]);
    const nbRouter = makeRouter(0.8); nbRouter.setAntennas(2); nbRouter.position.set(NBX, 0, 0); root.add(nbRouter);
    nbRouter.antennas.forEach((a) => a.children[1].material.color.setHex(GREY));
    const nbLbl = stage.label('Neighbour', [NBX, 1.6, 0], root);
    const devs = [];
    const mkDev = (i, col, grey) => {
      const g = new THREE.Group(), ph = makePhone(1.7, grey ? 0x333a46 : 0x2a2f3a); ph.position.y = 0.05;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 32), M.glow(col)); disc.position.y = 0.02; disc.material.transparent = true; disc.material.opacity = 0.35;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), M.ghost(col, 0.6)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; ring.visible = false;
      const bar = box(0.3, 1, 0.3, M.plastic(col)); bar.position.set(0, 0.5, 0.0); bar.scale.y = 0.02;
      const lbl = stage.label('', [0, 0.6, 0], g, 'hot');
      g.add(ph, disc, ring); root.add(g); g.disc = disc; g.ring = ring; g.lbl = lbl; g.shown = ''; g.ph = ph;
      return g;
    };
    for (let i = 0; i < 10; i++) devs.push(mkDev(i, PAL[i], false));
    const nbDevs = [];
    for (let i = 0; i < NB; i++) { const d = mkDev(i, GREY, true); const a = Math.PI + (i - 1) * 0.9; d.position.set(NBX + Math.cos(a) * 0 + (i - 1) * 1.7, 0, 2.2 + Math.abs(i - 1) * 0.0); root.add(d); nbDevs.push(d); }
    const bars = devs.map((d, i) => { const b = box(0.34, 1, 0.34, M.plastic(PAL[i])); b.visible = false; root.add(b); return b; });
    const link = new Lines(stage, 2, { color: 0xffffff, width: 3 }); root.add(link.obj);

    const tl = canvasTexture(1700, 170, () => {});
    const tp = new THREE.Mesh(new THREE.PlaneGeometry(13, 13 * 170 / 1700), new THREE.MeshBasicMaterial({ map: tl.tex, transparent: true, toneMapped: false }));
    tp.position.set(3.6, 2.1, -5.6); root.add(tp);
    stage.label('Airtime on your channel, newest at right', [-2.4, 3.0, -5.6], root);
    const ch = canvasTexture(1700, 250, (g, w, h) => drawChannels(g, w, h, s.ch));
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(13, 13 * 250 / 1700), new THREE.MeshBasicMaterial({ map: ch.tex, transparent: true, toneMapped: false }));
    cp.position.set(3.6, 4.55, -5.6); root.add(cp);

    // ---- the simulation
    let rc = 0;
    const rand = (k) => Math.floor(hash(++rc * 31 + 7) * k);
    let sim, lastN = -1, lastCh = -1;
    const reset = () => {
      rc = 0;
      sim = { mine: Array.from({ length: s.n }, (_, i) => ({ id: i, cw: CWMIN, bo: 0, ok: 0, col: 0, mine: true })), nb: Array.from({ length: NB }, (_, i) => ({ id: 10 + i, cw: CWMIN, bo: 0, ok: 0, col: 0, mine: false })), ok: 0, okMine: 0, col: 0, bad: 0, total: 0, succMine: 0, succAll: 0, ev: null, age: 0, log: [] };
      [...sim.mine, ...sim.nb].forEach((x) => { x.bo = rand(CWMIN + 1); });
    };
    reset();
    const contenders = (md) => (md === 'same' ? [...sim.mine, ...sim.nb] : sim.mine);
    const startRound = (md) => {
      const L = contenders(md);
      const m = Math.min(...L.map((x) => x.bo));
      const win = L.filter((x) => x.bo === m);
      const before = new Map(L.map((x) => [x.id, x.bo]));
      L.forEach((x) => { x.bo -= m; });
      let type = 'ok';
      if (win.length > 1) type = 'col';
      else if (md === 'overlap' && win[0].mine && hash(++rc * 13 + 5) < 0.4) type = 'bad';
      const ev = { type, m, win: win.map((x) => x.id), before, L };
      if (type === 'ok') win[0].cw = CWMIN, win[0].bo = rand(CWMIN + 1);
      else win.forEach((x) => { x.cw = Math.min(2 * x.cw + 1, CWMAX); x.bo = rand(x.cw + 1); });
      ev.after = new Map(L.map((x) => [x.id, x.bo]));
      sim.ev = ev; sim.age = 0;
    };
    const commit = () => {
      const ev = sim.ev, t = DIFS + ev.m * SLOT + TF, anyMine = ev.win.some((id) => id < 10);
      sim.total += t;
      if (ev.type === 'ok') { const w = ev.L.find((x) => x.id === ev.win[0]); w.ok++; sim.succAll += TF; if (w.mine) { sim.ok++; sim.succMine += TF; } }
      else if (ev.type === 'col') { sim.col++; ev.L.filter((x) => ev.win.includes(x.id)).forEach((x) => x.col++); }
      else sim.bad++;
      sim.log.push({ type: ev.type, who: ev.win[0], m: ev.m });
      if (sim.log.length > 60) sim.log.shift();
      void anyMine;
    };
    const drawLog = () => {
      const g = tl.canvas.getContext('2d'), w = 1700, h = 170;
      g.fillStyle = 'rgba(8,10,16,0.84)'; g.fillRect(0, 0, w, h);
      let x = w - 20;
      for (let i = sim.log.length - 1; i >= 0 && x > -60; i--) {
        const e = sim.log[i], gap = clamp(((DIFS + e.m * SLOT) / TF) * 60, 3, 22), bw = 58;
        x -= bw + gap;
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + bw, 40, gap, 80);
        if (e.type === 'ok') { g.fillStyle = e.who >= 10 ? hex(GREY) : hex(PAL[e.who]); g.fillRect(x, 28, bw, 104); g.fillStyle = '#0b0d12'; g.font = `700 26px ${SANS}`; g.textAlign = 'center'; g.fillText(e.who >= 10 ? 'N' : e.who + 1, x + bw / 2, 90); }
        else if (e.type === 'col') { g.fillStyle = hex(COL.bad); g.fillRect(x, 28, bw, 104); g.strokeStyle = '#0b0d12'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 10, 40); g.lineTo(x + bw - 10, 120); g.moveTo(x + bw - 10, 40); g.lineTo(x + 10, 120); g.stroke(); }
        else { g.fillStyle = hex(COL.hot); g.fillRect(x, 28, bw, 104); g.fillStyle = '#0b0d12'; g.font = `700 26px ${SANS}`; g.textAlign = 'center'; g.fillText('?', x + bw / 2, 90); }
      }
      g.textAlign = 'left'; g.fillStyle = CSS.dim; g.font = `500 20px ${SANS}`;
      g.fillText('coloured = a frame got through · red X = collision · orange ? = garbled by a neighbour · N = neighbour’s frame', 20, 24);
      tl.tex.needsUpdate = true;
    };

    let vt = 0;
    const place = (n) => devs.forEach((d, i) => { d.visible = i < n; if (i < n) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n + 0.0; d.position.set(Math.cos(a) * RAD, 0, Math.sin(a) * RAD); d.rotation.y = -a - Math.PI / 2; d.lbl.position.set(0, 0.75, 0); } });
    const DUR_C = 0.22, DUR_T = 0.4;
    return {
      reset,
      update(dt, st) {
        vt += dt;
        st.n = Math.round(st.n);
        const md = mode(st.ch);
        if (st.n !== lastN || st.ch !== lastCh) {
          if (st.ch !== lastCh) ch.redraw();
          lastN = st.n; lastCh = st.ch; reset(); place(st.n);
          nbRouter.visible = true;
          nbLbl.element.textContent = md === 'same' ? 'Neighbour: same channel, shares your air' : md === 'overlap' ? 'Neighbour: overlapping channel, garbles your frames' : 'Neighbour: different channel, no contest';
          nbDevs.forEach((d) => { d.visible = true; d.disc.material.opacity = md === 'apart' ? 0.1 : 0.4; });
        }
        if (!sim.ev) startRound(md);
        sim.age += dt * st.speed;
        const ev = sim.ev, k = clamp(sim.age / DUR_C, 0, 1), tx = sim.age >= DUR_C, tk = clamp((sim.age - DUR_C) / DUR_T, 0, 1);
        const allDev = [...devs.slice(0, st.n).map((d, i) => [d, sim.mine[i]]), ...(md === 'same' ? nbDevs.map((d, i) => [d, sim.nb[i]]) : [])];
        const winners = new Set(ev.win);
        allDev.forEach(([d, x]) => {
          const isW = winners.has(x.id) && tx;
          let txt;
          if (!ev.before.has(x.id)) txt = '';
          else if (isW) txt = ev.type === 'ok' ? 'sending' : ev.type === 'bad' ? 'sending' : 'crash';
          else txt = String(Math.round(ev.before.get(x.id) - ev.m * k));
          if (!tx || !winners.has(x.id)) { if (!tx) txt = String(Math.round(ev.before.get(x.id) - ev.m * k)); else txt = String(ev.before.get(x.id) - ev.m); }
          if (d.shown !== txt) { d.shown = txt; d.lbl.element.textContent = txt; }
          d.ring.visible = isW; d.disc.material.opacity = isW ? 0.95 : (x.mine ? 0.35 : 0.4);
          const col = ev.type === 'col' ? COL.bad : ev.type === 'bad' ? COL.hot : (x.mine ? PAL[x.id] : GREY);
          if (isW) { d.ring.scale.setScalar(0.5 + tk * 3.2); d.ring.material.opacity = 0.7 * (1 - tk); d.ring.material.color.setHex(col); d.disc.material.color.setHex(col); }
          else d.disc.material.color.setHex(x.mine ? PAL[x.id] : GREY);
        });
        if (md !== 'same') nbDevs.forEach((d) => { d.shown = ''; d.lbl.element.textContent = ''; d.ring.visible = false; });
        const lit = tx && tk < 1;
        const c0 = ev.type === 'col' ? COL.bad : ev.type === 'bad' ? COL.hot : COL.ok;
        router.setLed(c0, lit);
        link.obj.visible = lit && ev.win.length > 0;
        if (lit) { const d = allDev.find(([, x]) => x.id === ev.win[0]); if (d) { const p = d[0].position; link.set((i, o) => { if (i > 0) return false; o.set([p.x, 0.25, p.z, 0, 0.25, 0]); }); link.mat.color.setHex(c0); } }
        if (sim.age >= DUR_C + DUR_T) { commit(); drawLog(); startRound(md); }
        bars.forEach((b, i) => { b.visible = i < st.n; if (i < st.n) { const mx = Math.max(1, ...sim.mine.map((x) => x.ok)); const h = 0.04 + (sim.mine[i].ok / mx) * 1.6; b.scale.y = h; b.position.set(devs[i].position.x * 1.22, h / 2, devs[i].position.z * 1.22); } });
      },
      readout(st) {
        const md = mode(st.ch), tot = Math.max(1, sim.total);
        const used = (sim.succAll / tot) * 100, mine = (sim.succMine / tot) * 100 / st.n;
        const rounds = sim.log.length ? sim.ok + sim.col + sim.bad : 0;
        return `<div class="big">${md === 'same' ? st.n + 3 : st.n} contenders</div><p class="r-say">${{ same: 'The neighbour’s 3 devices are on your channel, so everyone takes turns.', overlap: 'You cannot hear the neighbour, but they garble some of your frames.', apart: 'Your channel is clear of the neighbour’s. Only your own devices compete.' }[md]}</p>
          <div class="row"><span>Frames delivered (yours)</span><b>${sim.ok}</b></div>
          <div class="row"><span>Collisions</span><b style="color:${sim.col ? CSS.bad : CSS.ok}">${sim.col}</b></div>
          ${md === 'overlap' ? `<div class="row"><span>Garbled by neighbour</span><b style="color:${CSS.hot}">${sim.bad}</b></div>` : ''}
          <div class="row"><span>Air carrying data</span><b>${rounds ? used.toFixed(0) + '%' : '…'}</b></div>
          <div class="row"><span>Each of your devices gets about</span><b>${rounds ? mine.toFixed(0) + '% of the air' : '…'}</b></div>`;
      },
    };
  },
};
