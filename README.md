# yazan.boshmaf.com

Personal site of Yazan Boshmaf, built with Jekyll and deployed to GitHub Pages
by the workflow in `.github/workflows/pages.yml`. Pushing to `main` publishes
it. Coding agents (Codex, Claude Code and others) should read
[AGENTS.md](AGENTS.md), which has the same information in more detail.

## Everyday edits

| To change… | Edit |
| --- | --- |
| News | `_data/news.yml` (newest first; items are Markdown; `award: true` highlights an entry) |
| Publications | `_data/pubs.yml` (newest first; `selected: true` shows it on the homepage; `topics` drive the filters) |
| Contact details, links, nav | `_config.yml` |
| Homepage copy | `index.html` |
| Research statement | `research.html` |
| CV | replace `docs/boshmaf_cv.pdf` |

Everything else that lists papers or news is generated from the two data files
on every build: the search index (`search.json`), Atom feed (`feed.xml`),
`sitemap.xml`, and the agent files below.

Keep publication authors in the form `A, B, and C`, and give every paper a
`month`. To add a publication topic, also add a filter button in `pubs.html`
and an entry in `TOPICS` in `assets/js/webmcp.js`.

## For AI agents

The site is set up to be read by AI crawlers and assistants. What's there, and
whether you need to touch it:

| File | Updates itself? |
| --- | --- |
| `robots.txt`: allows all crawlers and declares [Content Signals](https://contentsignals.org) (search and AI answers yes, AI training no) | Fixed text |
| `llms.txt`: the agent-facing index of the site | Links and paper count yes; **edit the summary paragraph by hand** when your role or research focus changes |
| Markdown versions of each page (`research.html` → `research.md`) and `llms-full.txt` with all of them | Yes, written on every deploy by `_scripts/agent_markdown.py` |
| `pubs.json`, `news.json` | Yes, from `_data/` |
| schema.org `ScholarlyArticle` data on the publications page | Yes, from `_data/pubs.yml` |
| [WebMCP](https://github.com/webmachinelearning/webmcp) tools in `assets/js/webmcp.js` (search publications, BibTeX, news, contact) | Yes, they read `pubs.json` and `news.json` |

**When you add a page:** add it to `nav` in `_config.yml`, to `PAGES` in
`_scripts/agent_markdown.py`, and to the "Pages" list in `llms.txt`.

**When you change page markup** (for example, how a paper is laid out): the
Markdown script reshapes specific elements before converting them. If it can't
find what it expects, the deploy fails and the previous version stays live.
[AGENTS.md](AGENTS.md) lists what it depends on.

The Markdown versions are built during deploy only, not by `jekyll serve`.

## Run locally

Optional: pushing to `main` builds and deploys the site without any local
setup. To preview changes first, you need Ruby 3.3 or newer.

**Install Ruby**

- **macOS:** the built-in Ruby is too old. Install a current one with
  [Homebrew](https://brew.sh) (`brew install ruby`, then follow its note about
  adding it to your `PATH`) or a version manager such as `rbenv`.
- **Windows:** install Ruby 3.3+ **with Devkit** from
  [RubyInstaller](https://rubyinstaller.org) and let it run `ridk install` at
  the end.
- **Linux:** use your distribution's `ruby` package if it is 3.3 or newer
  (check with `ruby -v`), otherwise `rbenv` or `asdf`. Also install the
  build tools (`build-essential` on Debian/Ubuntu, `base-devel` on Arch).

**Build and serve**

```bash
gem install bundler
bundle install
bundle exec jekyll serve --livereload
```

Then open http://localhost:4000. The site rebuilds when you save a file;
changes to `_config.yml` need a restart.

**Build the Markdown versions too** (needs Python 3):

```bash
bundle exec jekyll build
pip install -r _scripts/requirements.txt
python _scripts/agent_markdown.py _site
```

## Deploy

Every push to `main` runs `.github/workflows/pages.yml`: it builds the site
with Jekyll, writes the Markdown versions, and publishes to GitHub Pages. It
goes live in about a minute; the run is listed under the repository's
**Actions** tab. You can also start it by hand from there.

A few rules keep the site working:

- The page header sets a strict security policy. Put scripts in `assets/js/`
  and styles in `assets/css/site.css`; inline `<script>` code and `style=`
  attributes are blocked. Adding a script, font or image from another site
  means updating the policy in `_includes/head.html`.
- Your email and phone are assembled by JavaScript to keep them away from
  scrapers. Don't write them into the HTML.
- Pages must work without JavaScript; anything that needs it starts hidden.

## Cloudflare

The domain runs through Cloudflare (zone `boshmaf.com`). These settings live in
the Cloudflare dashboard, not in this repo:

- **Web Analytics** is on. That's why the security policy allows
  `static.cloudflareinsights.com` and `cloudflareinsights.com`.
- **Redirect rule:** `boshmaf.com` → `yazan.boshmaf.com`.
- **Two URL Rewrite Rules** serve the Markdown version of a page when an agent
  asks for Markdown (`Accept: text/markdown`), one for `*.html` pages and one
  for the homepage.
- **One Response Header Transform Rule** adds a `Link` header pointing to
  `llms.txt` and the sitemap, plus `Vary: Accept`.

[AGENTS.md](AGENTS.md) has the exact expressions, in case the rules need
recreating.

## One-time setup

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**
and keep the custom domain `yazan.boshmaf.com` set there. The `github-pages`
environment only accepts deployments from `main`; if the default branch is
renamed, update that policy, the workflow trigger and the Pages settings
together.
