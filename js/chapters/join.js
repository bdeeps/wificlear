// Chapter 5: joining a network. The router announces its name (SSID) in beacon frames, the laptop asks to
// join (open-system authentication, which is a formality in WPA2, or SAE in WPA3), the router accepts it
// (association), and then the four-message handshake builds the session key. In WPA2-Personal the master key
// (PMK) comes from the passphrase and the SSID (PBKDF2, 4,096 rounds of HMAC-SHA1) and is never sent; each side
// then mixes in a random number (ANonce from the router, SNonce from the laptop) and both MAC addresses to
// get the session key (PTK). A code (MIC) in message 2 proves the laptop knows the PMK. Data is then
// encrypted with AES in CCMP mode. The handshake bytes and keys on screen are illustrative, not real keys.
import { THREE, M, COL, CSS, Lines, V, clamp, lerp, sphere, box, canvasTexture, hash, makeRouter, makeLaptop, SANS, MONO } from '../wifi.js';

const FR = {
  beacon: { f: 'r', n: 'Beacon', sub: 'I am “HomeNet”', say: 'Every access point repeats a beacon about ten times a second (every 102 ms by default). It carries the network name, the SSID, and what the router can do.' },
  probe: { f: 'l', n: 'Probe request', sub: 'Is “HomeNet” near?', say: 'Your laptop does not have to wait for a beacon. It can ask out loud whether a network called “HomeNet” is nearby.' },
  probeR: { f: 'r', n: 'Probe response', sub: 'Yes. Here is what I support.', say: 'The router answers with the same information as a beacon, but just for you.' },
  auth: { f: 'l', n: 'Authentication', sub: 'Open System: a formality', say: 'In WPA2 this step is a leftover from the early days and proves nothing. The real security comes later.' },
  authR: { f: 'r', n: 'Authentication OK', sub: 'Hello to you too', say: 'The router replies. Nothing secret has happened yet.' },
  sae1: { f: 'l', n: 'SAE commit', sub: 'A sealed value from my password', say: 'WPA3 replaces the formality with SAE. Each side mixes the password into a value and sends it, but the password itself never travels.' },
  sae2: { f: 'r', n: 'SAE commit', sub: '…and mine', say: 'The router sends its sealed value. An eavesdropper cannot test password guesses against a recording of this exchange.' },
  sae3: { f: 'l', n: 'SAE confirm', sub: 'Proof I know it', say: 'Both sides now compute the same master key and prove it to each other.' },
  sae4: { f: 'r', n: 'SAE confirm', sub: 'Proof from me too', say: 'The router proves it too. WPA3 also makes protected management frames mandatory.' },
  assoc: { f: 'l', n: 'Association request', sub: 'May I join?', say: 'The laptop asks to join and lists the speeds it can handle.' },
  assocR: { f: 'r', n: 'Association response', sub: 'Yes. You are device #1', say: 'The router agrees and gives the laptop an ID number. The laptop is on the network, but nothing is encrypted yet.' },
  m1: { f: 'r', n: 'Handshake 1 of 4', sub: 'ANonce: a random number', say: 'The router sends a random number, the ANonce. Both sides already know the passphrase and the network name, so each can work out the same master key (PMK) without ever sending it.' },
  m2: { f: 'l', n: 'Handshake 2 of 4', sub: 'SNonce + proof (MIC)', say: 'The laptop picks its own random number, the SNonce. It mixes it with the ANonce and the master key into a fresh session key (PTK), and sends the SNonce with a code (MIC) that only the right key can produce.' },
  m3: { f: 'r', n: 'Handshake 3 of 4', sub: 'Group key (locked) + go', say: 'The router makes the same session key and checks the code. It sends a group key for broadcasts, locked with the new session key.' },
  m4: { f: 'l', n: 'Handshake 4 of 4', sub: 'Keys installed', say: 'The laptop confirms. Both sides install the keys. The handshake is done.' },
  fail: { f: 'r', n: 'Rejected', sub: 'The proof does not match', say: 'A mistyped password gives a different master key, so the code in the reply does not match. The router refuses and the laptop never gets keys.' },
  data: { f: 'l', n: 'Data', sub: 'GET /cat.jpg', say: '' },
};
const SEQ = {
  wpa2: ['beacon', 'probe', 'probeR', 'auth', 'authR', 'assoc', 'assocR', 'm1', 'm2', 'm3', 'm4', 'data'],
  wpa3: ['beacon', 'probe', 'probeR', 'sae1', 'sae2', 'sae3', 'sae4', 'assoc', 'assocR', 'm1', 'm2', 'm3', 'm4', 'data'],
  open: ['beacon', 'probe', 'probeR', 'auth', 'authR', 'assoc', 'assocR', 'data'],
};
function steps(st) {
  let q = [...SEQ[st.sec]];
  if (st.wrong && st.sec === 'wpa2') q = [...q.slice(0, q.indexOf('m2') + 1), 'fail'];
  if (st.wrong && st.sec === 'wpa3') q = [...q.slice(0, q.indexOf('sae3') + 1), 'fail'];
  return q;
}
const LX = -5, RXp = 5, ARC = 1.3;
const SECN = { wpa2: 'WPA2', wpa3: 'WPA3', open: 'Open (no password)' };
const hexs = (n, len = 8) => Array.from({ length: len }, (_, i) => Math.floor(hash(n * 17 + i) * 256).toString(16).padStart(2, '0')).join(' ');
const col = (side) => (side === 'l' ? COL.e : COL.hot);
const css = (side) => (side === 'l' ? CSS.e : CSS.hot);

