"""Write a Markdown twin of every built page, for AI agents and crawlers.

Run after `jekyll build`:  python _scripts/agent_markdown.py _site
For each page.html it writes page.md next to it (index.html -> index.md),
plus llms-full.txt with all pages in one file. The deploy workflow runs this;
`jekyll serve` does not, so the .md files only exist on the live site.
"""
import sys
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from markdownify import markdownify

PAGES = ["index.html", "research.html", "pubs.html", "news.html", "students.html"]


def tidy(soup, main, page_url):
    """Reshape site-specific markup so it converts to readable Markdown."""
    for el in main.select("script, style, button, canvas, figcaption, aside.toc, .actions, [hidden]"):
        el.decompose()
    # The hero animation is a canvas; keep its description instead
    for fig in main.select("figure.graph-card"):
        fig.decompose()
    for a in main.select("a.cite"):
        a.unwrap()
    for a in main.select("a[href]"):
        href = urljoin(page_url, a["href"])
        # Links between pages point at their Markdown twins
        for name in PAGES:
            if href == urljoin(page_url, "/" + name):
                href = href[:-len(".html")] + ".md"
        a["href"] = href
    for img in main.select("img"):
        img.decompose()

    def text(el):
        return " ".join(el.get_text(" ").split())

    def para(md_text):
        p = soup.new_tag("p")
        p.string = md_text
        return p

    for kind in main.select(".email-kind"):
        kind.append(":")
    for small in main.select("small"):
        small.insert_before(" · ")
    for tags in main.select(".tags"):
        tags.replace_with(para("Topics: " + ", ".join(text(s) for s in tags.select("span"))))
    for li in main.select(".arc li"):
        year, name, desc = (text(s) for s in li.find_all(recursive=False))
        li.clear()
        b = soup.new_tag("b")
        b.string = name
        li.extend([year + " · ", b, ": " + desc])
    for t in main.select("time"):
        b = soup.new_tag("b")
        b.string = text(t)
        t.replace_with(b)
    for sys_link in main.select("a.sys"):
        h3 = sys_link.find("h3")
        a = soup.new_tag("a", href=sys_link["href"])
        a.string = text(h3)
        h3.clear()
        h3.append(a)
        sys_link.name = "div"
        del sys_link["href"]
    for span in main.select(".ref-venue"):
        span.insert_before(" ")
    # Publications: one block per paper, years as headings
    for li in main.select("li.year"):
        li.name = "h2"
    for li in main.select("li.pub"):
        title = li.find("h3")
        lines = [" ".join(li.select_one(".authors").get_text().split()),
                 " · ".join(text(s) for s in li.select(".meta span"))]
        block = soup.new_tag("div")
        block.append(title)
        for line in lines:
            block.append(para(line))
        li.replace_with(block)
    for ul in main.select("ul.pubs"):
        ul.name = "div"


def convert(site, name, base):
    html = (site / name).read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    page_url = urljoin(base, "" if name == "index.html" else name)
    main = soup.find("main")
    tidy(soup, main, page_url)
    foot = soup.select_one("footer .foot")
    if foot:
        tidy(soup, foot, page_url)
    title = soup.title.get_text().strip()
    desc = soup.find("meta", attrs={"name": "description"})["content"]
    opts = dict(heading_style="ATX", bullets="-", newline_style="BACKSLASH")
    body = markdownify(str(main), **opts)
    contact = markdownify(str(foot), **opts) if foot else ""
    md = f"---\ntitle: {title}\ndescription: {desc}\nurl: {page_url}\n---\n\n{body}\n\n{contact}"
    while "\n\n\n" in md:
        md = md.replace("\n\n\n", "\n\n")
    md = "\n".join(line.rstrip() for line in md.splitlines()).strip() + "\n"
    (site / name).with_suffix(".md").write_text(md, encoding="utf-8", newline="\n")
    return md


def main():
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
    base = BeautifulSoup((site / "index.html").read_text(encoding="utf-8"), "html.parser") \
        .find("link", rel="canonical")["href"]
    docs = [convert(site, name, base) for name in PAGES]
    (site / "llms-full.txt").write_text("\n\n".join(docs), encoding="utf-8", newline="\n")
    print(f"wrote {len(docs)} Markdown pages and llms-full.txt")


if __name__ == "__main__":
    main()
