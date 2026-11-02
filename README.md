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

## Run locally

Requires Ruby 3.x.

```bash
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

## One-time setup

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**
and keep the custom domain `yazan.boshmaf.com` set there.
