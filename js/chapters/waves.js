// Chapter 1: Wi-Fi is radio. A radio wave is an electric field and a magnetic field wiggling together,
// travelling at the speed of light. Frequency times wavelength is always c, so the three Wi-Fi bands
// (2.4, 5 and 6 GHz) have wavelengths of roughly 12, 5.5 and 4.6 cm. Band edges are the commonly used
// ones (2.400-2.4835, 5.150-5.895, 5.925-7.125 GHz); which parts are allowed varies by country.
// The picture is to scale in wavelength (1 cm = 0.25 units) but not in speed, which would be far too fast to see.
import { THREE, M, COL, CSS, Lines, V, clamp, sphere, box, canvasTexture, lambdaCm, BANDS, bandOf, SANS } from '../wifi.js';

const X0 = -6.2, X1 = 6.2, Y0 = 2.5, UCM = 0.25, SPEED = 2.4, N = 260;

function drawSpectrum(g, w, h, f) {
  const fx = (x) => 30 + (x / 8) * (w - 60);
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(8,10,16,0.82)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2c3344'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 150); g.lineTo(w - 30, 150); g.stroke();
  g.font = `500 22px ${SANS}`; g.fillStyle = CSS.dim; g.textAlign = 'center';
  for (let x = 0; x <= 8; x++) { g.fillRect(fx(x) - 1, 150, 2, 8); g.fillText(x + (x === 8 ? ' GHz' : ''), fx(x), 184); }
  const span = (a, b, y, hh, col, text, alpha = 1) => {
    g.globalAlpha = alpha; g.fillStyle = col; g.fillRect(fx(a), y, Math.max(3, fx(b) - fx(a)), hh); g.globalAlpha = 1;
    g.fillStyle = col; g.textAlign = 'center'; g.font = `600 20px ${SANS}`; g.fillText(text, (fx(a) + fx(b)) / 2, y - 7);
  };
  span(0.7, 2.7, 98, 22, CSS.dim, 'mobile phones (some of their bands)', 0.5);
  span(0.08, 0.108, 118, 24, CSS.dim, '', 0.9);
  g.fillStyle = CSS.dim; g.textAlign = 'left'; g.font = `600 20px ${SANS}`; g.fillText('FM radio', fx(0.08) - 2, 112);
  span(1.559, 1.591, 118, 24, CSS.dim, '', 0.9);
  g.textAlign = 'center'; g.fillStyle = CSS.dim; g.fillText('GPS', fx(1.575), 112);
  BANDS.forEach((b) => span(b.lo, b.hi, 118, 24, b.color, b.id === '2.4' ? '' : b.name));
  g.fillStyle = CSS.ok; g.textAlign = 'right'; g.fillText('2.4 GHz Wi-Fi, Bluetooth, microwave oven', fx(2.4) - 8, 46); g.fillRect(fx(2.44) - 1, 52, 2, 66);
  // marker
  g.fillStyle = '#fff'; g.fillRect(fx(f) - 2, 54, 4, 98);
  g.beginPath(); g.moveTo(fx(f) - 11, 54); g.lineTo(fx(f) + 11, 54); g.lineTo(fx(f), 74); g.closePath(); g.fill();
}

