// Runs before first paint so a saved theme choice never flashes the other theme.
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}
  function sync() {
    var t = root.getAttribute("data-theme");
    var dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("is-dark", dark);
  }
  sync();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);
  window.__syncTheme = sync;
})();
