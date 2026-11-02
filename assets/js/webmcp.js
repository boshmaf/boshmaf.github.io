// WebMCP: read-only tools for AI agents running in the visitor's browser.
// Does nothing in browsers without document.modelContext (most of them, for now).
(() => {
  const mc = document.modelContext || navigator.modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;
  const base = document.currentScript?.dataset.base || "/";
  const cache = {};
  const load = name => cache[name] ??= fetch(base + name).then(r => r.json());
  const reply = data => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
  const words = s => String(s || "").toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (p, q) => {
    const hay = [p.title, p.authors, p.venue, p.ref, p.year, ...(p.topics || [])].join(" ").toLowerCase();
    return words(q).every(w => hay.includes(w));
  };
  const TOPICS = { ai: "AI security", eval: "Evaluation", agents: "Agents", chain: "Blockchain & dark web", web: "Social web & abuse", mobile: "Mobile & usable security", systems: "Systems" };

  const tools = [
    {
      name: "search_publications",
      description: "Search Yazan Boshmaf's publications by words in the title, co-authors or venue, optionally limited to a topic or a year range. Returns title, authors, venue, year, link and topics, newest first.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words that must all appear, e.g. \"poisoning\" or \"Ripeanu NDSS\". Omit to list everything." },
          topic: { type: "string", enum: Object.keys(TOPICS), description: "Topic filter: " + Object.entries(TOPICS).map(([k, v]) => `${k} = ${v}`).join(", ") },
          since: { type: "integer", description: "Earliest year to include" },
          limit: { type: "integer", minimum: 1, maximum: 50, description: "Maximum results (default 10)" }
        }
      },
      async execute({ query = "", topic, since, limit = 10 } = {}) {
        const pubs = (await load("pubs.json"))
          .filter(p => matches(p, query) && (!topic || (p.topics || []).includes(topic)) && (!since || p.year >= since))
          .slice(0, limit)
          .map(({ title, authors, venue, ref, year, url, topics, award }) => ({ title, authors, venue, ref, year, url, topics, ...(award && { award }) }));
        return reply(pubs.length ? pubs : "No publications match.");
      }
    },
    {
      name: "get_bibtex",
      description: "Get a BibTeX entry for one of Yazan Boshmaf's papers, found by words from its title.",
      inputSchema: {
        type: "object",
        properties: { title: { type: "string", description: "Title, or distinctive words from it" } },
        required: ["title"]
      },
      async execute({ title }) {
        const p = (await load("pubs.json")).find(p => words(title).every(w => p.title.toLowerCase().includes(w)));
        if (!p) return reply("No paper with that title. Try search_publications first.");
        const type = p.kind === "journal" || p.kind === "preprint" ? "article" : "inproceedings";
        return reply(window.__bibtex({ ...p, type }));
      }
    },
    {
      name: "list_news",
      description: "List Yazan Boshmaf's recent news (talks, travel, service, awards), newest first. Items are Markdown.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "integer", minimum: 1, maximum: 40, description: "Number of months to include (default 6)" } }
      },
      async execute({ limit = 6 } = {}) {
        return reply((await load("news.json")).slice(0, limit));
      }
    },
    {
      name: "get_contact",
      description: "Get Yazan Boshmaf's contact details: work and personal email, office address and profile links.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        const email = Object.fromEntries([...document.querySelectorAll(".email[data-user]")].map(e => [e.dataset.kind, `${e.dataset.user}@${e.dataset.domain}`]));
        const links = Object.fromEntries([...document.querySelectorAll("footer .links a")].map(a => [a.textContent.trim(), a.href]));
        return reply({
          email,
          office: document.querySelector("footer .foot > div:nth-child(2) p")?.innerText.split("\n"),
          links
        });
      }
    }
  ];

  for (const tool of tools) {
    try {
      Promise.resolve(mc.registerTool({ ...tool, annotations: { readOnlyHint: true } })).catch(() => {});
    } catch {}
  }
})();
