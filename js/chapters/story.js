// Chapter 6: eight generations of speed. The bars show the highest theoretical PHY data rate each IEEE
// 802.11 amendment allows: 2, 11, 54, 54, 600, 6,933, 9,608 and 23,059 Mbit/s (802.11, b, a, g, n, ac, ax, be).
// These are best-case link rates with the most streams, widest channel and densest modulation the standard
// allows, not what a real device gets. Real throughput is usually well under half of the link rate.
// Years are the year each amendment was published or approved (ax was certified from 2019 and approved in 2021).
import { THREE, M, COL, CSS, Lines, clamp, box } from '../wifi.js';
import { approach as ap } from '../kit.js';

const GEN = [
  { std: '802.11', year: '1997', rate: 2, bands: ['2.4'], wifi: '', say: 'The first standard. Radio at 2.4 GHz, with an infrared option too, at 1 to 2 Mbit/s.' },
  { std: '802.11b', year: '1999', rate: 11, bands: ['2.4'], wifi: '', say: 'Spread-spectrum radio with CCK coding on 2.4 GHz: up to 11 Mbit/s. The first Wi-Fi most people used.' },
  { std: '802.11a', year: '1999', rate: 54, bands: ['5'], wifi: '', say: 'OFDM on 5 GHz: many slow subcarriers sent in parallel, up to 54 Mbit/s.' },
  { std: '802.11g', year: '2003', rate: 54, bands: ['2.4'], wifi: '', say: 'The OFDM of 802.11a brought to 2.4 GHz, and still talking to 802.11b devices: 54 Mbit/s.' },
  { std: '802.11n', year: '2009', rate: 600, bands: ['2.4', '5'], wifi: 'Wi-Fi 4', say: 'MIMO: up to 4 streams at once, 40 MHz channels and both bands. Up to 600 Mbit/s.' },
  { std: '802.11ac', year: '2013', rate: 6933, bands: ['5'], wifi: 'Wi-Fi 5', say: '5 GHz only, channels up to 160 MHz, 256-QAM, up to 8 streams, and multi-user MIMO downlink. About 6.9 Gbit/s.' },
  { std: '802.11ax', year: '2019–21', rate: 9608, bands: ['2.4', '5', '6'], wifi: 'Wi-Fi 6 / 6E', say: 'OFDMA splits a channel among many devices at once, 1024-QAM, and 6 GHz as Wi-Fi 6E. About 9.6 Gbit/s.' },
  { std: '802.11be', year: '2024', rate: 23059, bands: ['2.4', '5', '6'], wifi: 'Wi-Fi 7', say: '320 MHz channels, 4096-QAM, 8 streams and multi-link operation across bands. About 23 Gbit/s on paper (a 16-stream design would double it).' },
];
const BCOL = { '2.4': 0xa3e635, '5': 0xffb547, '6': 0xc49bff };
const H = 5, XS = 1.55, X0 = -((GEN.length - 1) * XS) / 2;
const hLog = (r) => (H * Math.log10(r)) / Math.log10(50000);
const hLin = (r) => (H * r) / 23059;
const fmtRate = (r) => (r >= 1000 ? (r / 1000).toFixed(r >= 10000 ? 1 : 2).replace(/\.?0+$/, '') + ' Gbit/s' : r + ' Mbit/s');
const fmtTime = (sec) => (sec >= 3600 ? (sec / 3600).toFixed(1) + ' hours' : sec >= 120 ? (sec / 60).toFixed(0) + ' minutes' : sec >= 1 ? sec.toFixed(0) + ' seconds' : (sec * 1000).toFixed(0) + ' milliseconds');
const bandCol = (g) => BCOL[g.bands[g.bands.length - 1]];