export default {
  id: 'join',
  short: 'Joining and keys',
  title: 'How a laptop joins',
  subtitle: 'A name, a hello, a handshake and a secret key nobody sends.',
  view: { pos: [0, 5.6, 15.2], target: [0, 3.0, 0] },
  learn: `<p>Your laptop first has to <b>find</b> the network. Routers shout their name, the <b>SSID</b>, in <b>beacon</b> frames about ten times a second, and your laptop can also ask. Then it <b>authenticates</b> and <b>associates</b>, which says “I would like to join” and “you are device number one”. None of that is secret.</p>
    <p>The secret part is a <b>four-message handshake</b>. Both sides know the Wi-Fi password, so each can turn it into the same <b>master key</b>, and neither ever sends it. They swap two random numbers (<b>nonces</b>), mix them with the master key, and both end up with the same fresh <b>session key</b>. A little code in message two proves the laptop knew the password. A wrong password makes a different key, and the router says no.</p>
    <p>From then on every frame is <b>encrypted</b>. An eavesdropper in the street can hear all of it, the names and the random numbers too, but cannot build the key without the password. <b>WPA3</b> makes this safer: a recording of the exchange cannot be used to guess passwords offline, and each session’s key is independent of the password.</p>
    <p class="tip"><b>Try it:</b> step through the frames with the slider, turn on the eavesdropper, and switch the security off to see what an open network gives away. Then make a typo in the password.</p>`,
  terms: [
    { t: 'SSID', d: 'The network’s name, the thing you pick from the list.' },
    { t: 'Nonce', d: 'A random number used once. Mixing nonces into the key makes each session’s key different.' },
    { t: 'Handshake', d: 'The four-message exchange that gives both sides the same session key without sending it.' },
    { t: 'WPA2 / WPA3', d: 'Wi-Fi Protected Access, the security standards. WPA3 (2018) protects better against password guessing.' },
  ],
  defaults: { sec: 'wpa2', t: 0, play: true, spy: true, wrong: false, speed: 1 },
  controls: [
    { key: 't', type: 'range', label: 'Progress', min: 0, max: 1, step: 0.001, fmt: (v, s) => { const q = steps(s), i = Math.min(q.length - 1, Math.floor(v * q.length)); return FR[q[i]].n; }, ends: ['Start', 'Joined'] },
    { key: 'sec', type: 'seg', label: 'Security', options: Object.entries(SECN).map(([v, n]) => ({ v, label: n })) },
    { key: 'spy', type: 'toggle', label: 'Eavesdropper listening' },
    { key: 'wrong', type: 'toggle', label: 'Typo in the password', hint: 'WPA2 and WPA3 only.' },
    { key: 'play', type: 'toggle', label: 'Play automatically' },
  ],
  quiz: [
    { q: 'What is an SSID?', options: ['The Wi-Fi password', 'The network’s name', 'The router’s speed', 'An encryption method'], answer: 1, why: 'The service set identifier is the name you see in the list. Routers broadcast it in beacons.' },
    { q: 'Is the Wi-Fi password sent over the air during the handshake?', options: ['Yes, encrypted', 'Yes, in plain text', 'No, both sides compute keys from it', 'Only the first half'], answer: 2, why: 'Each side derives a master key from the password and proves it knows it. The password itself never travels.' },
    { q: 'Why do both sides swap random numbers (nonces)?', options: ['To measure distance', 'So each session gets a fresh key even with the same password', 'To pick a channel', 'To test the signal'], answer: 1, why: 'The nonces are mixed into the session key so it is different every time you join.' },
    { q: 'You mistype the password. What happens?', options: ['You join slowly', 'The keys do not match, the router’s check fails and it refuses you', 'The router changes its password', 'You join but without encryption'], answer: 1, why: 'A different password gives a different master key, so the code in message 2 does not match.' },
  ],
  reel: [
    { ms: 5800, caption: 'To join, your laptop and the router swap a few hellos, and then a four-message handshake.', set: { sec: 'wpa2', spy: true, wrong: false, play: false, t: 0 }, anim: { t: [0, 0.74] }, view: { pos: [0, 5.2, 14.2], target: [0, 3, 0] }, spin: 0 },
    { ms: 5600, caption: 'The password is never sent. Both sides use it to build the same secret key, and everything after is scrambled.', set: { sec: 'wpa2', spy: true, wrong: false, play: false }, anim: { t: [0.74, 1] }, view: { pos: [0, 5.2, 14.2], target: [0, 3, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    const root = stage.root;
    const lap = makeLaptop(1.5); lap.position.set(LX, 0, 0); lap.rotation.y = Math.PI / 2; root.add(lap);
    const router = makeRouter(1.3); router.position.set(RXp, 0, 0); router.rotation.y = -Math.PI / 2; router.setAntennas(3); root.add(router);
    stage.label('Your laptop', [LX, 1.5, 0]); stage.label('The router · “HomeNet”', [RXp, 2.3, 0]);

    const card = canvasTexture(760, 300, () => {});
    const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7 * 300 / 760), new THREE.MeshBasicMaterial({ map: card.tex, transparent: true, toneMapped: false, depthWrite: false }));
    cardMesh.renderOrder = 5; root.add(cardMesh);
    const trail = Array.from({ length: 4 }, (_, i) => { const t = sphere(0.1 - i * 0.02, M.glow(COL.e), 8); root.add(t); return t; });
    const beads = Array.from({ length: 14 }, () => { const b = sphere(0.1, M.glow(0x3a4352), 10); root.add(b); return b; });

    const kp = [-1, 1].map((side) => {
      const t = canvasTexture(620, 380, () => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5 * 380 / 620), new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, toneMapped: false }));
      m.position.set(side * 5.3, 4.1, 0); root.add(m); return t;
    });
    const spyTex = canvasTexture(900, 440, () => {});
    const spyMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2 * 440 / 900), new THREE.MeshBasicMaterial({ map: spyTex.tex, transparent: true, toneMapped: false }));
    spyMesh.position.set(0, 5.45, 0); root.add(spyMesh);
    const spy = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 20), M.matte(0x2b3040)); cone.position.y = 0.45; cone.castShadow = true;
    const head = sphere(0.2, M.matte(0x2b3040), 16); head.position.y = 1.05;
    const eye = sphere(0.05, M.glow(COL.bad), 8); eye.position.set(0.0, 1.08, 0.18);
    spy.add(cone, head, eye); spy.position.set(0, 0, 3.4); root.add(spy);
    const spyLbl = stage.label('Eavesdropper', [0, 1.7, 3.4]);
    const wire = new Lines(stage, 1, { color: COL.bad, width: 1.5, opacity: 0.6 }); root.add(wire.obj);

    const drawCard = (id, st, vt) => {
      const F = FR[id], enc = id === 'data' && st.sec !== 'open', lockd = id === 'm3' || enc;
      card.canvas.getContext('2d');
      const g = card.canvas.getContext('2d'), w = 760, h = 300, c = css(F.f);
      g.clearRect(0, 0, w, h);
      g.fillStyle = id === 'fail' ? '#3a1612' : '#10131b'; g.strokeStyle = id === 'fail' ? CSS.bad : c; g.lineWidth = 6;
      g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 28); g.fill(); g.stroke();
      g.fillStyle = id === 'fail' ? CSS.bad : c; g.font = `700 50px ${SANS}`; g.textAlign = 'left'; g.fillText(F.n, 34, 82);
      g.fillStyle = '#e9eef8'; g.font = `500 38px ${enc ? MONO : SANS}`;
      if (enc) {
        g.fillText(hexs(Math.floor(vt * 2.5) + 1, 5), 34, 160); g.fillText(hexs(Math.floor(vt * 2.5) + 9, 5), 34, 210);
      } else g.fillText(F.sub, 34, 160);
      g.fillStyle = CSS.dim; g.font = `500 28px ${SANS}`;
      g.fillText(F.f === 'l' ? 'laptop → router' : 'router → laptop', 34, 258);
      if (lockd) { g.fillStyle = CSS.hot; g.fillRect(w - 110, 120, 62, 50); g.strokeStyle = CSS.hot; g.lineWidth = 9; g.beginPath(); g.arc(w - 79, 120, 20, Math.PI, 0); g.stroke(); g.fillStyle = '#10131b'; g.fillRect(w - 83, 138, 8, 18); }
      card.tex.needsUpdate = true;
    };
    const drawKeys = (side, st, q, done) => {
      const t = kp[side === 'l' ? 0 : 1], g = t.canvas.getContext('2d'), w = 620, h = 380, c = side === 'l' ? CSS.e : CSS.hot;
      const idx = (id) => q.indexOf(id), after = (id) => idx(id) >= 0 && done > idx(id), during = (id) => idx(id) >= 0 && done >= idx(id);
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,0.86)'; g.fillRect(0, 0, w, h); g.strokeStyle = c; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
      g.font = `700 32px ${SANS}`; g.fillStyle = c; g.textAlign = 'left'; g.fillText(side === 'l' ? 'The laptop knows' : 'The router knows', 24, 48);
      const L = side === 'l';
      const saeDone = st.sec === 'wpa3' ? after('sae4') : false;
      const rows = st.sec === 'open' ? [['Nothing secret', true, 'there are no keys']] : [
        ['Password (never sent)', true, ''],
        ['Network name (SSID)', L ? after('beacon') : true, ''],
        [st.sec === 'wpa3' ? 'Master key (from SAE)' : 'Master key (PMK)', st.sec === 'wpa3' ? saeDone : (L ? after('beacon') : true), ''],
        ['ANonce (router’s number)', L ? after('m1') : during('m1'), ''],
        ['SNonce (laptop’s number)', L ? during('m2') : after('m2'), ''],
        ['Session key (PTK)', L ? after('m1') : after('m2'), ''],
        ['Keys installed', after('m4'), ''],
      ];
      rows.forEach(([name, on, note], i) => {
        const y = 92 + i * 40;
        g.fillStyle = on ? c : '#2c3344'; g.beginPath(); g.arc(34, y - 9, 11, 0, Math.PI * 2); g.fill();
        g.fillStyle = on ? '#e9eef8' : '#667088'; g.font = `500 26px ${SANS}`; g.fillText(name + (note ? ': ' + note : ''), 60, y);
      });
      if (st.wrong && st.sec !== 'open' && q.includes('fail') && done > idx('fail')) { g.fillStyle = CSS.bad; g.font = `700 28px ${SANS}`; g.fillText('Keys do not match', 24, h - 18); }
      t.tex.needsUpdate = true;
    };
    const drawSpy = (st, q, done, vt) => {
      const g = spyTex.canvas.getContext('2d'), w = 900, h = 440, idx = (id) => q.indexOf(id), after = (id) => idx(id) >= 0 && done > idx(id);
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,0.88)'; g.fillRect(0, 0, w, h); g.strokeStyle = CSS.bad; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
      g.font = `700 32px ${SANS}`; g.fillStyle = CSS.bad; g.textAlign = 'left'; g.fillText('What the eavesdropper hears', 24, 48);
      const lines = [];
      if (after('beacon')) lines.push(['Network name: “HomeNet”', true]);
      if (after('probe')) lines.push(['Which device is asking (its address)', true]);
      if (after('m1') && st.sec !== 'open') lines.push(['ANonce  ' + hexs(1, 4), true]);
      if (after('m2') && st.sec !== 'open') lines.push(['SNonce  ' + hexs(2, 4) + ' + MIC', true]);
      if (after('sae2')) lines.push(['SAE values: useless for guessing the password', true]);
      if (after('m3')) lines.push(['Group key: locked ' + hexs(3, 3) + '…', false]);
      if (after('data') || done >= q.indexOf('data') && q.indexOf('data') >= 0 && done >= q.length) lines.push([st.sec === 'open' ? 'GET /cat.jpg  (every word readable)' : hexs(Math.floor(vt * 2.5) + 40, 6) + ' …', st.sec === 'open']);
      if (!lines.length) lines.push(['Nothing yet. (Only the first frame is on the air.)', true]);
      lines.slice(-7).forEach(([txt, readable], i) => { g.fillStyle = readable ? '#e9eef8' : CSS.hot; g.font = `500 28px ${readable ? SANS : MONO}`; g.fillText(txt, 28, 98 + i * 44); });
      g.fillStyle = CSS.ok; g.font = `600 24px ${SANS}`;
      g.fillText(st.sec === 'open' ? 'No password, no keys. Anyone can read the data.' : 'Never on the air: the password, master key and session key.', 28, h - 20);
      spyTex.tex.needsUpdate = true;
    };

    let vt = 0, lastKey = '', cardKey = '', done0 = -1;
    const ease = (k) => k * k * (3 - 2 * k);
    return {
      next() { const q = steps(s), n = q.length, i = Math.floor(s.t * n + 1e-6); s.t = Math.min(1, (i + 1) / n); s.play = false; },
      restart() { s.t = 0; },
      update(dt, st) {
        vt += dt;
        const q = steps(st), N = q.length;
        if (st.play && !st.wrong || st.play) { st.t = Math.min(1, st.t + (dt * st.speed) / (N * 1.5)); if (st.t >= 1) st.t = 1; }
        const p = st.t * N, i = Math.min(N - 1, Math.floor(p)), done = Math.min(N, Math.floor(p + 1e-6)), u = st.t >= 1 ? ((vt * 0.7) % 1) : p - i;
        const id = q[i], F = FR[id], dir = F.f === 'l' ? 1 : -1;
        const finished = st.t >= 1;
        const k = ease(clamp(u, 0, 1));
        const xx = dir > 0 ? lerp(LX + 1, RXp - 1, k) : lerp(RXp - 1, LX + 1, k), yy = ARC + 1.2 * Math.sin(Math.PI * clamp(u, 0, 1));
        cardMesh.position.set(xx, yy + 0.9, 0.6); cardMesh.quaternion.copy(stage.camera.quaternion);
        const sendWhere = id === 'data' && finished ? (Math.floor(vt * 0.7) % 2 ? 'r' : 'l') : F.f;
        const cardId = id === 'data' && finished ? 'data' : id;
        const ck = [cardId, st.sec, finished ? Math.floor(vt * 2.5) : 0, st.wrong].join('|');
        if (ck !== cardKey) { cardKey = ck; drawCard(cardId, st, vt); }
        trail.forEach((tr, n) => { const kk = clamp(k - (n + 1) * 0.06, 0, 1); tr.position.set(dir > 0 ? lerp(LX + 1, RXp - 1, kk) : lerp(RXp - 1, LX + 1, kk), ARC + 1.2 * Math.sin(Math.PI * kk) + 0.9, 0.6); tr.material.color.setHex(col(F.f)); tr.visible = u > 0.05 && u < 0.98; });
        beads.forEach((b, n) => { b.visible = n < N; if (n >= N) return; b.position.set(lerp(-4.2, 4.2, N === 1 ? 0 : n / (N - 1)), 0.12, 2.0); b.material.color.setHex(n < done ? col(FR[q[n]].f) : n === i && !finished ? 0xffffff : 0x3a4352); b.scale.setScalar(n === i && !finished ? 1.5 : 1); });
        const key = [st.sec, done, st.wrong, finished].join('|');
        if (key !== lastKey) { lastKey = key; drawKeys('l', st, q, finished ? N : done); drawKeys('r', st, q, finished ? N : done); drawSpy(st, q, finished ? N : done, vt); }
        if (finished && Math.floor(vt * 2.5) !== done0) { done0 = Math.floor(vt * 2.5); if (st.sec !== 'open') drawSpy(st, q, N, vt); }
        spy.visible = spyMesh.visible = spyLbl.visible = wire.obj.visible = !!st.spy;
        if (st.spy) { wire.set((n, o) => o.set([0, 1.1, 3.4, xx, yy + 0.9, 0.6])); }
        const lit = F.f === 'l' ? lap : router;
        void lit; void sendWhere;
        router.setLed(id === 'fail' ? COL.bad : COL.ok, done >= 1 || u > 0.5);
        lap.screen.material.color.setHex(finished && !q.includes('fail') ? 0x2a9d4f : id === 'fail' ? 0xa33a2a : 0x2a6df4);
      },
      readout(st) {
        const q = steps(st), N = q.length, p = st.t * N, i = Math.min(N - 1, Math.floor(p)), F = FR[q[i]];
        const fin = st.t >= 1;
        const say = q[i] === 'data' ? (st.sec === 'open' ? 'No keys: anyone nearby can read everything. (Many sites add their own encryption on top, with HTTPS, but Wi-Fi itself adds none.)' : 'From now on every frame is encrypted with AES, with a code that detects tampering. An eavesdropper hears only scrambled bytes.') : F.say;
        return `<div class="big" style="color:${css(F.f)}">${F.n}</div><p class="r-say">${say}</p>
          <div class="row"><span>Step</span><b>${fin ? N : i + 1} of ${N}</b></div>
          <div class="row"><span>Security</span><b>${SECN[st.sec]}</b></div>
          <div class="row"><span>Status</span><b style="color:${q.includes('fail') && fin ? CSS.bad : fin ? CSS.ok : CSS.hot}">${q.includes('fail') && fin ? 'Refused' : fin ? 'Joined' : 'Joining…'}</b></div>`;
      },
    };
  },
};
