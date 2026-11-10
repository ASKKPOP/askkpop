/* askkpop.com — live isometric city background.
 * Vanilla port of noesiis.com's CyberGrid (dashboard/src/components/portal/CyberGrid.tsx),
 * rendered with hideHud: same seeded world (mulberry32, seed 42), districts, buildings,
 * data-packet arcs, katakana rain, ambient particles and edge vignette.
 * Non-interactive; draws one still frame when the visitor prefers reduced motion. */
(function () {
  var canvas = document.getElementById('city-bg');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var D = {
    AI_CORE:     { color: '#bf00ff', dark: '#5a007a', ground: '#1a0030' },
    DATA:        { color: '#00d4ff', dark: '#005577', ground: '#001a22' },
    FIREWALL:    { color: '#ff4400', dark: '#7a1500', ground: '#1a0800' },
    HUB:         { color: '#ffd700', dark: '#665500', ground: '#1a1100' },
    DARKWEB:     { color: '#00ff88', dark: '#006633', ground: '#001a0e' },
    RESIDENTIAL: { color: '#4488ff', dark: '#1a3577', ground: '#060f22' },
    BUFFER:      { color: '#334455', dark: '#1a2233', ground: '#0a0e14' }
  };
  var GRID = 22, TW = 72, TH = 36, MAX_H = 160;

  function prng(seed) {
    var s = seed;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Static world (identical generation to the source) ──
  var rng = prng(42), tiles = [], blds = [], hubs = [];
  function districtAt(r, c) {
    var dx = r - GRID / 2, dy = c - GRID / 2, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 3.2) return 'AI_CORE';
    if (d < 4.8) return 'RESIDENTIAL';
    var a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (d < 9.5) {
      if (a > -90 && a <= 0) return 'DATA';
      if (a > 0 && a <= 90) return 'HUB';
      if (a > 90 || a <= -135) return 'DARKWEB';
      return 'FIREWALL';
    }
    if (r < 3 || r > GRID - 3 || c < 3 || c > GRID - 3) return 'FIREWALL';
    return 'BUFFER';
  }
  for (var r = 0; r < GRID; r++) {
    tiles[r] = []; blds[r] = [];
    for (var c = 0; c < GRID; c++) {
      var dist = districtAt(r, c);
      tiles[r][c] = dist;
      if (rng() > 0.22) {
        var m = 20;
        if (dist === 'AI_CORE') m = rng() > 0.3 ? MAX_H : 80;
        if (dist === 'DATA') m = rng() > 0.4 ? 90 : 50;
        if (dist === 'FIREWALL') m = rng() > 0.5 ? 60 : 30;
        if (dist === 'HUB') m = rng() > 0.3 ? 100 : 45;
        if (dist === 'DARKWEB') m = rng() > 0.6 ? 35 : 18;
        if (dist === 'RESIDENTIAL') m = rng() > 0.4 ? 55 : 28;
        if (dist === 'BUFFER') m = rng() > 0.7 ? 25 : 12;
        blds[r][c] = { h: Math.max(8, Math.floor(rng() * m)), w: 0.55 + rng() * 0.45, lit: rng() > 0.4, antenna: dist === 'HUB' && rng() > 0.5 };
      } else blds[r][c] = null;
    }
  }
  for (r = 0; r < GRID; r++) for (c = 0; c < GRID; c++) {
    var t0 = tiles[r][c];
    if ((t0 === 'AI_CORE' || t0 === 'HUB' || t0 === 'DATA') && blds[r][c] && rng() > 0.6) hubs.push({ r: r, c: c, dist: t0 });
  }

  // ── Animated state ──
  var W = 0, H = 0, zoom = 1, tick = 0, packets = [];
  var rain = [], pts = [], i;
  for (i = 0; i < 120; i++) {
    var chars = [];
    for (var k = 0; k < 20; k++) chars.push(String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)));
    rain.push({ x: Math.random() * 3000, y: Math.random() * 2000, speed: 1.5 + Math.random() * 3, len: 4 + Math.floor(Math.random() * 12), chars: chars, alpha: 0.15 + Math.random() * 0.45 });
  }
  var PC = ['#00d4ff', '#bf00ff', '#00ff88', '#ffd700'];
  for (i = 0; i < 60; i++) pts.push({ x: Math.random() * 3000, y: Math.random() * 2000, vx: (Math.random() - 0.5) * 0.4, vy: -0.2 - Math.random() * 0.5, r: 1 + Math.random() * 2.5, alpha: 0.2 + Math.random() * 0.5, color: PC[Math.floor(Math.random() * 4)] });

  function rgba(hex, a) {
    return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')';
  }
  function iso(r, c) {
    var ox = W / 2 - (GRID / 2 * TW / 2 * zoom), oy = H / 3 - (GRID / 4 * TH / 2 * zoom);
    return { x: (c - r) * (TW / 2) * zoom + ox, y: (c + r) * (TH / 2) * zoom + oy };
  }

  function ground(r, c) {
    var d = D[tiles[r][c]], p = iso(r, c), tw = (TW / 2) * zoom, th = (TH / 2) * zoom;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - th); ctx.lineTo(p.x + tw, p.y); ctx.lineTo(p.x, p.y + th); ctx.lineTo(p.x - tw, p.y); ctx.closePath();
    var g = ctx.createLinearGradient(p.x - tw, p.y - th, p.x + tw, p.y + th);
    g.addColorStop(0, d.ground); g.addColorStop(1, '#020610');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba(d.color, 0.15); ctx.lineWidth = 0.5; ctx.stroke();
  }

  function building(r, c) {
    var b = blds[r][c]; if (!b) return;
    var d = D[tiles[r][c]], h = b.h * zoom, tw = (TW / 2) * zoom * b.w, th = (TH / 2) * zoom * b.w, p = iso(r, c);
    ctx.beginPath(); ctx.moveTo(p.x - tw, p.y); ctx.lineTo(p.x, p.y + th); ctx.lineTo(p.x, p.y + th - h); ctx.lineTo(p.x - tw, p.y - h); ctx.closePath();
    var gl = ctx.createLinearGradient(p.x - tw, p.y, p.x, p.y + th);
    gl.addColorStop(0, rgba(d.dark, 0.9)); gl.addColorStop(1, '#020610'); ctx.fillStyle = gl; ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x, p.y + th); ctx.lineTo(p.x + tw, p.y); ctx.lineTo(p.x + tw, p.y - h); ctx.lineTo(p.x, p.y + th - h); ctx.closePath();
    var gr = ctx.createLinearGradient(p.x, p.y + th, p.x + tw, p.y);
    gr.addColorStop(0, '#020610'); gr.addColorStop(1, rgba(d.dark, 0.7)); ctx.fillStyle = gr; ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x, p.y - h - th); ctx.lineTo(p.x + tw, p.y - h); ctx.lineTo(p.x, p.y - h + th); ctx.lineTo(p.x - tw, p.y - h); ctx.closePath();
    var gt = ctx.createRadialGradient(p.x, p.y - h, 0, p.x, p.y - h, tw);
    gt.addColorStop(0, rgba(d.color, 0.5)); gt.addColorStop(1, rgba(d.dark, 0.8)); ctx.fillStyle = gt; ctx.fill();
    ctx.shadowColor = d.color; ctx.shadowBlur = 12; ctx.strokeStyle = rgba(d.color, 0.5); ctx.lineWidth = 0.8; ctx.stroke(); ctx.shadowBlur = 0;
    if (b.lit) {
      var rows = Math.max(1, Math.floor(b.h / 12));
      for (var wr = 0; wr < rows; wr++) {
        var wy = p.y + th - h + (wr + 1) * (h / (rows + 1));
        for (var wc = 0; wc < 2; wc++) {
          var wx = p.x - tw + (wc + 1) * (tw / 3), wwy = wy + wx * (th / tw) - p.x * (th / tw);
          ctx.fillStyle = rgba(d.color, 0.6 * (0.5 + 0.5 * Math.sin(tick * 0.04 + r * 0.7 + c * 0.9 + wr)));
          ctx.fillRect(wx - 2 * zoom, wwy - 3 * zoom, 3 * zoom, 4 * zoom);
        }
      }
    }
    if (b.antenna) {
      var ax = p.x, ay = p.y - h - th, aH = 20 * zoom;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - aH);
      ctx.strokeStyle = rgba(d.color, 0.8); ctx.lineWidth = 1.5; ctx.shadowColor = d.color; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      if (Math.sin(tick * 0.07 + r + c) > 0.5) {
        ctx.beginPath(); ctx.arc(ax, ay - aH, 2.5 * zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  }

  function bez(s, m, e, t) { return (1 - t) * (1 - t) * s + 2 * (1 - t) * t * m + t * t * e; }
  function packet(k) {
    var sp = iso(k.src.r, k.src.c), dp = iso(k.dst.r, k.dst.c);
    var sx = sp.x, sy = sp.y - (blds[k.src.r][k.src.c] ? blds[k.src.r][k.src.c].h : 0) * zoom;
    var ex = dp.x, ey = dp.y - (blds[k.dst.r][k.dst.c] ? blds[k.dst.r][k.dst.c].h : 0) * zoom;
    var mx = (sx + ex) / 2, my = (sy + ey) / 2 - 40 * zoom;
    ctx.beginPath(); ctx.arc(bez(sx, mx, ex, k.t), bez(sy, my, ey, k.t), 3 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = k.color; ctx.shadowColor = k.color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    for (var j = 1; j <= 4; j++) {
      var tt = Math.max(0, k.t - j * 0.015);
      ctx.beginPath(); ctx.arc(bez(sx, mx, ex, tt), bez(sy, my, ey, tt), Math.max(0.5, (2.5 - j * 0.4) * zoom), 0, Math.PI * 2);
      ctx.globalAlpha = Math.max(0, 0.3 - j * 0.06); ctx.fillStyle = k.color; ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  function step() {
    tick++;
    if (tick % 8 === 0 && packets.length < 40 && hubs.length > 1) {
      var s = hubs[Math.floor(Math.random() * hubs.length)], e = s;
      while (e === s) e = hubs[Math.floor(Math.random() * hubs.length)];
      packets.push({ src: s, dst: e, t: 0, speed: 0.006 + Math.random() * 0.008, color: D[s.dist].color });
    }
    for (var n = packets.length - 1; n >= 0; n--) { packets[n].t += packets[n].speed; if (packets[n].t >= 1) packets.splice(n, 1); }
    rain.forEach(function (d) {
      d.y += d.speed;
      if (d.y > H + 200) { d.y = -200; d.x = Math.random() * W; }
      if (tick % 12 === 0) d.chars[0] = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
    });
    pts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
      if (p.x < -20 || p.x > W + 20) p.x = Math.random() * W;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#020610'); sky.addColorStop(1, '#030a18'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    var hg = ctx.createRadialGradient(W / 2, H / 3, 0, W / 2, H / 3, W * 0.6);
    hg.addColorStop(0, 'rgba(0,212,255,0.06)'); hg.addColorStop(1, 'transparent'); ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    ctx.font = '12px Courier New';
    rain.forEach(function (d) {
      ctx.fillStyle = 'rgba(0,212,255,' + d.alpha * 0.6 + ')';
      for (var j = 0; j < d.len; j++) { ctx.globalAlpha = ((d.len - j) / d.len) * d.alpha; ctx.fillText(d.chars[j % d.chars.length], d.x, d.y - j * 14); }
      ctx.globalAlpha = 1;
    });
    for (var sum = 0; sum < GRID * 2 - 1; sum++) for (var r = 0; r < GRID; r++) {
      var c = sum - r; if (c < 0 || c >= GRID) continue;
      ground(r, c); if (blds[r][c]) building(r, c);
    }
    packets.forEach(packet);
    pts.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(tick * 0.03 + p.x));
      ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    });
    var fade = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    fade.addColorStop(0, 'transparent'); fade.addColorStop(1, 'rgba(2,6,16,0.65)'); ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
  }

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight;
    // Keep the city legible on phones: the source sizes to a desktop viewport.
    zoom = W < 760 ? Math.max(0.55, W / 900) : 1;
    if (still) draw();
  }
  window.addEventListener('resize', resize);
  resize();

  if (still) { for (var w = 0; w < 120; w++) step(); draw(); return; }
  function loop() { if (!document.hidden) { step(); draw(); } requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
