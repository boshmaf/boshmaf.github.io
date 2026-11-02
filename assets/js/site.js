// Progressive enhancements. Every page works without this file.
(() => {
  const root = document.documentElement;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.append(t);
    setTimeout(() => t.remove(), 1800);
  }
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast(label + " copied"); }
    catch { toast("Copy failed. Select the text instead."); }
  }

  // Theme toggle: an explicit choice overrides the OS preference
  const themeBtn = $("#theme-toggle");
  const labelTheme = () => themeBtn.setAttribute("aria-label", root.classList.contains("is-dark") ? "Switch to light theme" : "Switch to dark theme");
  themeBtn.hidden = false;
  labelTheme();
  themeBtn.addEventListener("click", () => {
    const next = root.classList.contains("is-dark") ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    window.__syncTheme();
    labelTheme();
    document.dispatchEvent(new Event("themechange"));
  });

  // Contact details are assembled here to keep them away from simple scrapers
  $$(".email").forEach(a => {
    const addr = a.dataset.user + "@" + a.dataset.domain;
    a.textContent = addr;
    a.href = "mailto:" + addr;
  });
  $$("[data-copy-email]").forEach(b => {
    b.hidden = false;
    b.addEventListener("click", () => {
      const email = $(".email", b.closest(".copy-row"));
      const kind = $(".email-kind", b.closest(".copy-row"));
      copy(email.textContent, kind ? kind.textContent + " email" : "Email");
    });
  });
  $$(".phone").forEach(s => {
    const [cc, a, b] = s.dataset.phone.split(" ");
    s.textContent = `${cc} ${a}-${b}`;
  });

  // Publications: topic chips + text filter
  const pubList = $("#pubs");
  if (pubList) {
    const chips = $$(".chip");
    const input = $("#pub-filter");
    const count = $("#pub-count");
    const empty = $("#pubs-empty");
    let topic = "all";
    const apply = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      $$(".pub", pubList).forEach(li => {
        const ok = (topic === "all" || li.dataset.topics.split(" ").includes(topic)) &&
          (!q || li.textContent.toLowerCase().includes(q));
        li.hidden = !ok;
        if (ok) shown++;
      });
      $$(".year", pubList).forEach(y => {
        let n = y.nextElementSibling, any = false;
        while (n && !n.classList.contains("year")) { if (!n.hidden) any = true; n = n.nextElementSibling; }
        y.hidden = !any;
      });
      count.textContent = `${shown} of ${$$(".pub", pubList).length} papers`;
      empty.hidden = shown > 0;
    };
    chips.forEach(c => c.addEventListener("click", () => {
      chips.forEach(x => x.setAttribute("aria-pressed", x === c));
      topic = c.dataset.topic;
      apply();
    }));
    input.addEventListener("input", apply);
    $(".pub-tools").hidden = false;
    apply();
  }

  // BibTeX copy (also used by webmcp.js)
  const bibtex = d => {
    const first = d.authors.split(",")[0].trim().split(" ").pop().toLowerCase().replace(/[^a-z]/g, "");
    const word = d.title.split(/[\s:]+/).find(w => w.length > 3) || "paper";
    const key = first + d.year + word.toLowerCase().replace(/[^a-z]/g, "");
    const authors = d.authors.replace(/ et al\.?$/, " and others").replace(/,? and /g, ", ").split(/,\s*/).join(" and ");
    const where = d.type === "article" ? "journal" : "booktitle";
    return `@${d.type}{${key},\n  title = {${d.title}},\n  author = {${authors}},\n  ${where} = {${d.venue}},\n  year = {${d.year}},\n  url = {${d.url}}\n}`;
  };
  window.__bibtex = bibtex;
  $$("button.bib").forEach(b => {
    b.hidden = false;
    b.addEventListener("click", () => copy(bibtex(b.dataset), "BibTeX"));
  });

  // Research statement: highlight the section in view
  const tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map(a => [a.hash.slice(1), a]));
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { tocLinks.forEach(a => a.classList.remove("active")); byId.get(e.target.id)?.classList.add("active"); }
    }), { rootMargin: "-20% 0px -70% 0px" });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  // Search palette over /search.json (built by Jekyll)
  const dlg = $("#palette"), qIn = $("#palette-q"), out = $("#palette-results"), openBtn = $("#open-search");
  if (!dlg || typeof dlg.showModal !== "function") return;
  openBtn.hidden = false;
  let index = null, hits = [], sel = 0;
  async function load() {
    if (index) return;
    try { index = await (await fetch(openBtn.dataset.index || "/search.json")).json(); }
    catch { index = []; }
  }
  function draw() {
    out.innerHTML = hits.map((r, i) =>
      `<li><button type="button" role="option" aria-selected="${i === sel}" data-i="${i}"><span class="k">${esc(r.k)}</span><span>${esc(r.t)}</span></button></li>`).join("") ||
      `<li class="empty">${qIn.value ? "Nothing found. Try a venue like “RAID” or a topic like “bitcoin”." : "Start typing to search."}</li>`;
    out.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }
  function search() {
    const words = qIn.value.toLowerCase().split(/\s+/).filter(Boolean);
    hits = words.length ? index.filter(r => words.every(w => r.s.includes(w))).slice(0, 20) : index.filter(r => r.k === "Page");
    sel = 0; draw();
  }
  function go(r) {
    dlg.close();
    if (/^https?:/.test(r.u) && !r.u.startsWith(location.origin)) window.open(r.u, "_blank", "noopener");
    else location.href = r.u;
  }
  async function open() {
    qIn.value = "";
    dlg.showModal();
    await load();
    index.forEach(r => { r.s ??= (r.k + " " + r.t + " " + (r.x || "")).toLowerCase(); });
    search();
  }
  openBtn.addEventListener("click", open);
  addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); dlg.open ? dlg.close() : open(); }
    else if (e.key === "/" && !dlg.open && !typing) { e.preventDefault(); open(); }
  });
  qIn.addEventListener("input", () => index && search());
  qIn.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, hits.length - 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === "Enter" && hits[sel]) go(hits[sel]);
  });
  out.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) go(hits[b.dataset.i]); });
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
})();
