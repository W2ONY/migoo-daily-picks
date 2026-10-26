/*
 * 方案四：Explore 页首屏做成 Chat 区（参考 dupe.com 首屏）——
 * 标题 + 居中输入框（输入框位置沿用 variants.js 的 placeDock），输入框下方一行「Start here」：
 * 4 张虚线「TRY THIS」卡（即原页面的能力 chips，点击触发原 chip）。这里不展示历史对话。
 * 往下滑到 Categories + Browse；左侧窄栏的 Chat / Explore 在这一页上变成锚点并随滚动高亮
 * （window.lvHeroInView 供 variants.js 判断高亮，window.lvScrollTo 供窄栏点击）。
 */
(function () {
  var root = document.documentElement;
  var keep = null;
  var title = null;

  // 首屏标题：替换原「Best Price for All Purchases」（原 h2 用 CSS 隐藏，新标题插在它前面）
  function buildTitle() {
    title = el("h1", "lv-title");
    title.innerHTML = 'migoo finds deals. <em>You save.</em>';
  }
  function mountTitle(h) {
    var group = h.querySelector('[class*="_headingGroup_"]');
    if (!group) return;
    if (!title) buildTitle();
    if (title.parentNode !== group) group.insertBefore(title, group.firstChild);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function on() {
    return root.hasAttribute("data-lv-v4");
  }
  function header() {
    return document.querySelector('[class*="_feedHeader_"]');
  }
  // 真正滚动的容器：从 _feedHeader_ 往上找第一个可纵向滚动的祖先
  function scroller() {
    var n = header();
    while (n && n !== document.body) {
      var oy = getComputedStyle(n).overflowY;
      if (
        (oy === "auto" || oy === "scroll") &&
        n.scrollHeight > n.clientHeight + 10
      )
        return n;
      n = n.parentElement;
    }
    return document.scrollingElement;
  }

  // 原页面的能力 chips（隐藏后仍在 DOM 里，点它就走原逻辑：输入框挂能力标签 + 出二级 query 推荐）
  function originalChips() {
    return [].map.call(
      document.querySelectorAll(
        '[class*="_feedHeader_"] [class*="_headerChips_"] [class*="_capabilityTile_"]',
      ),
      function (tile) {
        var label = tile.querySelector('[class*="_chipLabel_"]');
        var img = tile.querySelector("img");
        return {
          tile: tile,
          label: label ? label.textContent.trim() : tile.textContent.trim(),
          icon: img && img.src,
        };
      },
    );
  }

  function render() {
    keep.innerHTML = "";
    keep.appendChild(el("div", "lv-keep-title", "Start here"));
    var row = el("div", "lv-keep-row");
    originalChips().forEach(function (chip) {
      var card = el("button", "lv-keep-card lv-keep-try");
      card.type = "button";
      var text = el("span", "lv-keep-text");
      text.appendChild(el("small", "lv-keep-eyebrow", "Try this"));
      text.appendChild(el("b", null, chip.label));
      card.appendChild(text);
      if (chip.icon) {
        var ic = el("span", "lv-keep-icon-wrap");
        var img = el("img", "lv-keep-chip-icon");
        img.alt = "";
        img.src = chip.icon;
        ic.appendChild(img);
        card.appendChild(ic);
      }
      card.appendChild(el("span", "lv-keep-go", "Try it →"));
      card.onclick = function () {
        // 四张卡各自弹 try-this.js 的创作弹窗（参考 new-task）；认不出的仍触发原 chip
        var kind = /compare/i.test(chip.label)
          ? "compare"
          : /track/i.test(chip.label)
            ? "track"
            : /budget/i.test(chip.label)
              ? "budget"
              : /idea/i.test(chip.label)
                ? "ideas"
                : null;
        if (kind && window.lvOpenTry) window.lvOpenTry(kind);
        else chip.tile.click();
      };
      row.appendChild(card);
    });
    keep.appendChild(row);
    keep._sig = signature();
  }
  function signature() {
    return originalChips()
      .map(function (c) {
        return c.label;
      })
      .join(",");
  }

  // 首屏高度供标题定位用；滚过「Start here」这一行的一半就算离开 Chat 区，窄栏高亮切到 Explore
  function layout() {
    var sc = scroller();
    if (!sc || !keep || !keep.parentNode) return;
    root.style.setProperty("--lv-hero-h", sc.clientHeight + "px");
    var keepBottom =
      keep.getBoundingClientRect().bottom -
      sc.getBoundingClientRect().top +
      sc.scrollTop;
    window.lvHeroInView = sc.scrollTop < keepBottom * 0.6;
  }

  function mount() {
    var h = header();
    var active = on() && h && /^\/daily-picks\/?$/.test(lvPath());
    if (!active) {
      if (keep && keep.parentNode) keep.remove();
      if (title && title.parentNode) title.remove();
      window.lvHeroInView = undefined;
      return;
    }
    if (!keep) keep = el("section", "lv-keep");
    if (keep.parentNode !== h) h.appendChild(keep);
    if (keep._sig !== signature()) render();
    mountTitle(h);
    layout();
  }

  // PDP 浮层的遮罩是 body::before，点它时事件目标就是 body：点遮罩 = 点抽屉自己的关闭按钮
  document.addEventListener("click", function (e) {
    if (!on() || e.target !== document.body) return;
    var drawer = document.querySelector('aside[class*="_drawer_1jl65_"][class*="_open_"]');
    if (!drawer) return;
    var close = drawer.querySelector('button[aria-label*="lose"], button[class*="close" i], button[class*="Close"]');
    if (close) close.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

  // 页内锚点：hero = 首屏；explore = 合集区；shopping / tracker / coupons / browse = Explore 浮层里的四个分区
  var ANCHORS = {
    explore: ".lv-cats",
    shopping: ".lv-cats",
    tracker: ".lv-tracker:not(.lv-coupons)",
    coupons: ".lv-coupons",
    browse: ".lv-browse-heading",
  };
  window.lvScrollTo = function (where) {
    var sc = scroller();
    if (!sc) return;
    var target = ANCHORS[where] && document.querySelector(ANCHORS[where]);
    var top =
      where !== "hero" && target
        ? target.getBoundingClientRect().top -
          sc.getBoundingClientRect().top +
          sc.scrollTop -
          96 // 让出吸顶输入框所在的 72px 白带 + 一点留白
        : 0;
    sc.scrollTo({ top: top, behavior: "smooth" });
  };
  // 当前滚动到哪个分区（Explore 浮层高亮用）
  window.lvCurrentSection = function () {
    var sc = scroller();
    if (!sc) return null;
    var line = sc.getBoundingClientRect().top + 140;
    var cur = null;
    ["shopping", "tracker", "coupons", "browse"].forEach(function (k) {
      var el = document.querySelector(ANCHORS[k]);
      if (el && el.getBoundingClientRect().top <= line) cur = k;
    });
    return cur;
  };


  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      mount();
    }, 150);
  }
  // 离开 Explore 时记住滚动位置，从会话页返回（返回按钮 / 浏览器后退 / 窄栏）时恢复到原来的浏览位置
  // 信息流是分页加载的，回来时可能还不够长：反复设到目标位置（滚到底会触发加载下一页），最多 3s；
  // 到位后再守 1.2s：Explore 的分区是稍后插回来的，浏览器的滚动锚定会把位置往下推。用户自己滚动就停
  var EXPLORE = /^\/daily-picks\/?$/;
  var exploreTop = 0;
  var savedTop = null;
  var wasExplore = EXPLORE.test(lvPath());
  var restoring = false;
  function trackExplore() {
    if (restoring || !EXPLORE.test(lvPath()) || !header()) return;
    var sc = scroller();
    if (sc) exploreTop = sc.scrollTop;
  }
  function restoreExplore(top) {
    var until = Date.now() + 3000;
    var holdUntil = 0;
    restoring = true;
    var stop = function () {
      restoring = false;
      ["wheel", "touchmove", "keydown"].forEach(function (t) {
        window.removeEventListener(t, stop, true);
      });
    };
    ["wheel", "touchmove", "keydown"].forEach(function (t) {
      window.addEventListener(t, stop, true);
    });
    (function tick() {
      if (!restoring) return;
      var sc = header() && scroller();
      if (sc) {
        if (Math.abs(sc.scrollTop - top) >= 2) sc.scrollTop = top;
        if (Math.abs(sc.scrollTop - top) < 2 && !holdUntil) holdUntil = Date.now() + 1200;
      }
      var now = Date.now();
      if ((holdUntil && now > holdUntil) || now > until) return stop();
      setTimeout(tick, 40);
    })();
  }
  function onRoute() {
    var now = EXPLORE.test(lvPath());
    if (wasExplore && !now) savedTop = exploreTop;
    if (!wasExplore && now && savedTop) restoreExplore(savedTop);
    wasExplore = now;
  }

  function boot() {
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("local:variant", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener(
      "scroll",
      function () {
        trackExplore();
        layout();
      },
      true,
    );
    // 路由切换：页面用 history.pushState / popstate，两种都接上
    ["pushState", "replaceState"].forEach(function (m) {
      var orig = history[m];
      history[m] = function () {
        var r = orig.apply(this, arguments);
        onRoute();
        return r;
      };
    });
    window.addEventListener("popstate", onRoute);
    schedule();
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