export default {
  id: 'waves',
  short: 'Radio waves',
  title: 'Wi-Fi is radio',
  subtitle: 'An invisible wave that wiggles billions of times a second.',
  view: { pos: [0.5, 4.8, 12.6], target: [0, 1.7, 0.4] },
  learn: `<p>Wi-Fi is <b>radio</b>, like the signal that carries a song to a car stereo. Its radio waves are just a higher pitch. A wave is an <b>electric field</b> and a <b>magnetic field</b> that wiggle at right angles to each other and travel through the air together, at the speed of light.</p>
    <p>How many wiggles happen each second is the <b>frequency</b>. The distance between two crests is the <b>wavelength</b>. They are tied together: <b>frequency × wavelength = the speed of light</b>. Wi-Fi uses three bands, around <b>2.4, 5 and 6 GHz</b>. That is 2.4 to 6 billion wiggles a second and wavelengths of about 12, 5.5 and 4.6 cm.</p>
    <p>An <b>antenna</b> is a piece of metal about half a wavelength long. When current sloshes up and down it, it throws waves out. When a wave passes another antenna, it pushes electrons up and down it and makes a tiny voltage. That tiny voltage is the whole signal.</p>
    <p class="tip"><b>Try it:</b> drag the frequency and watch the wavelength ruler and the antenna length change. Then jump to each Wi-Fi band.</p>
    <p class="note">The wave is drawn to scale in wavelength, but moves far slower than real light so you can see it.</p>`,
  terms: [
    { t: 'Frequency', d: 'How many full wiggles of the wave happen each second. One gigahertz (GHz) is a billion per second.' },
    { t: 'Wavelength', d: 'The distance between one crest of the wave and the next. Higher frequency means a shorter wavelength.' },
    { t: 'Antenna', d: 'A piece of metal, often about half a wavelength long, that turns current into waves and waves back into current.' },
    { t: 'Band', d: 'A range of frequencies set aside for a use. Wi-Fi’s main bands are 2.4, 5 and 6 GHz.' },
  ],
  defaults: { f: 2.44, showB: true },
  controls: [
    { key: 'f', type: 'range', label: 'Frequency', min: 0.9, max: 7.3, step: 0.01, fmt: (v) => v.toFixed(2) + ' GHz' },
    { key: 'band', type: 'buttons', label: 'Jump to a Wi-Fi band', items: BANDS.map((b) => ({ label: b.name, act: (s) => { s.f = b.f; } })) },
    { key: 'showB', type: 'toggle', label: 'Show the magnetic wave' },
  ],
  quiz: [
    { q: 'What is a Wi-Fi signal?', options: ['Light from the router’s lamps', 'A radio wave, a wiggling electric and magnetic field', 'Sound too high to hear', 'Electric current in the air'], answer: 1, why: 'Wi-Fi is radio: electric and magnetic fields that wiggle and travel at the speed of light.' },
    { q: 'You raise the frequency. What happens to the wavelength?', options: ['It gets shorter', 'It gets longer', 'It stays the same', 'It disappears'], answer: 0, why: 'Frequency × wavelength is the speed of light, a fixed number, so more wiggles per second means shorter waves.' },
    { q: 'Roughly how long is a 2.4 GHz wavelength?', options: ['12 metres', '12 centimetres', '12 millimetres', '12 micrometres'], answer: 1, why: '300,000 km/s divided by 2.4 billion per second is about 12.5 cm.' },
    { q: 'What does a receiving antenna do?', options: ['Pushes the wave back', 'Turns the passing wave into a tiny voltage', 'Makes the wave stronger', 'Slows the wave down'], answer: 1, why: 'The wave shakes electrons in the metal, giving a tiny voltage that the radio then amplifies and decodes.' },
  ],
  reel: [
    { ms: 5200, caption: 'Wi-Fi is radio: an electric and a magnetic wave. It lives in three bands, 2.4, 5 and 6 GHz.', set: { showB: true }, anim: { f: [2.44, 6.5] }, view: { pos: [0.5, 4.2, 11], target: [0, 1.9, 0.4] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    const root = stage.root;
    const eW = new Lines(stage, N, { color: COL.e, width: 3 }), bW = new Lines(stage, N, { color: COL.b, width: 3 });
    const eS = new Lines(stage, N / 4, { color: COL.e, width: 1, opacity: 0.45 }), bS = new Lines(stage, N / 4, { color: COL.b, width: 1, opacity: 0.45 });
    const axis = new Lines(stage, 1, { color: COL.dim, width: 1.2, opacity: 0.8 });
    axis.set((i, o) => { o.set([X0, Y0, 0, X1, Y0, 0]); });
    root.add(axis.obj, eW.obj, bW.obj, eS.obj, bS.obj);

    const dip = (x) => {
      const g = new THREE.Group();
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 14), M.metal(0xd9dee8)); r.castShadow = true;
      const feed = sphere(0.1, M.plastic(0x333a46), 14);
      const charge = sphere(0.085, M.glow(COL.hot), 14);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, Y0, 12), M.plastic(0x232830)); mast.position.y = -Y0 / 2; mast.castShadow = true;
      g.add(r, feed, charge, mast); g.position.set(x, Y0, 0); g.rod = r; g.charge = charge; g.mast = mast;
      root.add(g); return g;
    };
    const tx = dip(X0), rx = dip(X1);
    rx.charge.material.color.setHex(COL.ok);
    stage.label('Transmitter', [X0, Y0 + 2.1, 0]);
    const lblRx = stage.label('Receiver: wave in, tiny voltage out', [X1, Y0 + 2.1, 0], root, 'hot');

    const bar = box(1, 0.05, 0.05, M.glow(COL.hot)), tkA = box(0.05, 0.36, 0.05, M.glow(COL.hot)), tkB = box(0.05, 0.36, 0.05, M.glow(COL.hot));
    root.add(bar, tkA, tkB);
    const lblW = stage.label('', [0, Y0 - 1.55, 0], root, 'hot');
    const lblA = stage.label('', [X0 + 0.9, Y0 - 0.1, 0]);

    const spec = canvasTexture(1400, 210, (g, w, h) => drawSpectrum(g, w, h, s.f));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.89), new THREE.MeshBasicMaterial({ map: spec.tex, transparent: true, toneMapped: false }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(0, 0.04, 3.7); root.add(plane);

    let lastF = -1, phase = 0, vt = 0;
    const lam = (f) => lambdaCm(f) * UCM;
    return {
      update(dt, st) {
        vt += dt;
        const L = lam(st.f);
        if (st.f !== lastF) {
          lastF = st.f;
          const half = L / 2;
          [tx, rx].forEach((d) => { d.rod.scale.y = half; });
          bar.scale.x = L; bar.position.set(-1.3 + L / 2, Y0 - 1.3, 0);
          tkA.position.set(-1.3, Y0 - 1.3, 0); tkB.position.set(-1.3 + L, Y0 - 1.3, 0);
          lblW.position.set(-1.3 + L / 2, Y0 - 1.75, 0);
          lblW.element.innerHTML = `one wavelength = ${lambdaCm(st.f).toFixed(1)} cm`;
          lblA.element.innerHTML = `antenna: half a wavelength, ${(lambdaCm(st.f) / 2).toFixed(1)} cm`;
          spec.redraw(st.f);
        }
        const k = (2 * Math.PI) / L, A = 1.1;
        const phi = (x) => k * (x - X0) - 2 * Math.PI * (SPEED / L) * vt;
        const ramp = (x) => clamp((x - X0) / 0.8, 0, 1);
        const xs = (i) => X0 + 0.35 + ((X1 - X0 - 0.7) * i) / N;
        eW.setPoly((i, o) => { const x = xs(i); o[0] = x; o[1] = Y0 + A * ramp(x) * Math.sin(phi(x)); o[2] = 0; }, N + 1);
        const showB = st.showB;
        bW.obj.visible = bS.obj.visible = showB;
        if (showB) bW.setPoly((i, o) => { const x = xs(i); o[0] = x; o[1] = Y0; o[2] = A * ramp(x) * Math.sin(phi(x)); }, N + 1);
        eS.set((i, o) => { const x = xs(i * 4); o[0] = x; o[1] = Y0; o[2] = 0; o[3] = x; o[4] = Y0 + A * ramp(x) * Math.sin(phi(x)); o[5] = 0; });
        if (showB) bS.set((i, o) => { const x = xs(i * 4); o[0] = x; o[1] = Y0; o[2] = 0; o[3] = x; o[4] = Y0; o[5] = A * ramp(x) * Math.sin(phi(x)); });
        const half = L / 2 - 0.12;
        tx.charge.position.y = half * Math.sin(phi(X0));
        rx.charge.position.y = half * 0.8 * Math.sin(phi(X1));
      },
      readout(st) {
        const b = bandOf(st.f);
        const where = b ? `<span style="color:${b.color}">${b.name} Wi-Fi band</span>` : 'Between the Wi-Fi bands';
        return `<div class="big">${st.f.toFixed(2)} GHz</div><p class="r-say">${where}</p>
          <div class="row"><span>Wiggles per second</span><b>${(st.f).toFixed(2)} billion</b></div>
          <div class="row"><span>Wavelength</span><b>${lambdaCm(st.f).toFixed(1)} cm</b></div>
          <div class="row"><span>Half-wave antenna</span><b>${(lambdaCm(st.f) / 2).toFixed(1)} cm</b></div>
          <div class="row"><span>frequency × wavelength</span><b>300,000 km/s</b></div>`;
      },
    };
  },
};
