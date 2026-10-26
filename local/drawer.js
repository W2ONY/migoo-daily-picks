/*
 * 方案四（<html data-lv-drawer>）：会话不再是单独的页面，而是挂在所有页面右侧、随时能拉开的会话窗。
 * - Explore 在顶部时是底部中间展开的输入框；离开顶部缩成右下角的「Ask migoo」胶囊（原页面胶囊同款，原来底部中间那颗藏掉），
 *   回到顶部再展开回去。胶囊状态下唤醒一律是右侧会话窗：点胶囊、在信息流里引用商品（附件带进会话窗）、或任何入口发消息。
 *   会话窗头部可展开成全屏、再缩回。
 * - 会话窗里是同源 iframe 装的会话页（/home，嵌入模式 <html data-lv-embed> 藏起窄栏等外壳），
 *   会话动画、卡片、券都由 iframe 里同一套 local/ 脚本负责。
 * - 页面上所有发 query 的入口（输入坞、Start here 弹窗、More good …、Claim now）都送进会话窗，不再跳页；
 *   顶层路由到 /home、/chat 时退回原来的页面并拉开会话窗。
 * 嵌入页一侧暴露 window.lvEmbedSend(text, quote)：往会话输入框挂附件（引用商品 / 券）、填字、回车。
 */
