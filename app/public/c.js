/* The compare tray: shortlist a phone from anywhere on the site.

   Owner 2026-09-06: "whenever they are browsing any page of any phones
   whether guides, phones there should be floating add to compare thing like
   others." Every phone card on this site is an <a> pointing at
   /phone/<slug> -- guides, brand hubs, the paginated list, the client-side
   search results, a device page's own "compare at this price" rail. So this
   file needs no template change to find them: it reads the links.

   Picks live in localStorage, because the walk this exists for is guide ->
   phone page -> another guide, and three page loads must not lose the
   shortlist. Nothing leaves the browser.

   Served as one cached file rather than inlined, because _footer_html reaches
   every one of ~800 pages and 4 KB on each of them is 3 MB of the same bytes.
*/
(function () {
  "use strict";
  if (location.pathname.indexOf("/compare") === 0) return;   // it IS that page
  var KEY = "bp:cmp", MAX = 3, PICKS = [], tray = null;

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v.filter(function (x) { return x && x.s; })
        .slice(0, MAX) : [];
    } catch (e) { return []; }
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(PICKS)); } catch (e) {}
  }
  function has(slug) {
    for (var i = 0; i < PICKS.length; i++) if (PICKS[i].s === slug) return true;
    return false;
  }
  function el(t, c, x) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (x != null) e.textContent = x;
    return e;
  }
  var PLUS = '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" '
    + 'aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" stroke="currentColor" '
    + 'stroke-width="2" stroke-linecap="round"/></svg>';
  var TICK = '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" '
    + 'aria-hidden="true"><path d="m4.5 10.5 3.8 3.8 7.2-8" '
    + 'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" '
    + 'stroke-linejoin="round"/></svg>';

  function slugOf(a) {
    var m = (a.getAttribute("href") || "").match(/^\/phone\/([^/?#]+)\/?$/);
    return m ? m[1] : null;
  }
  function nameOf(a) {
    var br = a.querySelector(".pbr"), md = a.querySelector(".pmd"),
        vn = a.querySelector(".vsn");
    if (br && md) return (br.textContent + " " + md.textContent).trim();
    if (vn) return vn.textContent.trim();
    /* the stretch pick and the guide cards name the phone in .nm, and their
       card text starts with a label ("Worth stretching") rather than the
       phone, so the fallback below reads as nonsense on them */
    var nm = a.querySelector(".nm");
    if (nm) return nm.textContent.trim();
    /* the card's own accessible name is "<Brand> <Model>, <price>, ..." */
    var lab = a.getAttribute("aria-label") || a.textContent || "";
    return lab.split(",")[0].trim();
  }
  function imgOf(a) {
    var i = a.querySelector("img");
    return i ? i.getAttribute("src") : "";
  }

  function toggle(p, btn) {
    if (has(p.s)) {
      PICKS = PICKS.filter(function (x) { return x.s !== p.s; });
    } else {
      if (PICKS.length >= MAX) PICKS.shift();      /* oldest out, never refuse */
      PICKS.push(p);
    }
    write();
    paint();
    if (btn) btn.focus();
  }

  function mark(btn, on, name) {
    /* A no-op when nothing changed. This is not an optimisation: paint()
       runs over every button on the page, and rewriting innerHTML inside a
       watched subtree is what fed the observer below its own mutations. */
    if (btn._on === on) return;
    btn._on = on;
    btn.classList.toggle("on", on);
    btn.innerHTML = on ? TICK : PLUS;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label",
      (on ? "Remove " : "Add ") + name + (on ? " from" : " to")
      + " the comparison");
    btn.title = on ? "In your comparison" : "Add to compare";
  }

  /* One button per card. The card is an <a>, so the button cannot live inside
     it -- a control nested in a link is neither, in every screen reader and in
     half the browsers. The card gets a positioned wrapper and the button
     becomes its sibling. */
  function wire(a) {
    if (a.dataset.cmpw) return;
    var slug = slugOf(a);
    if (!slug) return;
    a.dataset.cmpw = "1";
    var p = { s: slug, n: nameOf(a), i: imgOf(a) };
    var w = el("div", "pcw");
    a.parentNode.insertBefore(w, a);
    w.appendChild(a);
    button(p, w);
  }

  /* .cmpadd is absolutely positioned, so the host has to be a positioned box.
     A card the site never needed to position gets it here rather than in the
     stylesheet, which every page on the site pays for. */
  function button(p, host) {
    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }
    var b = el("button", "cmpadd");
    b.type = "button";
    b.dataset.s = p.s;
    b.dataset.n = p.n;
    mark(b, has(p.s), p.n);
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation(); toggle(p, b);
    });
    host.appendChild(b);
    return b;
  }

  /* A guide's runner-up picks are not cards-that-are-links: the card is an
     <article> and the /phone/ link inside it is the "All prices & specs"
     button. Looking only for a.pcard found nothing on a guide, so every
     guide shipped one compare button -- the hero's, server-rendered. */
  function wireCard(a) {
    var card = a.closest && a.closest("article");
    if (!card || card.dataset.cmpw) return;
    var slug = slugOf(a);
    if (!slug) return;
    card.dataset.cmpw = "1";
    var nm = card.querySelector(".nm"), im = card.querySelector("img");
    button({ s: slug, n: nm ? nm.textContent.trim() : nameOf(a),
             i: im ? im.getAttribute("src") : "" }, card);
  }

  /* The device page ships its own button, server-rendered inside the buy
     panel where a real control belongs, carrying the phone's identity. */
  function wireSelf() {
    var b = document.getElementById("cmpself");
    if (!b) return;
    var p = { s: b.dataset.s, n: b.dataset.n, i: b.dataset.i || "" };
    if (!p.s) return;
    var lab = b.querySelector("span");
    function draw() {
      var on = has(p.s);
      b.classList.toggle("on", on);
      if (lab) lab.textContent = on ? "In your comparison"
        : "Add to compare";
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
    b.addEventListener("click", function () { toggle(p, b); });
    b._draw = draw;
    draw();
  }

  function chip(p) {
    var c = el("span", "tchip");
    if (p.i) {
      var im = new Image();
      im.src = p.i; im.alt = ""; im.loading = "lazy";
      c.appendChild(im);
    }
    c.appendChild(el("span", null, p.n));
    var x = el("button", null, "×");
    x.type = "button";
    x.setAttribute("aria-label", "Remove " + p.n + " from the comparison");
    x.addEventListener("click", function () { toggle(p); });
    c.appendChild(x);
    return c;
  }

  function href() {
    var k = ["a", "b", "c"], q = [];
    for (var i = 0; i < PICKS.length && i < 3; i++)
      q.push(k[i] + "=" + encodeURIComponent(PICKS[i].s));
    return "/compare" + (q.length ? "?" + q.join("&") : "");
  }

  function paint() {
    /* every button on the page, not just the one that was pressed: the same
       phone can appear on a guide twice (a pick card and a rail card) */
    [].forEach.call(document.querySelectorAll(".cmpadd"), function (b) {
      mark(b, has(b.dataset.s), b.dataset.n || "this phone");
    });
    var self = document.getElementById("cmpself");
    if (self && self._draw) self._draw();

    if (!PICKS.length) {
      if (tray) { tray.classList.remove("up"); document.body.classList.remove("tray-up"); }
      return;
    }
    if (!tray) {
      tray = el("div", "cmptray");
      tray.setAttribute("role", "region");
      tray.setAttribute("aria-label", "Phones you are comparing");
      document.body.appendChild(tray);
    }
    tray.textContent = "";
    var sl = el("div", "tsl");
    PICKS.forEach(function (p) { sl.appendChild(chip(p)); });
    tray.appendChild(sl);
    if (PICKS.length < 2) {
      tray.appendChild(el("span", "thint", "Pick one more to compare"));
    }
    var go = document.createElement("a");
    go.className = "tgo";
    go.href = href();
    go.textContent = PICKS.length < 2 ? "Add one more"
      : "Compare " + PICKS.length + " →";
    if (PICKS.length < 2) go.setAttribute("aria-disabled", "true");
    tray.appendChild(go);
    var cl = el("button", "tcl", "×");
    cl.type = "button";
    cl.setAttribute("aria-label", "Clear the comparison");
    cl.addEventListener("click", function () { PICKS = []; write(); paint(); });
    tray.appendChild(cl);
    /* one frame later, so the transform transition actually runs */
    requestAnimationFrame(function () {
      tray.classList.add("up");
      document.body.classList.add("tray-up");
    });
  }

  function scan() {
    [].forEach.call(
      document.querySelectorAll('a.pcard[href^="/phone/"],'
        + 'a.vscard[href^="/phone/"],a.stretchcard[href^="/phone/"]'), wire);
    [].forEach.call(
      document.querySelectorAll('article.card a.dbtn[href^="/phone/"]'),
      wireCard);
  }

  PICKS = read();
  scan();
  wireSelf();
  paint();

  /* The /phone list rebuilds its grid from a client-side search index, so the
     cards wired above can be replaced wholesale after load and the new ones
     need buttons.
     
     THE TRAP, and it froze the live site: watching that grid with
     subtree:true and then mutating inside it -- wire() wraps each card,
     paint() rewrites each button -- feeds the observer its own work. Every
     paint scheduled another paint and the tab locked up the moment anyone
     pressed a button. Three guards, because one is a bug away from the same
     freeze: the observer watches the grid's OWN children only, it is
     disconnected across our mutations, and mark() above no-ops when nothing
     changed. */
  var OBS = null, QUEUED = false;
  function rewire() {
    if (OBS) OBS.disconnect();
    try { scan(); paint(); } finally { if (OBS) watch(); }
  }
  function watch() {
    [].forEach.call(document.querySelectorAll("#pgrid,#pres"), function (g) {
      OBS.observe(g, { childList: true });
    });
  }
  if (window.MutationObserver
      && document.querySelector("#pgrid,#pres")) {
    OBS = new MutationObserver(function () {
      if (QUEUED) return;
      QUEUED = true;
      requestAnimationFrame(function () { QUEUED = false; rewire(); });
    });
    watch();
  }
  /* a second tab shortlisting a phone is the same shortlist */
  addEventListener("storage", function (e) {
    if (e.key === KEY) { PICKS = read(); paint(); }
  });
})();