// Homepage hero: an agent interaction graph with taint tracking. The agent asks
// tool:search, whose result from the untrusted web comes back tainted. When the
// agent then calls tool:shell with that data, a policy check outside the agent
// denies the call; trusted calls on the same edge pass.
(() => {
  const cv = document.getElementById("graph");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");

  // Tools never call each other; every tool result goes back to the agent.
  const N = {
    user: { x: .12, y: .1, l: "User" },
    agent: { x: .46, y: .32, l: "Agent" },
    model: { x: .83, y: .1, l: "LLM" },
    mcp: { x: .84, y: .44, l: "MCP server" },
    mem: { x: .13, y: .44, l: "memory" },
    search: { x: .26, y: .68, l: "tool:search" },
    web: { x: .22, y: .93, l: "untrusted web", untrusted: true },
    shell: { x: .8, y: .82, l: "tool:shell", priv: true }
  };
  const LINKS = [["user", "agent"], ["agent", "model"], ["agent", "mcp"], ["agent", "mem"], ["agent", "search"], ["search", "web"], ["agent", "shell"]];
  const NOISE = [["user", "agent"], ["agent", "model"], ["model", "agent"], ["agent", "mcp"], ["mcp", "agent"], ["agent", "mem"], ["mem", "agent"]];
  const CHECK = .5;   // where along agent → shell the policy check happens
  const STRIP = 40;   // decision strip below the graph
  const TAINT_FOR = 3;   // long enough to cover the denied call, short enough to clear before the next cycle
  const CYCLE = 11.5;

  const C = {};
  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    ["--ink", "--ink-2", "--rule", "--accent", "--block", "--allow", "--graph-node", "--surface", "--award"].forEach(k => C[k] = s.getPropertyValue(k).trim());
  };
  readColors();
  const alpha = (hex, a) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };

  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size();
  const P = n => [N[n].x * W, N[n].y * (H - STRIP - 36) + 18];
  const at = (a, b, t) => { const [x1, y1] = P(a), [x2, y2] = P(b); return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]; };
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  const mono = (px, w = 500) => { ctx.font = `${w} ${px}px 'JetBrains Mono', monospace`; };
  const box = n => { mono(12); const [x, y] = P(n), w = ctx.measureText(N[n].l).width + 22; return { x: x - w / 2, y: y - 14, w, h: 28, cx: x, cy: y }; };

  let clock = 0, searchTaint = -99, agentTaint = -99, status = null;
  const packets = [], marks = [], timers = [];
  const later = (s, fn) => timers.push({ at: clock + s, fn });
  const send = (a, b, o = {}) => packets.push({ a, b, t: 0, sp: o.sp || .7, taint: !!o.taint, then: o.then });
  const decide = (allow, x, y) => { marks.push({ allow, x, y, age: 0 }); status = { allow, age: 0 }; };

  // A trusted shell call passes first; then agent → search → web → search
  // (tainted) → agent (tainted) → shell (denied).
  const story = () => send("agent", "shell", { sp: .6, then: () => later(.4, () =>
    send("agent", "search", { then: () =>
      send("search", "web", { then: () =>
        send("web", "search", { taint: true, then: () => {
          searchTaint = clock;
          send("search", "agent", { taint: true, then: () => {
            agentTaint = clock;
            later(.5, () => send("agent", "shell", { taint: true, sp: .6 }));
          } });
        } }) }) })) });

  const tag = (text, x, y, a) => {
    mono(10);
    const w = ctx.measureText(text).width + 14;
    ctx.globalAlpha = a;
    ctx.fillStyle = C["--surface"]; ctx.strokeStyle = C["--block"]; ctx.lineWidth = 1;
    rr(x, y - 10, w, 20, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C["--block"]; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, x + 7, y + .5);
    ctx.globalAlpha = 1;
  };
  const taintAlpha = since => { const k = clock - since; return k < 0 || k > TAINT_FOR ? 0 : Math.min(1, (TAINT_FOR - k) / .6); };

  function draw(dt) {
    clock += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i].at) timers.splice(i, 1)[0].fn();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const GH = H - STRIP;

    ctx.strokeStyle = C["--rule"]; ctx.lineWidth = 1.5;
    LINKS.forEach(([a, b]) => { const [x1, y1] = P(a), [x2, y2] = P(b); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });

    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.t += dt * p.sp;
      if (p.b === "shell" && !p.checked && p.t >= CHECK) {
        p.checked = true;
        decide(!p.taint, ...at(p.a, p.b, CHECK));
        if (p.taint) { packets.splice(i, 1); continue; }
      }
      if (p.t >= 1) { packets.splice(i, 1); p.then?.(); continue; }
      const [x, y] = at(p.a, p.b, p.t);
      ctx.fillStyle = p.taint ? C["--block"] : C["--accent"];
      ctx.beginPath(); ctx.arc(x, y, 3.8, 0, 7); ctx.fill();
    }

    Object.keys(N).forEach(n => {
      const b = box(n), nd = N[n];
      const ta = n === "search" ? taintAlpha(searchTaint) : n === "agent" ? taintAlpha(agentTaint) : 0;
      if (ta) {
        ctx.strokeStyle = alpha(C["--block"], ta); ctx.lineWidth = 2;
        rr(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 11); ctx.stroke();
      }
      ctx.fillStyle = C["--graph-node"];
      ctx.strokeStyle = nd.untrusted ? C["--block"] : nd.priv ? C["--award"] : C["--ink-2"];
      ctx.lineWidth = 1.2; ctx.setLineDash(nd.untrusted ? [3, 3] : []);
      rr(b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C["--ink"]; ctx.textAlign = "center"; ctx.textBaseline = "middle"; mono(12);
      ctx.fillText(nd.l, b.cx, b.cy + 1);
      // taint tags sit clear of their node: right of search, above the agent
      if (ta && n === "search") tag("tainted", b.x + b.w + 14, b.cy, ta);
      if (ta && n === "agent") { mono(10); const w = ctx.measureText("context tainted").width + 14; tag("context tainted", b.cx - w / 2, b.y - 22, ta); }
    });

    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i]; m.age += dt;
      const life = m.allow ? 1 : 2.4;
      if (m.age > life) { marks.splice(i, 1); continue; }
      const a = Math.min(1, (life - m.age) / .5), r = 11;
      ctx.globalAlpha = a;
      ctx.fillStyle = C["--surface"]; ctx.strokeStyle = m.allow ? C["--allow"] : C["--block"]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      if (m.allow) { ctx.moveTo(m.x - 5, m.y); ctx.lineTo(m.x - 1.4, m.y + 3.8); ctx.lineTo(m.x + 5.5, m.y - 3.8); }
      else { ctx.moveTo(m.x - r * .7, m.y + r * .7); ctx.lineTo(m.x + r * .7, m.y - r * .7); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // decision strip below the graph
    ctx.strokeStyle = C["--rule"]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(16, GH); ctx.lineTo(W - 16, GH); ctx.stroke();
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const sy = GH + STRIP / 2;
    if (status && status.age < 2.6) {
      status.age += dt;
      ctx.globalAlpha = Math.min(1, (2.6 - status.age) / .5);
      mono(11);
      ctx.fillStyle = status.allow ? C["--allow"] : C["--block"];
      const head = status.allow ? "✓ allowed" : "✕ denied";
      ctx.fillText(head, 18, sy);
      const hw = ctx.measureText(head + "  ").width;
      mono(11, 400); ctx.fillStyle = C["--ink"];
      ctx.fillText(status.allow ? "agent → tool:shell · trusted input" : "agent → tool:shell · untrusted → privileged", 18 + hw, sy);
      ctx.globalAlpha = 1;
    } else {
      mono(10.5, 400); ctx.fillStyle = C["--ink-2"];
      ctx.fillText("policy check on every call to tool:shell", 18, sy);
    }
  }

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const redraw = () => { readColors(); if (still) draw(0); };
  document.addEventListener("themechange", redraw);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  addEventListener("resize", () => { size(); if (still) draw(0); });

  if (still) {
    // one representative frame: a tainted call just denied
    clock = 1; searchTaint = agentTaint = .5;
    decide(false, ...at("agent", "shell", CHECK));
    marks[0].age = .3; status.age = .3;
    draw(0);
    document.fonts?.ready.then(() => draw(0));
    return;
  }

  let frame = 0, last = 0, raf = 0, visible = true, nextStory = .6;
  const loop = now => {
    const dt = Math.min((now - last) / 1000 || 0, .05); last = now;
    frame++;
    if (frame % 26 === 0 && packets.length < 12) { const e = NOISE[Math.floor(Math.random() * NOISE.length)]; send(e[0], e[1], { sp: .5 + Math.random() * .4 }); }
    if (clock >= nextStory) { story(); nextStory = clock + CYCLE; }
    draw(dt);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  // animate only while the hero is on screen
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }).observe(cv);
})();
