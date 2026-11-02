// Homepage hero: an agent interaction graph where a reference monitor denies a
// path from untrusted web content to a privileged shell tool.
(() => {
  const cv = document.getElementById("graph");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  const nodes = {
    user: { x: .13, y: .2, l: "User" },
    agent: { x: .44, y: .3, l: "Agent" },
    model: { x: .76, y: .14, l: "LLM" },
    mcp: { x: .8, y: .44, l: "MCP server" },
    search: { x: .5, y: .62, l: "tool:search" },
    web: { x: .17, y: .64, l: "untrusted web", untrusted: true },
    shell: { x: .8, y: .76, l: "tool:shell", priv: true },
    mem: { x: .17, y: .42, l: "memory" }
  };
  const BLOCKED = ["search", "shell", true];
  const edges = [["user", "agent"], ["agent", "model"], ["model", "agent"], ["agent", "mcp"], ["agent", "search"],
    ["search", "web"], ["web", "search"], ["agent", "mem"], ["mcp", "shell"], BLOCKED];

  const C = {};
  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    ["--ink", "--ink-2", "--rule", "--accent", "--block", "--graph-node", "--surface", "--award"].forEach(k => C[k] = s.getPropertyValue(k).trim());
  };
  readColors();

  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size();
  const P = n => [nodes[n].x * W, nodes[n].y * (H - 40) + 12];
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };

  const packets = [];
  let last = 0, flash = 0;
  function draw(now) {
    const dt = Math.min((now - last) / 1000 || 0, .05); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    edges.forEach(([a, b, bad]) => {
      const [x1, y1] = P(a), [x2, y2] = P(b);
      ctx.strokeStyle = bad ? C["--block"] : C["--rule"]; ctx.lineWidth = 1.5;
      ctx.setLineDash(bad ? [5, 5] : []);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.setLineDash([]);

    const [sx, sy] = P("search"), [hx, hy] = P("shell");
    const mx = sx + (hx - sx) * .55, my = sy + (hy - sy) * .55;
    ctx.fillStyle = C["--surface"]; ctx.strokeStyle = C["--block"]; ctx.lineWidth = 1.5 + flash * 2;
    rr(mx - 34, my - 11, 68, 22, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C["--block"]; ctx.font = "500 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("DENY", mx, my + 1);
    flash = Math.max(0, flash - dt * 2);

    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.t += dt * p.sp;
      const [a, b, bad] = p.e, [x1, y1] = P(a), [x2, y2] = P(b);
      if (bad && p.t >= .55) { flash = 1; packets.splice(i, 1); continue; }
      if (p.t >= 1) { packets.splice(i, 1); continue; }
      ctx.fillStyle = bad ? C["--block"] : C["--accent"];
      ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * p.t, y1 + (y2 - y1) * p.t, 3.5, 0, 7); ctx.fill();
    }

    Object.values(nodes).forEach(n => {
      const x = n.x * W, y = n.y * (H - 40) + 12;
      ctx.font = "500 12px 'JetBrains Mono', monospace";
      const w = ctx.measureText(n.l).width + 22;
      ctx.fillStyle = C["--graph-node"];
      ctx.strokeStyle = n.untrusted ? C["--block"] : n.priv ? C["--award"] : C["--ink-2"];
      ctx.lineWidth = 1.2; ctx.setLineDash(n.untrusted ? [3, 3] : []);
      rr(x - w / 2, y - 14, w, 28, 8); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C["--ink"]; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n.l, x, y + 1);
    });
  }

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const redraw = () => { readColors(); if (still) draw(0); };
  document.addEventListener("themechange", redraw);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  addEventListener("resize", () => { size(); if (still) draw(0); });
  document.fonts?.ready.then(() => still && draw(0));
  if (still) { draw(0); return; }

  // Animate only while the hero is on screen
  let visible = true, frame = 0, raf = 0;
  const loop = now => {
    frame++;
    if (frame % 22 === 0 && packets.length < 14) packets.push({ e: edges[Math.floor(Math.random() * (edges.length - 1))], t: 0, sp: .5 + Math.random() * .4 });
    if (frame % 160 === 0) packets.push({ e: BLOCKED, t: 0, sp: .6 });
    draw(now);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }).observe(cv);
})();
