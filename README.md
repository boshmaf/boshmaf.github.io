# yazan.boshmaf.com

Personal site of Yazan Boshmaf, built with Jekyll and deployed to GitHub Pages
by the workflow in `.github/workflows/pages.yml`.

## Everyday edits

| To change… | Edit |
| --- | --- |
| News | `_data/news.yml` (newest first; items are Markdown; `award: true` highlights an entry) |
| Publications | `_data/pubs.yml` (newest first; `selected: true` shows it on the homepage; `topics` drive the filters) |
| Contact details, links, nav | `_config.yml` |
| Homepage copy | `index.html` |
| Research statement | `research.html` |
| CV | replace `docs/boshmaf_cv.pdf` |

The search index (`search.json`), Atom feed (`feed.xml`) and `sitemap.xml` are
generated from the same data on every build.

## For AI agents

- `robots.txt` allows all crawlers and declares
  [Content Signals](https://contentsignals.org): search and AI answers yes,
  AI training no.
- `llms.txt` is the agent-facing index of the site; edit its summary there.
- Every page gets a Markdown twin (`research.html` → `research.md`) and
  `llms-full.txt` holds them all. The deploy workflow builds these with
  `_scripts/agent_markdown.py` after Jekyll runs, so they don't appear under
  `jekyll serve`. To try it locally:
  `pip install -r _scripts/requirements.txt`, then
  `python _scripts/agent_markdown.py _site` after `bundle exec jekyll build`.
- `pubs.json` and `news.json` expose the raw data; the publications page also
  carries schema.org `ScholarlyArticle` data.
- `assets/js/webmcp.js` offers read-only [WebMCP](https://github.com/webmachinelearning/webmcp)
  tools (search publications, BibTeX, news, contact) to browser AI agents.
  Browsers without WebMCP ignore it.

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

## One-time setup

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**
and keep the custom domain `yazan.boshmaf.com` set there.
