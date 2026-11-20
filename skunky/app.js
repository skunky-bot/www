(function () {
  "use strict";
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var menu = document.getElementById("menu-toggle");
  var mobile = document.getElementById("mobile-nav");
  var form = document.getElementById("scan-form");
  var result = document.getElementById("prepared-result");
  var summary = document.getElementById("prepared-summary");
  var key = "skunky-colour-theme";

  function currentTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit) return explicit;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    toggle.setAttribute("title", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  try {
    var saved = window.localStorage.getItem(key);
    if (saved === "dark" || saved === "light") setTheme(saved);
  } catch (_) { /* local preference storage may be blocked */ }
  toggle.setAttribute("aria-label", currentTheme() === "dark" ? "Switch to light theme" : "Switch to dark theme");
  toggle.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    try { window.localStorage.setItem(key, next); } catch (_) { /* storage unavailable */ }
  });

  function closeMenu(restoreFocus) {
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
    mobile.hidden = true;
    if (restoreFocus) menu.focus();
  }
  menu.addEventListener("click", function () {
    var opening = mobile.hidden;
    mobile.hidden = !opening;
    menu.setAttribute("aria-expanded", String(opening));
    menu.setAttribute("aria-label", opening ? "Close navigation" : "Open navigation");
    if (opening) mobile.querySelector("a").focus();
  });
  mobile.addEventListener("click", function (event) {
    if (event.target.closest("a")) closeMenu(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !mobile.hidden) closeMenu(true);
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 890 && !mobile.hidden) closeMenu(false);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = document.getElementById("scan-query").value.trim();
    if (!query) {
      document.getElementById("scan-query").focus();
      return;
    }
    var mode = document.querySelector('input[name="scan-mode"]:checked');
    var choice = mode && mode.value === "continuous" ? "Continuous collection" : "One-time scan";
    summary.textContent = choice + " requested for: “" + query + "”. This public preview does not execute searches or collect data. Run authorised jobs in the authenticated Web Collector after its runtime and policy controls have been configured.";
    result.hidden = false;
    result.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest"});
  });
})();