(function () {
  var root = document.documentElement;
  var CHAT_PATH = /^\/(home|chat)/;
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function base() {
    return window.LV_BASE || "";
  }

  /* ======================= 嵌入页（会话窗里的 iframe） ======================= */
  if (root.hasAttribute("data-lv-embed")) {
    // 会话页输入框的作用域就是会话 id（chat/initial 返回的 id）
    function conversationId() {
      var init =
        window.mockLookup &&
        window.mockLookup("POST /beeai/api/v1/chat/initial");
      return (init && init.id) || "";
    }
    function composer() {
      return document.querySelector(".home-composer-panel .ProseMirror");
    }
    window.lvEmbedSend = function (text, quote) {
      var ready = Promise.resolve();
      if (quote) {
        ready = import(base() + "/assets/js/draftSelectors-50w6MmyI.js").then(
          function (m) {
            var conv = conversationId();
            if (!conv) return;
            m.$(conv);
            m.ae(conv, quote);
          },
        );
      }
      return ready.then(function () {
        return new Promise(function (resolve) {
          setTimeout(
            function () {
              var editor = composer();
              if (!editor) return resolve(false);
              editor.focus();
              document.execCommand("selectAll", false);
              document.execCommand("insertText", false, text);
              setTimeout(function () {
                editor.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                  }),
                );
                resolve(true);
              }, 60);
            },
            quote ? 120 : 0,
          );
        });
      });
    };
    // 只把附件挂到会话输入框并聚焦（引用商品唤醒会话窗时用，用户自己接着打字）
    window.lvEmbedAttach = function (quote) {
      return import(base() + "/assets/js/draftSelectors-50w6MmyI.js").then(function (m) {
        var conv = conversationId();
        if (!conv) return;
        m.$(conv);
        m.ae(conv, quote);
        setTimeout(function () {
          var editor = composer();
          if (editor) editor.focus();
        }, 120);
      });
    };
    window.lvEmbedReady = function () {
      return !!composer();
    };
    return;
  }

  /* ======================= 外层页面 ======================= */
  function on() {
    return root.hasAttribute("data-lv-drawer");
  }
  var drawer = null;
  var tab = null;
  var frame = null;
  var mode = "closed"; // closed | open | full
  // 右侧栏互相替换时记住上一个，关掉当前的就回到上一个：
  // drawerReturn = 会话窗被 PDP 顶掉前的模式（关 PDP 时恢复）；pdpReturn = 被会话窗顶掉的 PDP 参数（关会话窗时重开）
  var drawerReturn = null;
  var pdpReturn = null;
  var ICON = {
    chat: '<path d="M5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v6.5a2.5 2.5 0 0 1-2.5 2.5H9z"/><path d="M9 9.5h6M9 12.5h4"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  function svg(path) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path +
      "</svg>"
    );
  }
  function build() {
    drawer = el("aside", "lv-drawer");
    drawer.setAttribute("aria-label", "Okiee chat");
    drawer.innerHTML =
      '<div class="lv-drawer-head"><span class="lv-drawer-title">' +
      '<img class="lv-brand-logo" src="' + base() + '/local/okiee-logo.png" alt="">' +
      '<b>Okiee</b></span><span class="lv-drawer-actions">' +
      '<button type="button" class="lv-drawer-btn lv-drawer-size" aria-label="Expand"></button>' +
      '<button type="button" class="lv-drawer-btn lv-drawer-close" aria-label="Close">' +
      svg(ICON.close) +
      "</button></span></div>" +
      '<div class="lv-drawer-body"><div class="lv-drawer-loading"><span></span><span></span><span></span></div></div>';
    drawer.querySelector(".lv-drawer-close").onclick = close;
    drawer.querySelector(".lv-drawer-size").onclick = function () {
      setMode(mode === "full" ? "open" : "full");
    };
    document.body.appendChild(drawer);
    tab = el("button", "lv-drawer-tab");
    tab.type = "button";
    // 图标沿用原页面胶囊的那个（拿不到时用自己的）
    var origIcon = document.querySelector('[class*="_dockLayer_"] [class*="_pill_"] svg');
    tab.innerHTML = (origIcon ? origIcon.outerHTML : svg(ICON.chat)) + "<span>Ask Okiee</span>";
    tab.onclick = function () {
      open();
    };
    document.body.appendChild(tab);
  }
  function ensureFrame() {
    if (frame) return;
    frame = el("iframe", "lv-drawer-frame");
    frame.title = "Okiee chat";
    frame.src = base() + "/home";
    frame.addEventListener("load", function () {
      drawer.classList.add("is-loaded");
    });
    drawer.querySelector(".lv-drawer-body").appendChild(frame);
  }
  function setMode(m) {
    // 会话窗是从 PDP 的 Ask Migoo 打开的：关掉会话窗回到那个 PDP
    if (m === "closed" && mode !== "closed" && pdpReturn) {
      var back = pdpReturn;
      pdpReturn = null;
      if (window.__lvOpenPdp) window.__lvOpenPdp.apply(null, back);
    }
    mode = m;
    if (!drawer) return;
    syncTab();
    drawer.classList.toggle("is-open", m !== "closed");
    drawer.classList.toggle("is-full", m === "full");
    root.toggleAttribute("data-lv-drawer-open", m !== "closed");
    var size = drawer.querySelector(".lv-drawer-size");
    size.innerHTML = svg(m === "full" ? ICON.shrink : ICON.expand);
    size.setAttribute(
      "aria-label",
      m === "full" ? "Exit full screen" : "Full screen",
    );
    size.title = m === "full" ? "Exit full screen" : "Full screen";
  }
  function open() {
    if (!on()) return;
    if (!drawer) build();
    ensureFrame();
    if (mode === "closed") setMode("open");
  }
  function close() {
    setMode("closed");
  }
  // 等会话窗里的会话页准备好（输入框渲染出来），最多 10s
  function frameReady() {
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      (function poll() {
        var w = frame && frame.contentWindow;
        try {
          if (w && w.lvEmbedSend && w.lvEmbedReady && w.lvEmbedReady())
            return resolve(w);
        } catch (e) {}
        if (Date.now() - start > 10000)
          return reject(new Error("chat not ready"));
        setTimeout(poll, 100);
      })();
    });
  }
  window.lvDrawerActive = on;
  // 发一条消息到会话窗：quote 是输入框附件（{ quoteSource, display:{title,imageUrl}, pdp:{locator}, status }）
  window.lvDrawerSend = function (text, quote) {
    open();
    return frameReady().then(function (w) {
      return w.lvEmbedSend(text, quote || null);
    });
  };

  // 把附件带进会话窗（不发送）
  window.lvDrawerAttach = function (quote) {
    open();
    return frameReady().then(function (w) {
      return w.lvEmbedAttach(quote);
    });
  };

  /* ---------- 没有单独的会话页：顶层路由到会话就退回原页面、拉开会话窗 ---------- */
  var lastPage = null;
  function onRoute() {
    if (!on()) {
      if (drawer) setMode("closed");
      syncTab();
      return;
    }
    var p = window.lvPath();
    if (CHAT_PATH.test(p)) {
      history.replaceState(
        history.state,
        "",
        base() + (lastPage || "/daily-picks"),
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
      open();
      return;
    }
    lastPage = p + location.search + location.hash;
    syncTab();
  }
  // 页面上的底部输入框（Explore）
  function dockLayer() {
    var l = document.querySelector('[class*="_dockLayer_"]');
    return l && l.getClientRects().length ? l : null;
  }
  // 胶囊只留一颗：会话窗拉开时、或 Explore 的输入框展开着时藏起
  function syncTab() {
    if (!on()) {
      if (tab) tab.style.display = "none";
      return;
    }
    if (!drawer) build();
    tab.style.display = "";
    var layer = dockLayer();
    if (layer && layer.hasAttribute("data-lv-compact")) forwardQuote(layer);
    var dockOpen = layer && !layer.hasAttribute("data-lv-compact");
    tab.classList.toggle("is-hidden", mode !== "closed" || !!dockOpen);
    if (layer) aimDock(layer);
  }
  // 输入坞上挂着的引用商品（信息流卡片「Ask」带进来的，显示为附件卡片）→ 会话窗附件；按标题在商品池里找回商品信息
  function dockQuote(layer) {
    var cards = layer.querySelectorAll(".ant-file-card-list-item:not(.ant-file-card-list-motion-leave)");
    var card = cards[cards.length - 1];
    var titleEl = card && card.querySelector('[class*="_title_"]');
    var title = titleEl ? titleEl.textContent.trim() : "";
    if (!title) return null;
    var img = card.querySelector("img");
    var p =
      window.lvShop &&
      window.lvShop.products().filter(function (x) {
        return x.info.title === title;
      })[0];
    return {
      quoteSource: "daily_picks_feed",
      display: { title: title, imageUrl: img ? img.src : "" },
      pdp: { locator: { source: p ? p.store : "", region: "US", offerId: p ? String(p.info.offer_id) : "" } },
      status: "active",
    };
  }
  // 胶囊状态下点信息流卡片的「Ask」：原页面会把页面滚回顶部、把商品挂到输入框；这里直接拦下，
  // 商品作为附件带进右侧会话窗，页面不动
  document.addEventListener(
    "click",
    function (e) {
      if (!on()) return;
      var btn = e.target.closest && e.target.closest('[class*="_askButton_"]');
      var layer = dockLayer();
      // 输入框收成胶囊、或右侧会话窗开着时，引用都直接进会话窗（页面不回滚到顶部）
      if (!btn || !layer || !(layer.hasAttribute("data-lv-compact") || mode !== "closed")) return;
      var card = btn.closest('[class*="_productCard_"]');
      var titleEl = card && card.querySelector('[class*="_productTitle_"]');
      var title = titleEl ? (titleEl.getAttribute("title") || titleEl.textContent).trim() : "";
      if (!title) return;
      e.preventDefault();
      e.stopPropagation();
      var img = card.querySelector("img");
      var p =
        window.lvShop &&
        window.lvShop.products().filter(function (x) {
          return x.info.title === title || x.info.title.indexOf(title.replace(/…$/, "")) === 0;
        })[0];
      window.lvDrawerAttach({
        quoteSource: "daily_picks_feed",
        display: { title: p ? p.info.title : title, imageUrl: p ? p.info.image : img ? img.src : "" },
        pdp: { locator: { source: p ? p.store : "", region: "US", offerId: p ? String(p.info.offer_id) : "" } },
        status: "active",
      });
    },
    true,
  );
  // PDP 右下角的「Ask Migoo」：关掉 PDP，打开右侧会话窗并把这件商品作为附件带进去
  document.addEventListener(
    "click",
    function (e) {
      if (!on() || root.hasAttribute("data-lv-embed")) return;
      var btn = e.target.closest && e.target.closest('[class*="_askMigooButton_"]');
      var pdp = btn && btn.closest('aside[class*="_drawer_"]');
      if (!pdp) return;
      var titleEl = pdp.querySelector('h1[class*="_title_"]');
      var title = titleEl ? titleEl.textContent.trim() : "";
      if (!title) return;
      e.preventDefault();
      e.stopPropagation();
      var img = pdp.querySelector('img[class*="_topImage_"]') || pdp.querySelector("img");
      var p =
        window.lvShop &&
        window.lvShop.products().filter(function (x) {
          return x.info.title === title;
        })[0];
      var close = pdp.querySelector('[aria-label="Close PDP"]');
      drawerReturn = null;
      pdpReturn = window.__lvLastPdp || null;
      if (close) close.click();
      window.lvDrawerAttach({
        quoteSource: "daily_picks_feed",
        display: { title: title, imageUrl: p ? p.info.image : img ? img.src : "" },
        pdp: { locator: { source: p ? p.store : "", region: "US", offerId: p ? String(p.info.offer_id) : "" } },
        status: "active",
      });
    },
    true,
  );
  // 会话窗开着时点商品弹出 PDP：收起会话窗，把右侧让给 PDP（PDP 的 Ask Migoo 再把会话窗带回来）
  var pdpWasOpen = false;
  new MutationObserver(function () {
    if (!on() || root.hasAttribute("data-lv-embed")) return;
    var pdpOpen = !!document.querySelector('aside[class*="_drawer_"][class*="_open_"]');
    if (pdpOpen && !pdpWasOpen && mode !== "closed") {
      // 新 PDP 顶掉会话窗：之前记的「回到 PDP」作废，改记「关 PDP 回到会话窗」
      pdpReturn = null;
      drawerReturn = mode;
      setMode("closed");
    } else if (pdpOpen && !pdpWasOpen) {
      drawerReturn = null;
    }
    if (!pdpOpen && pdpWasOpen && drawerReturn) {
      var m = drawerReturn;
      drawerReturn = null;
      setMode(m);
    }
    pdpWasOpen = pdpOpen;
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  // 输入框已经收成胶囊后，信息流里引用的商品会挂到（看不见的）输入框上：转进会话窗
  function forwardQuote(layer) {
    var quote = dockQuote(layer);
    if (!quote) return;
    if (window.__lvClearQuotes) window.__lvClearQuotes();
    window.lvDrawerAttach(quote);
  }
  // 输入框收起时缩向胶囊：算出输入框中心到胶囊中心的位移，交给 CSS 做 transform（展开时原路放大回来）
  function aimDock(layer) {
    var panel = layer.querySelector('[class*="_dockPanel_"]');
    if (!panel || layer.hasAttribute("data-lv-compact")) return;
    var a = panel.getBoundingClientRect();
    var b = tab.getBoundingClientRect();
    if (!a.width || !b.width) return;
    layer.style.setProperty("--lv-pill-dx", Math.round(b.left + b.width / 2 - (a.left + a.width / 2)) + "px");
    layer.style.setProperty("--lv-pill-dy", Math.round(b.top + b.height / 2 - (a.top + a.height / 2)) + "px");
  }
  // 输入框收起 / 展开（data-lv-compact 变化）时同步胶囊
  new MutationObserver(function () {
    if (on()) syncTab();
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-lv-compact"] });
  window.addEventListener("resize", function () {
    if (on()) syncTab();
  });
  // 输入框会随页面重渲染出现 / 消失、位置也会变：定时同步胶囊显隐和收起的目标位移
  setInterval(function () {
    if (on()) syncTab();
  }, 300);
  ["pushState", "replaceState"].forEach(function (m) {
    var orig = history[m];
    history[m] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(onRoute);
      return r;
    };
  });
  window.addEventListener("popstate", function () {
    setTimeout(onRoute);
  });
  window.addEventListener("local:variant", function () {
    setTimeout(onRoute);
  });

  // 窄栏的 Chat：方案四里就是拉开 / 收起会话窗
  document.addEventListener(
    "click",
    function (e) {
      if (!on()) return;
      var chat = e.target.closest && e.target.closest(".lv-rail-chat");
      if (!chat) return;
      e.preventDefault();
      e.stopPropagation();
      if (mode === "closed") open();
      else close();
    },
    true,
  );

  /* ---------- 输入坞里自己打字发送：拦下原页面的发送（它会跳到会话页），改送进会话窗 ---------- */
  function dockOf(node) {
    return node && node.closest && node.closest('[class*="_dockLayer_"]');
  }
  function takeDock(layer) {
    var editor = layer.querySelector(".ProseMirror");
    var text = editor ? editor.innerText.trim() : "";
    // 输入框上方挂着的引用商品一起带过去
    var quote = dockQuote(layer);
    if (!text) return null;
    editor.focus();
    document.execCommand("selectAll", false);
    document.execCommand("delete", false);
    if (window.__lvClearQuotes) window.__lvClearQuotes();
    return { text: text, quote: quote };
  }
  document.addEventListener(
    "keydown",
    function (e) {
      if (!on() || e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      var layer = dockOf(e.target);
      if (!layer || !e.isTrusted) return;
      var msg = takeDock(layer);
      if (!msg) return;
      e.preventDefault();
      e.stopPropagation();
      window.lvDrawerSend(msg.text, msg.quote);
    },
    true,
  );
  document.addEventListener(
    "click",
    function (e) {
      if (!on()) return;
      var btn = e.target.closest && e.target.closest('[aria-label="Send"]');
      var layer = dockOf(btn);
      if (!layer) return;
      var msg = takeDock(layer);
      if (!msg) return;
      e.preventDefault();
      e.stopPropagation();
      window.lvDrawerSend(msg.text, msg.quote);
    },
    true,
  );

  // Esc：全屏先缩回，再收起
  document.addEventListener("keydown", function (e) {
    if (
      e.key !== "Escape" ||
      !on() ||
      mode === "closed" ||
      document.querySelector(".lv-cmp")
    )
      return;
    setMode(mode === "full" ? "open" : "closed");
  });

  function boot() {
    onRoute();
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