export default {
  id: 'story',
  short: 'Faster every few years',
  title: 'Eight generations of speed',
  subtitle: 'From 2 Mbit/s in 1997 to 23 Gbit/s on paper.',
  view: { pos: [0, 4.8, 13.5], target: [0, 2.2, 0] },
  learn: `<p>Wi-Fi is a family of <b>IEEE 802.11</b> standards. Each new one made the link faster by using the tricks you have just seen, a little more of each: <b>denser modulation</b> (from BPSK to 4096-QAM), <b>wider channels</b> (20 MHz up to 320), <b>more antennas and streams</b> (MIMO), and cleverer ways to <b>share the air</b> among many devices. Newer bands, 5 and then 6 GHz, bring more room.</p>
    <p>The bars show the <b>theoretical top link rate</b> of each generation, on a <b>log scale</b>: each gridline is ten times the last. On a plain linear scale the first four generations would be too small to see. Since 2018 the Wi-Fi Alliance has also given generations numbers: Wi-Fi 4 is 802.11n, Wi-Fi 5 is 802.11ac, Wi-Fi 6 is 802.11ax and Wi-Fi 7 is 802.11be.</p>
    <p>Those speeds are the best case: the most streams, the widest channel, the strongest signal, nobody else talking. Real throughput on one device is usually a fraction of it, and a phone with one or two antennas never sees the maximum.</p>
    <p class="tip"><b>Try it:</b> step through the generations, then switch between log and linear to see why a log scale is needed.</p>`,
  terms: [
    { t: '802.11', d: 'The IEEE’s family of Wi-Fi standards. Letters after it (b, a, g, n, ac, ax, be) mark each amendment.' },
    { t: 'Link rate', d: 'The raw speed of the radio link at a given moment. Real file-transfer speed is lower, because of overheads and sharing.' },
    { t: 'Wi-Fi 6E', d: 'Wi-Fi 6 extended to the 6 GHz band, which has room for several wide channels.' },
    { t: 'OFDMA', d: 'Splitting one channel into small pieces so several devices can use it in the same moment.' },
  ],
  defaults: { gen: 7, scale: 'log' },
  controls: [
    { key: 'gen', type: 'range', label: 'Generation', min: 0, max: 7, step: 1, fmt: (v) => GEN[Math.round(v)].std + (GEN[Math.round(v)].wifi ? ' · ' + GEN[Math.round(v)].wifi : '') },
    { key: 'scale', type: 'seg', label: 'Vertical scale', options: [{ v: 'log', label: 'Log' }, { v: 'lin', label: 'Linear' }] },
  ],
  quiz: [
    { q: 'What is “Wi-Fi 6”?', options: ['A router with six antennas', 'The name for 802.11ax', 'The sixth channel', 'A 6 GHz-only standard'], answer: 1, why: 'Since 2018 the Wi-Fi Alliance numbers generations: Wi-Fi 4 is 802.11n, 5 is ac, 6 is ax and 7 is be.' },
    { q: 'Why is the speed chart on a log scale?', options: ['It is prettier', 'Speeds span a factor of over 10,000, so linear bars would hide the early ones', 'Wi-Fi is measured in logs', 'To exaggerate the newest'], answer: 1, why: 'From 2 Mbit/s to 23,000 Mbit/s: on a linear chart the first generations vanish.' },
    { q: 'Which of these made 802.11n faster than 802.11g?', options: ['MIMO and 40 MHz channels', 'Higher power', 'A new law of physics', 'Longer cables'], answer: 0, why: 'Several antennas sending parallel streams, plus wider channels, multiplied the rate.' },
    { q: 'Are the headline speeds what one phone will get?', options: ['Yes, always', 'No, they are best-case link rates, usually well above real throughput', 'They are always too low', 'Yes, on 6 GHz'], answer: 1, why: 'The maximums assume many streams, wide channels, strong signal and an empty channel.' },
  ],
  reel: [
    { ms: 6000, caption: 'Eight generations of Wi-Fi, from 2 Mbit/s in 1997 to 23 Gbit/s on paper today.', set: { scale: 'log' }, anim: { gen: [0, 7] }, view: { pos: [0, 4.4, 12], target: [0, 2.2, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    const root = stage.root;
    const bars = GEN.map((g, i) => {
      const b = box(1, 1, 1, M.plastic(bandCol(g))); b.position.x = X0 + i * XS; b.scale.set(1.0, 0.02, 0.9); root.add(b);
      const cap = box(1, 0.05, 0.9, M.glow(bandCol(g))); cap.scale.set(1.0, 1, 1); b.cap = cap; root.add(cap);
      b.lbl = stage.label('', [b.position.x, 0.2, 0.0], root, 'hot');
      stage.label(`${g.std}<br><span style="opacity:.7">${g.year}</span>`, [b.position.x, 0, 1.25]);
      b.h = 0.02; b.shown = '';
      return b;
    });
    const grid = new Lines(stage, 5, { color: COL.dim, width: 1, opacity: 0.4 }); root.add(grid.obj);
    const gl = Array.from({ length: 5 }, () => stage.label('', [X0 - 1, 0, -0.5], root));
    let lastScale = '';
    const lines = { log: [[1, '1'], [10, '10'], [100, '100'], [1000, '1 Gbit/s'], [10000, '10 Gbit/s']], lin: [[5000, '5'], [10000, '10 Gbit/s'], [15000, '15'], [20000, '20 Gbit/s'], [23059, '']] };
    return {
      update(dt, st) {
        const gi = Math.round(st.gen), lin = st.scale === 'lin', hf = lin ? hLin : hLog;
        if (st.scale !== lastScale) {
          lastScale = st.scale;
          const L = lines[st.scale];
          grid.set((i, o) => { const y = hf(L[i][0]) + 0.0; if (!L[i][1]) return false; o.set([X0 - 0.8, y, -0.5, -X0 + 0.8, y, -0.5]); });
          gl.forEach((l, i) => { l.element.textContent = L[i][1] ? (L[i][1].includes('Gbit') || L[i][1] === '1' || /^\d+$/.test(L[i][1]) ? (L[i][1] + (/^\d+$/.test(L[i][1]) && !st.scale.startsWith('lin') ? ' Mbit/s' : '')) : L[i][1]) : ''; l.position.set(X0 - 1.0, hf(L[i][0]), -0.5); l.visible = !!L[i][1]; });
        }
        bars.forEach((b, i) => {
          const on = i <= gi, target = on ? Math.max(0.02, hf(GEN[i].rate)) : 0.02;
          b.h = ap(b.h, target, 7, dt);
          b.scale.y = b.h; b.position.y = b.h / 2; b.cap.position.set(b.position.x, b.h + 0.025, 0);
          b.material.opacity = 1; b.material.transparent = !on; b.material.opacity = on ? (i === gi ? 1 : 0.62) : 0.12;
          b.cap.visible = on;
          b.cap.material.color.setHex(i === gi ? 0xffffff : bandCol(GEN[i]));
          b.lbl.position.y = b.h + 0.5; b.lbl.visible = on;
          const t = on ? fmtRate(GEN[i].rate) : '';
          if (t !== b.shown) { b.shown = t; b.lbl.element.textContent = t; }
          b.lbl.element.style.opacity = i === gi ? 1 : 0.65;
        });
      },
      readout(st) {
        const g = GEN[Math.round(st.gen)], sec = 8000 / g.rate;
        const bands = g.bands.map((b) => `<span style="color:#${BCOL[b].toString(16)}">${b} GHz</span>`).join(' · ');
        return `<div class="big">${g.std}${g.wifi ? ' · ' + g.wifi : ''}</div><p class="r-say">${g.say}</p>
          <div class="row"><span>Year</span><b>${g.year}</b></div>
          <div class="row"><span>Bands</span><b>${bands}</b></div>
          <div class="row"><span>Top link rate (best case)</span><b>${fmtRate(g.rate)}</b></div>
          <div class="row"><span>A 1 GB film, at that rate</span><b>${fmtTime(sec)}</b></div>`;
      },
    };
  },
};
