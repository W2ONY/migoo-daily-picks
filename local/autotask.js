/*
 * Auto-task · 电商版（Okiee）：只保留降价提醒（Price tracker），整页围绕商品组织。
 * 对照 migoo.ai/auto-task 源码（tools/autotask-ref/）：卡片、详情弹窗、开关、按钮、标签的尺寸 / 颜色 / 文案沿用原版，
 * 再按 Migoo App 的 Price tracker 思路电商化。
 *
 * - 路由：原 /auto-task 页面上没有 PDP 抽屉（PDP 只挂在 Daily Picks 页），所以 Auto-task 做成盖在 Daily Picks 内容区上的
 *   覆盖层 /daily-picks#auto-task（同 strategy.js 的 #lists）；直接打开 /auto-task 会被改写过来，窄栏 Auto-task 也指向这里。
 * - 数据：和 Try-this「Track Price Drops」共用 localStorage lv:tracked（Price Drops 上的 Tracking 角标也读它），
 *   在原字段 {pid,target,scope,freq,notify,note,at} 上补 on（开关）/ channels（通知渠道）/ orig（开始追踪时的价格）/ prompt。
 *   首次进入写入一组演示任务（lv:at-seeded-v1，商品取自商品池真实数据）。
 * - 卡片：类型行（Price tracker + 开关）→ 商品行（点了开 PDP）→ 状态句 → Notify via
 *   → Adjust with Okiee / 主按钮（达标 = Buy at 门店，未达标 = Adjust target，暂停 = Resume）/ •••。
 * - 条件面板：原版详情弹窗外壳 + 可拖目标线的 30 天价格图、目标价输入、快捷 -5%…-20% / 30 天最低、门店范围、通知渠道、Prompt。
 * - PDP：已追踪的商品在 PDP 底部按钮上方出一条 Tracking 条（Edit），未追踪的出「Track price」。
 * - Adjust with Okiee：右侧会话窗挂商品附件 + 预填一句；发送后 mock 回复并改目标价（mockReplyFor 包一层）。
 */
(function () {
  if (window.__lvAutoTask) return;
  window.__lvAutoTask = true;

  var root = document.documentElement;
  var KEY = "lv:tracked";
  var SEED_KEY = "lv:at-seeded-v1";
  var HASH = "#auto-task";
  var AGENT = "Okiee Agent";
  var CHANNELS = ["Okiee Web/App", "Email", "Chrome extension"];
  var embed = (function () {
    try {
      return window.top !== window;
    } catch (e) {
      return true;
    }
  })();

  function S() {
    return window.lvShop;
  }
  function base() {
    return window.LV_BASE || "";
  }
  function path() {
    return window.lvPath ? window.lvPath() : location.pathname;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(cls, html, fn) {
    var b = el("button", cls);
    b.type = "button";
    if (html != null) b.innerHTML = html;
    if (fn)
      b.onclick = function (e) {
        e.stopPropagation();
        fn(e);
      };
    return b;
  }
  function svg(inner) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner +
      "</svg>"
    );
  }
  // 原版图标（tools/autotask-ref/assets/icons）+ 少量自绘线性图标
  var ICON = {
    arrow:
      '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.1893 10L7.21967 13.9697C6.92678 14.2626 6.92678 14.7374 7.21967 15.0303C7.51256 15.3232 7.98744 15.3232 8.28033 15.0303L12.7803 10.5303C13.0732 10.2374 13.0732 9.76256 12.7803 9.46967L8.28033 4.96967C7.98744 4.67678 7.51256 4.67678 7.21967 4.96967C6.92678 5.26256 6.92678 5.73744 7.21967 6.03033L11.1893 10Z" fill="currentColor"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5L17.82 17.82"/><path d="M6.19 17.81L17.5 6.5"/></svg>',
    add: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.67" stroke-linecap="round" aria-hidden="true"><path d="M10 4.167V15.833M4.167 10H15.833"/></svg>',
    del: svg(
      '<path d="M7.5 3.5h9"/><path d="M3 7h18"/><path d="M5.5 7l1 12.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2L18.5 7"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    ),
    tag: svg(
      '<path d="M3.5 12.2V4.8c0-.7.6-1.3 1.3-1.3h7.4l8.3 8.3a1.3 1.3 0 0 1 0 1.8l-7.2 7.2a1.3 1.3 0 0 1-1.8 0Z"/><circle cx="8.2" cy="8.2" r="1.4"/>',
    ),
    bell: svg(
      '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    ),
    check: svg(
      '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16.5 9"/>',
    ),
    eye: svg(
      '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    ),
    pause: svg('<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>'),
    play: svg(
      '<circle cx="12" cy="12" r="9"/><path d="m10.2 8.8 5 3.2-5 3.2Z"/>',
    ),
    edit: svg('<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>'),
    back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
    chat: svg(
      '<path d="M12 4c4.7 0 8.5 3.3 8.5 7.4s-3.8 7.4-8.5 7.4c-1 0-2-.1-2.9-.4L5 20l1.1-3.5C4.6 15.1 3.5 13.4 3.5 11.4 3.5 7.3 7.3 4 12 4Z"/>',
    ),
    chev: svg('<path d="m9 6 6 6-6 6"/>'),
    ext: svg(
      '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    ),
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8Z"/></svg>',
  };

  /* ---------------- 工具 ---------------- */
  // 取逗号 / 破折号前的部分；太短（如「LG - 27" Monitor…」里的「LG」）就接上下一段
  function shortTitle(t) {
    var parts = (t || "").split(/,| - | \| | – /);
    var out = parts[0];
    for (var i = 1; i < parts.length && out.length < 14; i++)
      out += " " + parts[i].trim();
    return out.length > 46 ? out.slice(0, 44).trim() + "…" : out;
  }
  // 会话里用的商品名：同 shortTitle，但按整词截到 40 字以内、不带省略号
  function chatName(p) {
    var t = shortTitle(p.info.title).replace(/…$/, "");
    if (t.length <= 40) return t;
    t = t.slice(0, 40);
    return t.slice(0, t.lastIndexOf(" ") > 20 ? t.lastIndexOf(" ") : 40).replace(/[\s(,–-]+$/, "");
  }
  function listJoin(a) {
    return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  }
  function fmt(v) {
    return "$" + Number(v).toFixed(2);
  }
  // 目标价：整数不带小数（$399），否则两位
  function tgt(v) {
    v = Math.round(v * 100) / 100;
    return "$" + (Math.round(v) === v ? String(v) : v.toFixed(2));
  }
  function r2(v) {
    return Math.round(v * 100) / 100;
  }
  function storeName(s) {
    return S() ? S().storeName(s) : s;
  }
  function storeLogo(s) {
    return S() && S().storeLogo ? S().storeLogo(s) : "";
  }
  function products() {
    return S() ? S().products() : [];
  }
  function productById(id) {
    id = String(id);
    var list = products();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  // 30 天价格：录制的 chart（末尾补上今天的价格）；没有就按 id 播种一条围绕现价的走势（同 try-this.js）
  function historyOf(p) {
    var out;
    if (p.chart && p.chart.length >= 4) out = p.chart.slice(-30).map(r2);
    else {
      out = [];
      var v = p.price * (1 + (8 + S().seeded(p.id, 18)) / 100);
      for (var i = 0; i < 29; i++) {
        v = v * (1 + (S().seeded(p.id + "h" + i, 9) - 4.6) / 100);
        out.push(r2(Math.max(p.price * 0.85, v)));
      }
    }
    if (Math.abs(out[out.length - 1] - p.price) > 0.005) out.push(p.price);
    return out;
  }
  function minOf(a) {
    return Math.min.apply(null, a);
  }
  function maxOf(a) {
    return Math.max.apply(null, a);
  }
  function dayLabel(daysAgo) {
    var d = new Date(Date.now() - daysAgo * 864e5);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function toast(text) {
    var t = el("div", "lv-toast", text);
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.classList.add("is-in");
    });
    setTimeout(function () {
      t.classList.remove("is-in");
      setTimeout(function () {
        t.remove();
      }, 250);
    }, 2400);
  }

  /* ---------------- 数据：lv:tracked ---------------- */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {}
    window.dispatchEvent(new Event("lv:tracked"));
  }
  function norm(t) {
    var o = Object.assign({}, t);
    if (o.on === undefined) o.on = true;
    if (!o.channels || !o.channels.length)
      o.channels =
        o.notify === "email" ? ["Okiee Web/App", "Email"] : ["Okiee Web/App"];
    o.scope = o.scope === "store" ? "store" : "all";
    return o;
  }
  function statusOf(t, p) {
    if (!t.on) return "paused";
    return p.price <= t.target + 0.001 ? "reached" : "watching";
  }
  function tasks() {
    return load()
      .map(function (t) {
        var p = productById(t.pid);
        if (!p) return null;
        var o = norm(t);
        o.product = p;
        o.st = statusOf(o, p);
        return o;
      })
      .filter(Boolean);
  }
  function findTask(pid) {
    pid = String(pid);
    var list = tasks();
    for (var i = 0; i < list.length; i++)
      if (list[i].pid === pid) return list[i];
    return null;
  }
  function patch(pid, fn) {
    var list = load();
    var hit = false;
    list = list.map(function (t) {
      if (t.pid !== pid) return t;
      hit = true;
      var o = norm(t);
      fn(o);
      o.notify = o.channels.indexOf("Email") >= 0 ? "email" : "okiee";
      return o;
    });
    if (hit) save(list);
    return hit;
  }
  function removeTask(pid) {
    save(
      load().filter(function (t) {
        return t.pid !== pid;
      }),
    );
  }
  function setOn(pid, on) {
    patch(pid, function (t) {
      t.on = on;
    });
    // 原版文案
    toast(on ? "Auto-task scheduled" : "Auto-task paused");
  }

  // 演示任务：两条已达标（价格已经掉到目标价以下）、四条在盯、一条暂停；商品与价格都来自商品池
  var SEEDS = [
    { pid: "100000019554590", target: 120, orig: 249.99, days: 21, ch: [0, 1] },
    { pid: "100000051304109", target: 299, orig: 349.99, days: 12, ch: [0, 2] },
    { pid: "100000019552858", target: 499, days: 9, ch: [0, 1] },
    { pid: "100000002665079", target: 139, days: 6, ch: [0], scope: "store" },
    { pid: "100000012672694", target: 69, days: 15, ch: [0, 1] },
    { pid: "100000016568828", target: 249, days: 4, ch: [0, 1, 2] },
    { pid: "100000016569496", target: 149, days: 27, ch: [0], off: true },
  ];
  function seed() {
    if (localStorage.getItem(SEED_KEY) || !products().length) return;
    var list = load();
    var have = {};
    list.forEach(function (t) {
      have[t.pid] = true;
    });
    SEEDS.forEach(function (s) {
      var p = productById(s.pid);
      if (!p || have[s.pid]) return;
      var ch = s.ch.map(function (i) {
        return CHANNELS[i];
      });
      list.push({
        pid: s.pid,
        target: s.target,
        scope: s.scope || "all",
        freq: "hourly",
        notify: ch.indexOf("Email") >= 0 ? "email" : "okiee",
        channels: ch,
        note: "",
        on: !s.off,
        orig: s.orig || p.price,
        at: Date.now() - s.days * 864e5,
      });
    });
    try {
      localStorage.setItem(SEED_KEY, "1");
    } catch (e) {}
    save(list);
  }

  /* ---------------- 价格相关 ---------------- */
  // 快捷档 / 默认目标价：$100 以上取整，$20 以上取到 0.5，再往下保留两位
  function nice(v, price) {
    if (price >= 100) return Math.floor(v);
    if (price >= 20) return Math.floor(v * 2) / 2;
    return r2(v);
  }
  function stepOf(price) {
    return price >= 200 ? 1 : price >= 20 ? 0.5 : 0.1;
  }
  function pctBelow(t, price) {
    return Math.round(((price - t) / price) * 100);
  }
  function genPrompt(p, st) {
    return (
      "Track the price of " +
      shortTitle(p.info.title) +
      (st.scope === "store"
        ? " at " + storeName(p.store) + " only"
        : " across all stores") +
      " and notify me via " +
      st.channels.join(", ") +
      " when it drops to " +
      tgt(st.target) +
      " or below."
    );
  }


  /* ================= 页面：/daily-picks#auto-task ================= */
  var layer = null;
  var filter = "all";
  var flashPid = null;

  function area() {
    var s = document.querySelector('[class*="_scroller_rm6ah_"]');
    return s && s.parentElement;
  }
  function onRoute() {
    return (
      !embed && location.hash === HASH && /^\/daily-picks\/?$/.test(path())
    );
  }
  // 原 /auto-task（窄栏以外的入口、直接打开的链接）改写到覆盖层
  function redirect() {
    if (embed || !/^\/auto-task\/?$/.test(path())) return false;
    history.replaceState(history.state, "", base() + "/daily-picks" + HASH);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return true;
  }
  window.lvOpenAutoTask = function () {
    if (onRoute()) return;
    history.pushState(null, "", base() + "/daily-picks" + HASH);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  function render(force) {
    var host = onRoute() && area();
    if (!host || !S() || !products().length) {
      if (layer) {
        layer.remove();
        layer = null;
      }
      root.removeAttribute("data-lvat-open");
      return;
    }
    seed();
    if (!layer) {
      layer = el("div", "lvat");
      force = true;
      if (window.ResizeObserver)
        new ResizeObserver(function () {
          fitCols();
        }).observe(layer);
    }
    if (layer.parentNode !== host) host.appendChild(layer);
    root.setAttribute("data-lvat-open", "");
    var sig = JSON.stringify([load(), filter]);
    if (force || layer._sig !== sig) {
      var top = layer.scrollTop;
      layer._sig = sig;
      layer.textContent = "";
      layer.appendChild(pageView());
      layer.scrollTop = top;
      fitCols();
    }
  }
  // 与原版一致：内容宽 ≤ 720 切单列
  function fitCols() {
    if (layer)
      layer.classList.toggle(
        "is-one",
        Math.min(1200, layer.clientWidth - 48) <= 720,
      );
  }

  var GROUPS = [
    {
      key: "reached",
      title: "Ready to buy",
      sub: "These hit your target price — prices can bounce back, so don't wait too long.",
    },
    {
      key: "watching",
      title: "Watching",
      sub: "Okiee checks prices across stores every hour.",
    },
    {
      key: "paused",
      title: "Paused",
      sub: "No alerts until you turn them back on.",
    },
  ];
  function pageView() {
    var list = tasks();
    var pg = el("div", "lvat-page");
    var head = el("header", "lvat-head");
    head.appendChild(el("h1", "lvat-title", "Auto-task"));
    pg.appendChild(head);

    var body = el("div", "lvat-body");
    pg.appendChild(body);
    var counts = { all: list.length, reached: 0, watching: 0, paused: 0 };
    list.forEach(function (t) {
      counts[t.st]++;
    });

    var bar = el("div", "lvat-bar");
    var chips = el("div", "lvat-chips");
    [
      ["all", "All"],
      ["reached", "Target reached"],
      ["watching", "Watching"],
      ["paused", "Paused"],
    ].forEach(function (c) {
      var b = btn(
        "lvat-chip" + (filter === c[0] ? " is-on" : ""),
        null,
        function () {
          filter = c[0];
          render(true);
        },
      );
      b.appendChild(el("span", null, c[1]));
      b.appendChild(el("span", "lvat-chip-n", String(counts[c[0]])));
      chips.appendChild(b);
    });
    bar.appendChild(chips);
    var add = btn("lvat-add", ICON.add + "<span>Add</span>", function () {
      openPicker();
    });
    bar.appendChild(add);
    body.appendChild(bar);

    if (!list.length) {
      body.appendChild(emptyView());
      return pg;
    }
    var shown = 0;
    GROUPS.forEach(function (g) {
      if (filter !== "all" && filter !== g.key) return;
      var items = list
        .filter(function (t) {
          return t.st === g.key;
        })
        .sort(function (a, b) {
          return (b.at || 0) - (a.at || 0);
        });
      if (!items.length) return;
      shown += items.length;
      var sec = el("section", "lvat-sec");
      if (filter === "all") {
        var h = el("h2", "lvat-sec-h");
        h.appendChild(el("span", null, g.title));
        h.appendChild(el("span", "lvat-sec-n", String(items.length)));
        sec.appendChild(h);
        sec.appendChild(el("p", "lvat-sec-sub", g.sub));
      }
      var grid = el("div", "lvat-grid");
      items.forEach(function (t) {
        grid.appendChild(card(t));
      });
      sec.appendChild(grid);
      body.appendChild(sec);
    });
    if (!shown)
      body.appendChild(el("p", "lvat-none", "Nothing here right now."));
    body.appendChild(resetLink());
    return pg;
  }
  // 演示用：恢复示例任务（清掉自己加的）
  function resetLink() {
    var f = el("div", "lvat-pagefoot");
    f.appendChild(
      btn("lvat-reset", "Reset demo data", function () {
        confirmBox({
          title: "Reset demo data",
          desc: "Restores the sample price trackers. Trackers you added will be removed.",
          ok: "Reset",
        }).then(function (ok) {
          if (!ok) return;
          try {
            localStorage.removeItem(SEED_KEY);
          } catch (e) {}
          save([]);
          seed();
          toast("Demo data restored");
        });
      }),
    );
    return f;
  }
  function emptyView() {
    var box = el("div", "lvat-empty");
    box.innerHTML = '<span class="lvat-empty-ico">' + ICON.bell + "</span>";
    box.appendChild(el("p", "lvat-empty-t", "No price trackers yet."));
    box.appendChild(
      el(
        "p",
        "lvat-empty-s",
        "Pick a product and set the price you'd pay — Okiee will tell you when it gets there.",
      ),
    );
    box.appendChild(
      btn("lvat-btn lvat-btn-primary", "Add price tracker", function () {
        openPicker();
      }),
    );
    return box;
  }

  function toggle(on, fn) {
    var b = btn(
      "lvat-toggle" + (on ? " is-on" : ""),
      '<span class="lvat-toggle-thumb"></span>',
      fn,
    );
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute(
      "aria-label",
      on ? "Pause price tracker" : "Resume price tracker",
    );
    return b;
  }
  function productImg(p, cls) {
    var f = el("span", cls);
    var i = el("img");
    i.alt = "";
    // 弹窗里的商品头立刻加载，列表 / 选品格子懒加载
    if (cls !== "lvat-ph-img") i.loading = "lazy";
    i.src = p.info.image;
    f.appendChild(i);
    return f;
  }
  function storeLine(p, cls) {
    var m = el("div", cls);
    var logo = storeLogo(p.store);
    if (logo) {
      var li = el("img", "lvat-logo");
      li.alt = "";
      li.src = logo;
      m.appendChild(li);
    }
    m.appendChild(el("span", null, storeName(p.store)));
    var rating = Number(p.info.rating) || 0;
    if (rating) {
      m.appendChild(el("span", "lvat-dot", "·"));
      var r = el("span", "lvat-rating");
      r.innerHTML = ICON.star;
      r.appendChild(document.createTextNode(rating.toFixed(1)));
      m.appendChild(r);
    }
    return m;
  }

  function card(t) {
    var p = t.product;
    var c = el(
      "div",
      "lvat-card is-" + t.st + (flashPid === t.pid ? " is-flash" : ""),
    );
    c.dataset.pid = t.pid;
    c.setAttribute("role", "button");
    c.tabIndex = 0;
    c.onclick = function () {
      openPanel(t.pid);
    };
    c.onkeydown = function (e) {
      if (e.key === "Enter" && e.target === c) openPanel(t.pid);
    };

    // 类型行（原版执行方行的位置）+ 开关
    var own = el("div", "lvat-owner");
    own.innerHTML = '<span class="lvat-owner-ico">' + ICON.tag + "</span>";
    own.appendChild(el("span", "lvat-owner-name", "Price tracker"));
    own.appendChild(
      toggle(t.on, function () {
        setOn(t.pid, !t.on);
      }),
    );
    c.appendChild(own);
    c.appendChild(el("div", "lvat-divider"));

    // 商品行：图 / 名称 › / 门店 · 评分 / 价格；右侧 30 天走势
    var prod = el("div", "lvat-prod");
    prod.title = "View product";
    prod.onclick = function (e) {
      e.stopPropagation();
      openPdp(p);
    };
    prod.appendChild(productImg(p, "lvat-prod-img"));
    var main = el("div", "lvat-prod-main");
    var name = el("div", "lvat-prod-name");
    name.appendChild(el("span", null, shortTitle(p.info.title)));
    name.insertAdjacentHTML("beforeend", ICON.arrow);
    main.appendChild(name);
    main.appendChild(storeLine(p, "lvat-prod-meta"));
    var pr = el("div", "lvat-prod-price");
    pr.appendChild(el("b", null, fmt(p.price)));
    var orig = t.orig || 0;
    if (orig > p.price + 0.005) {
      pr.appendChild(el("s", null, fmt(orig)));
      pr.appendChild(
        el(
          "span",
          "lvat-off",
          "−" + Math.round(((orig - p.price) / orig) * 100) + "%",
        ),
      );
    }
    main.appendChild(pr);
    prod.appendChild(main);
    c.appendChild(prod);

    // 状态句（App 文案）
    var st = el("p", "lvat-status");
    if (t.st === "reached") {
      st.innerHTML = ICON.check;
      st.appendChild(
        el(
          "span",
          null,
          "Your target price of " + tgt(t.target) + " has been reached.",
        ),
      );
    } else if (t.st === "watching") {
      st.innerHTML = ICON.eye;
      st.appendChild(
        el(
          "span",
          null,
          "We're watching this price. We'll alert you at or below " +
            tgt(t.target) +
            " (" +
            pctBelow(t.target, p.price) +
            "% below today).",
        ),
      );
    } else {
      st.innerHTML = ICON.pause;
      st.appendChild(
        el(
          "span",
          null,
          "Paused. Turn it on to get alerted at or below " +
            tgt(t.target) +
            ".",
        ),
      );
    }
    c.appendChild(st);
    c.appendChild(
      el(
        "p",
        "lvat-channels",
        "Notify via: " +
          t.channels.join(" · ") +
          (t.scope === "store" ? " · " + storeName(p.store) + " only" : ""),
      ),
    );

    // 底部：Adjust with Okiee（原版按钮）/ 主按钮 / •••
    var foot = el("div", "lvat-foot");
    foot.appendChild(
      btn("lvat-btn", "Adjust with Okiee", function () {
        adjustWithOkiee(t);
      }),
    );
    foot.appendChild(primaryBtn(t));
    foot.appendChild(moreMenu(t));
    c.appendChild(foot);
    return c;
  }
  function primaryBtn(t) {
    var p = t.product;
    if (t.st === "reached") {
      var a = el("a", "lvat-btn lvat-btn-primary");
      a.textContent = "Buy at " + storeName(p.store) + " · " + fmt(p.price);
      if (p.info.pdp_url) {
        a.href = p.info.pdp_url;
        a.target = "_blank";
        a.rel = "noopener";
        a.onclick = function (e) {
          e.stopPropagation();
        };
      } else
        a.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          openPdp(p);
        };
      return a;
    }
    if (t.st === "paused")
      return btn("lvat-btn lvat-btn-soft", "Resume", function () {
        setOn(t.pid, true);
      });
    return btn("lvat-btn lvat-btn-soft", "Adjust target", function () {
      openPanel(t.pid);
    });
  }

  /* ---------- ••• 菜单（原版 DetailModal 菜单样式） ---------- */
  var openMenuEl = null;
  function closeMenu() {
    if (openMenuEl) openMenuEl.remove();
    openMenuEl = null;
  }
  document.addEventListener(
    "mousedown",
    function (e) {
      if (
        openMenuEl &&
        !openMenuEl.contains(e.target) &&
        !(openMenuEl._anchor && openMenuEl._anchor.contains(e.target))
      )
        closeMenu();
    },
    true,
  );
  function popMenu(anchor, items) {
    if (openMenuEl && openMenuEl._anchor === anchor) return closeMenu();
    closeMenu();
    var m = el("div", "lvat-menu");
    items.forEach(function (it) {
      var b = btn(
        "lvat-menu-item" + (it.danger ? " is-danger" : ""),
        it.icon || "",
        function () {
          closeMenu();
          it.fn();
        },
      );
      b.appendChild(el("span", null, it.label));
      m.appendChild(b);
    });
    m._anchor = anchor;
    anchor.parentNode.appendChild(m);
    openMenuEl = m;
  }
  function moreMenu(t) {
    var wrap = el("div", "lvat-more");
    var b = btn("lvat-btn lvat-btn-icon", ICON.more, function () {
      popMenu(b, [
        {
          label: "Adjust price target",
          icon: ICON.edit,
          fn: function () {
            openPanel(t.pid);
          },
        },
        {
          label: "View product",
          icon: ICON.ext,
          fn: function () {
            openPdp(t.product);
          },
        },
        t.on
          ? {
              label: "Pause tracker",
              icon: ICON.pause,
              fn: function () {
                setOn(t.pid, false);
              },
            }
          : {
              label: "Resume tracker",
              icon: ICON.play,
              fn: function () {
                setOn(t.pid, true);
              },
            },
        {
          label: "Delete task",
          icon: ICON.del,
          danger: true,
          fn: function () {
            askDelete(t.pid);
          },
        },
      ]);
    });
    b.setAttribute("aria-label", "More");
    wrap.appendChild(b);
    return wrap;
  }

  function openPdp(p) {
    closeModal();
    if (S() && S().openPdp) S().openPdp(p);
  }
  function flash(pid) {
    flashPid = pid;
    render(true);
    setTimeout(function () {
      flashPid = null;
    }, 1800);
    if (!layer) return;
    var c = layer.querySelector('.lvat-card[data-pid="' + pid + '"]');
    if (!c) return;
    // 不用 scrollIntoView（会把 overflow:hidden 的外层一起滚走）
    var top =
      c.getBoundingClientRect().top -
      layer.getBoundingClientRect().top +
      layer.scrollTop;
    if (
      top < layer.scrollTop + 90 ||
      top > layer.scrollTop + layer.clientHeight - 200
    )
      layer.scrollTo({ top: Math.max(0, top - 120), behavior: "smooth" });
  }

  /* ================= 弹窗基础 ================= */
  var modal = null;
  function onEsc(e) {
    if (e.key === "Escape" && !document.querySelector(".lvat-ov-top"))
      closeModal();
  }
  function openModal(node) {
    closeModal();
    closeMenu();
    var ov = el("div", "lvat-ov");
    ov.onmousedown = function (e) {
      if (e.target === ov) closeModal();
    };
    ov.appendChild(node);
    document.body.appendChild(ov);
    modal = ov;
    document.addEventListener("keydown", onEsc);
    // 先强制排版再加 is-in，淡入不依赖 rAF（后台标签页里 rAF 不跑，弹窗会一直半透明）
    void ov.offsetWidth;
    ov.classList.add("is-in");
  }
  function closeModal() {
    if (!modal) return;
    modal.remove();
    modal = null;
    document.removeEventListener("keydown", onEsc);
  }
  // 原版删除确认（CustomModal.confirm 的文案）
  function confirmBox(o) {
    return new Promise(function (resolve) {
      var ov = el("div", "lvat-ov lvat-ov-top is-in");
      var box = el("div", "lvat-confirm");
      box.appendChild(el("h3", null, o.title));
      box.appendChild(el("p", null, o.desc));
      var acts = el("div", "lvat-confirm-acts");
      function done(v) {
        ov.remove();
        resolve(v);
      }
      acts.appendChild(
        btn("lvat-btn", o.cancel || "Cancel", function () {
          done(false);
        }),
      );
      acts.appendChild(
        btn("lvat-btn lvat-btn-danger", o.ok, function () {
          done(true);
        }),
      );
      box.appendChild(acts);
      ov.appendChild(box);
      ov.onmousedown = function (e) {
        if (e.target === ov) done(false);
      };
      document.body.appendChild(ov);
    });
  }
  function askDelete(pid) {
    confirmBox({
      title: "Delete Auto-task",
      desc: "This auto-task will be removed from your list. You can add it again anytime.",
      ok: "Delete",
    }).then(function (ok) {
      if (!ok) return;
      closeModal();
      removeTask(pid);
      toast("Auto-task deleted");
    });
  }
  function modalHead(title, opts) {
    var hd = el("div", "lvat-mh");
    if (opts.back)
      hd.appendChild(btn("lvat-icon lvat-back", ICON.back, opts.back));
    var tb = el("div", "lvat-mh-title");
    tb.appendChild(el("div", "lvat-mh-name", title));
    tb.appendChild(el("span", "lvat-mh-by", "Run by " + AGENT));
    hd.appendChild(tb);
    var acts = el("div", "lvat-mh-acts");
    if (opts.menu) {
      var wrap = el("div", "lvat-more");
      var m = btn("lvat-icon", ICON.more, function () {
        popMenu(m, opts.menu());
      });
      m.setAttribute("aria-label", "More");
      wrap.appendChild(m);
      acts.appendChild(wrap);
    }
    var x = btn("lvat-icon", ICON.close, closeModal);
    x.setAttribute("aria-label", "Close");
    acts.appendChild(x);
    hd.appendChild(acts);
    return hd;
  }

  /* ================= 条件面板：Price tracker ================= */
  function openPanel(pid, opts) {
    opts = opts || {};
    var p = productById(pid);
    if (!p) return;
    var task = findTask(pid);
    var create = !task;
    var hist = historyOf(p);
    var low = minOf(hist);
    var high = maxOf(hist);
    var init = task
      ? {
          target: task.target,
          scope: task.scope,
          channels: task.channels.slice(),
          prompt: task.prompt || "",
        }
      : {
          target: nice(p.price * 0.9, p.price),
          scope: "all",
          channels: ["Okiee Web/App", "Email"],
          prompt: "",
        };
    var st = {
      target: init.target,
      scope: init.scope,
      channels: init.channels.slice(),
      prompt: init.prompt,
    };
    var promptEdited = !!init.prompt;

    var box = el("div", "lvat-modal lvat-panel");
    box.appendChild(
      modalHead(create ? "New price tracker" : "Price tracker", {
        back: opts.back,
        menu: create
          ? null
          : function () {
              var cur = findTask(pid);
              return [
                cur && cur.on
                  ? {
                      label: "Pause tracker",
                      icon: ICON.pause,
                      fn: function () {
                        setOn(pid, false);
                        closeModal();
                      },
                    }
                  : {
                      label: "Resume tracker",
                      icon: ICON.play,
                      fn: function () {
                        setOn(pid, true);
                        closeModal();
                      },
                    },
                {
                  label: "Delete",
                  icon: ICON.del,
                  danger: true,
                  fn: function () {
                    askDelete(pid);
                  },
                },
              ];
            },
      }),
    );

    var bd = el("div", "lvat-mb");
    box.appendChild(bd);

    // 商品头：点名称 › 进 PDP
    var ph = el("div", "lvat-ph");
    ph.appendChild(productImg(p, "lvat-ph-img"));
    var pm = el("div", "lvat-ph-main");
    var pn = btn("lvat-ph-name", null, function () {
      openPdp(p);
    });
    pn.appendChild(el("span", null, shortTitle(p.info.title)));
    pn.insertAdjacentHTML("beforeend", ICON.arrow);
    pm.appendChild(pn);
    pm.appendChild(storeLine(p, "lvat-ph-meta"));
    pm.appendChild(el("div", "lvat-ph-now", "Current price: " + fmt(p.price)));
    ph.appendChild(pm);
    var stats = el("div", "lvat-ph-stats");
    [
      ["30-day low", fmt(low)],
      ["30-day high", fmt(high)],
    ].forEach(function (s) {
      var d = el("div", "lvat-ph-stat");
      d.appendChild(el("span", null, s[0]));
      d.appendChild(el("b", null, s[1]));
      stats.appendChild(d);
    });
    ph.appendChild(stats);
    bd.appendChild(ph);

    // Set expected price：价格图（拖目标线）+ 输入 + 快捷档
    var sec = el("div", "lvat-sec2");
    var lh = el("div", "lvat-label-row");
    lh.appendChild(el("p", "lvat-label", "Set expected price"));
    lh.appendChild(
      el("span", "lvat-label-tip", "Drag the blue line or type a price"),
    );
    sec.appendChild(lh);
    var ch = chart(
      p,
      hist,
      function () {
        return st.target;
      },
      function (v) {
        setTarget(v, "chart");
      },
    );
    sec.appendChild(ch.node);

    var row = el("div", "lvat-price-row");
    var ib = el("label", "lvat-input");
    ib.appendChild(el("span", "lvat-input-cur", "$"));
    var input = el("input");
    input.inputMode = "decimal";
    input.setAttribute("aria-label", "Expected price");
    input.value = st.target.toFixed(2);
    ib.appendChild(input);
    var clr = btn("lvat-x", ICON.close, function () {
      input.value = "";
      setTarget(NaN, "input");
      input.focus();
    });
    clr.setAttribute("aria-label", "Clear");
    ib.appendChild(clr);
    row.appendChild(ib);
    var hint = el("div", "lvat-hint");
    row.appendChild(hint);
    sec.appendChild(row);

    sec.appendChild(el("p", "lvat-sublabel", "Quick input"));
    var quick = el("div", "lvat-tags lvat-quick");
    var QUICK = [5, 10, 15, 20].map(function (k) {
      return {
        label: "-" + k + "%",
        v: nice(p.price * (1 - k / 100), p.price),
      };
    });
    if (low < p.price - 0.005)
      QUICK.push({ label: "30-day low · " + fmt(low), v: r2(low) });
    QUICK.forEach(function (q) {
      var b = btn("lvat-tag", null, function () {
        setTarget(q.v, "quick");
      });
      b.textContent = q.label;
      b._v = q.v;
      quick.appendChild(b);
    });
    sec.appendChild(quick);
    bd.appendChild(sec);

    // Where to watch
    var ws = el("div", "lvat-sec2");
    ws.appendChild(el("p", "lvat-label", "Where to watch"));
    var wt = el("div", "lvat-tags");
    [
      ["all", "All stores"],
      ["store", storeName(p.store) + " only"],
    ].forEach(function (o) {
      var b = btn("lvat-tag", null, function () {
        st.scope = o[0];
        sync("scope");
      });
      b.textContent = o[1];
      b._v = o[0];
      wt.appendChild(b);
    });
    ws.appendChild(wt);
    bd.appendChild(ws);

    // Notify via（原版：至少留一个）
    var ns = el("div", "lvat-sec2");
    ns.appendChild(el("p", "lvat-label", "Notify via"));
    var nt = el("div", "lvat-tags");
    CHANNELS.forEach(function (name) {
      var b = btn("lvat-tag", null, function () {
        var i = st.channels.indexOf(name);
        if (i >= 0) {
          if (st.channels.length <= 1) return;
          st.channels.splice(i, 1);
        } else st.channels.push(name);
        st.channels.sort(function (a, b2) {
          return CHANNELS.indexOf(a) - CHANNELS.indexOf(b2);
        });
        sync("channels");
      });
      b.textContent = name;
      b._v = name;
      nt.appendChild(b);
    });
    ns.appendChild(nt);
    bd.appendChild(ns);

    // Prompt（原版的 Prompt 文本框，收在折叠区；改里面的价格会同步回目标价）
    var ps = el("div", "lvat-sec2 lvat-prompt");
    var pt = btn("lvat-prompt-toggle", null, function () {
      ps.classList.toggle("is-open");
      if (ps.classList.contains("is-open")) fitArea();
    });
    pt.appendChild(el("span", "lvat-label", "Prompt"));
    pt.appendChild(
      el("span", "lvat-label-tip", "What Okiee runs for this task"),
    );
    pt.insertAdjacentHTML(
      "beforeend",
      '<span class="lvat-chev">' + ICON.chev + "</span>",
    );
    ps.appendChild(pt);
    var frame = el("div", "lvat-prompt-frame");
    var ta = el("textarea", "lvat-textarea");
    ta.dir = "auto";
    ta.rows = 2;
    frame.appendChild(ta);
    ps.appendChild(frame);
    bd.appendChild(ps);
    function fitArea() {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
    ta.oninput = function () {
      promptEdited = true;
      st.prompt = ta.value;
      var m = /\$\s?([\d,]+(?:\.\d+)?)/.exec(ta.value);
      if (m) setTarget(parseFloat(m[1].replace(/,/g, "")), "prompt");
      else sync("prompt");
      fitArea();
    };

    // 底部
    var ft = el("div", "lvat-mf");
    var note = el("span", "lvat-mf-note");
    ft.appendChild(note);
    var go = btn("lvat-update", create ? "Start tracking" : "Update", submit);
    ft.appendChild(go);
    box.appendChild(ft);

    input.oninput = function () {
      var v = parseFloat(input.value.replace(/[$,\s]/g, ""));
      setTarget(v > 0 ? v : NaN, "input");
    };
    input.onblur = function () {
      if (st.target > 0) input.value = st.target.toFixed(2);
    };
    input.onkeydown = function (e) {
      if (e.key === "Enter") submit();
    };

    function valid() {
      return st.target > 0 && st.channels.length > 0;
    }
    function dirty() {
      if (create) return true;
      return (
        Math.abs(st.target - init.target) > 0.004 ||
        st.scope !== init.scope ||
        st.channels.join("|") !== init.channels.join("|") ||
        (promptEdited && st.prompt !== init.prompt)
      );
    }
    function setTarget(v, from) {
      st.target = v > 0 ? r2(v) : NaN;
      if (from !== "input" && st.target > 0) input.value = st.target.toFixed(2);
      sync(from);
    }
    function sync(from) {
      var t = st.target;
      // 提示：低于今天多少 / 已低于现价会马上提醒；过去 30 天碰到过几次
      hint.textContent = "";
      hint.className = "lvat-hint";
      if (t > 0) {
        var b = el("b");
        if (t >= p.price - 0.004) {
          hint.classList.add("is-warn");
          b.textContent = create
            ? "At or above today's price"
            : "Already reached";
          hint.appendChild(b);
          hint.appendChild(
            document.createTextNode(
              create
                ? " — you'll be alerted right away"
                : " — today's price is at or below this target",
            ),
          );
        } else {
          b.textContent = pctBelow(t, p.price) + "% below today";
          hint.appendChild(b);
          var hits = hist.filter(function (v) {
            return v <= t + 0.004;
          }).length;
          hint.appendChild(
            document.createTextNode(
              hits
                ? " · reached on " +
                    hits +
                    " of the last " +
                    hist.length +
                    " days"
                : " · not seen in the last " + hist.length + " days",
            ),
          );
        }
      }
      [].forEach.call(quick.children, function (b2) {
        b2.classList.toggle("is-on", t > 0 && Math.abs(b2._v - t) < 0.005);
      });
      [].forEach.call(wt.children, function (b2) {
        b2.classList.toggle("is-on", b2._v === st.scope);
      });
      [].forEach.call(nt.children, function (b2) {
        b2.classList.toggle("is-on", st.channels.indexOf(b2._v) >= 0);
      });
      if (
        from !== "prompt" &&
        (!promptEdited ||
          from === "quick" ||
          from === "chart" ||
          from === "input" ||
          from === "scope" ||
          from === "channels")
      ) {
        if (t > 0) {
          promptEdited = false;
          st.prompt = genPrompt(p, st);
          ta.value = st.prompt;
          if (ps.classList.contains("is-open")) fitArea();
        }
      }
      if (from !== "chart") ch.draw();
      var ok = valid() && dirty();
      go.disabled = !ok;
      go.classList.toggle("is-disabled", !ok);
      note.textContent =
        t > 0
          ? "Okiee checks " +
            (st.scope === "store" ? storeName(p.store) : "every store") +
            " hourly and alerts you at or below " +
            tgt(t) +
            "."
          : "Enter the price you'd be happy to pay.";
    }
    function submit() {
      if (!valid() || !dirty()) return;
      var list = load();
      var t = null;
      list.forEach(function (x) {
        if (x.pid === pid) t = x;
      });
      if (!t) {
        t = {
          pid: pid,
          at: Date.now(),
          orig: p.price,
          freq: "hourly",
          note: "",
          on: true,
        };
        list.unshift(t);
      }
      t.target = st.target;
      t.scope = st.scope;
      t.channels = st.channels.slice();
      t.notify = t.channels.indexOf("Email") >= 0 ? "email" : "okiee";
      if (t.on === undefined) t.on = true;
      if (promptEdited) t.prompt = st.prompt;
      else delete t.prompt;
      save(list);
      closeModal();
      toast(
        create
          ? "Price tracker added — we'll alert you at or below " +
              tgt(st.target)
          : "Updated successfully",
      );
      if (layer) flash(pid);
    }

    openModal(box);
    sync("init");
    if (opts.focusInput) input.focus();
  }

  /* ---------- 30 天价格图：价格线 + 目标线（可拖）+ 低于目标的提醒区 ---------- */
  function chart(p, hist, getT, setT) {
    var W = 752;
    var H = 236;
    var ml = 56;
    var mr = 100;
    var mt = 26;
    var mb = 30;
    var pw = W - ml - mr;
    var phh = H - mt - mb;
    var n = hist.length;
    var low = minOf(hist);
    var high = maxOf(hist);
    var range = calc(getT());
    var step = stepOf(p.price);
    function calc(t) {
      var lo = Math.min(low, t > 0 ? t : low, p.price * 0.6);
      var hi = Math.max(high, t > 0 ? t : high, p.price);
      var pad = (hi - lo) * 0.12 || hi * 0.1 || 1;
      return [Math.max(0, lo - pad * 0.6), hi + pad];
    }
    function X(i) {
      return ml + (i * pw) / (n - 1);
    }
    function Y(v) {
      return mt + ((range[1] - v) / (range[1] - range[0])) * phh;
    }
    function ticks() {
      var span = range[1] - range[0];
      var raw = span / 4;
      var mag = Math.pow(10, Math.floor(Math.log10(raw)));
      var unit =
        [1, 2, 2.5, 5, 10]
          .map(function (k) {
            return k * mag;
          })
          .filter(function (u) {
            return u >= raw;
          })[0] || raw;
      var out = [];
      for (var v = Math.ceil(range[0] / unit) * unit; v <= range[1]; v += unit)
        out.push(v);
      return out;
    }
    function money(v) {
      return v >= 1000
        ? "$" + Math.round(v).toLocaleString("en-US")
        : v >= 100
          ? "$" + Math.round(v)
          : "$" + (Math.round(v) === v ? v : v.toFixed(2));
    }
    var node = el("div", "lvat-chart");
    var NS = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 " + W + " " + H);
    s.setAttribute("class", "lvat-chart-svg");
    node.appendChild(s);

    function draw() {
      var t = getT();
      if (t > 0 && (t < range[0] || t > range[1])) range = calc(t);
      var parts = [];
      parts.push(
        '<defs><linearGradient id="lvatArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2329" stop-opacity=".09"/><stop offset="1" stop-color="#1f2329" stop-opacity="0"/></linearGradient></defs>',
      );
      ticks().forEach(function (v) {
        var y = Y(v).toFixed(1);
        parts.push(
          '<line x1="' +
            ml +
            '" x2="' +
            (ml + pw) +
            '" y1="' +
            y +
            '" y2="' +
            y +
            '" stroke="rgba(0,0,0,.06)"/>',
        );
        parts.push(
          '<text x="' +
            (ml - 10) +
            '" y="' +
            y +
            '" dy="4" text-anchor="end" class="lvat-ax">' +
            money(v) +
            "</text>",
        );
      });
      [
        0,
        Math.round((n - 1) / 3),
        Math.round(((n - 1) * 2) / 3),
        n - 1,
      ].forEach(function (i, k) {
        parts.push(
          '<text x="' +
            X(i).toFixed(1) +
            '" y="' +
            (H - 8) +
            '" text-anchor="' +
            (k === 0 ? "start" : k === 3 ? "end" : "middle") +
            '" class="lvat-ax">' +
            (i === n - 1 ? "Today" : dayLabel(n - 1 - i)) +
            "</text>",
        );
      });
      if (t > 0) {
        var ty = Math.min(mt + phh, Math.max(mt, Y(t)));
        parts.push(
          '<rect x="' +
            ml +
            '" y="' +
            ty.toFixed(1) +
            '" width="' +
            pw +
            '" height="' +
            (mt + phh - ty).toFixed(1) +
            '" fill="rgba(0,122,255,.07)"/>',
        );
      }
      var line = hist
        .map(function (v, i) {
          return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1);
        })
        .join("");
      parts.push(
        '<path d="' +
          line +
          "L" +
          X(n - 1).toFixed(1) +
          " " +
          (mt + phh) +
          "L" +
          ml +
          " " +
          (mt + phh) +
          'Z" fill="url(#lvatArea)"/>',
      );
      parts.push(
        '<path d="' +
          line +
          '" fill="none" stroke="#3a3f47" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
      );
      // 低于目标的日子：蓝点
      if (t > 0)
        hist.forEach(function (v, i) {
          if (v <= t + 0.004 && i < n - 1)
            parts.push(
              '<circle cx="' +
                X(i).toFixed(1) +
                '" cy="' +
                Y(v).toFixed(1) +
                '" r="2.6" fill="#007aff"/>',
            );
        });
      // 30 天最低
      var li = hist.indexOf(low);
      if (low < p.price - 0.005 && li >= 0 && li < n - 1) {
        parts.push(
          '<circle cx="' +
            X(li).toFixed(1) +
            '" cy="' +
            Y(low).toFixed(1) +
            '" r="3.5" fill="#fff" stroke="#3a3f47" stroke-width="1.5"/>',
        );
        parts.push(
          '<text x="' +
            X(li).toFixed(1) +
            '" y="' +
            (Y(low) + 18).toFixed(1) +
            '" text-anchor="middle" class="lvat-ax lvat-ax-b">Low ' +
            fmt(low) +
            "</text>",
        );
      }
      // 今天
      var tx = X(n - 1);
      var tyy = Y(p.price);
      parts.push(
        '<circle cx="' +
          tx.toFixed(1) +
          '" cy="' +
          tyy.toFixed(1) +
          '" r="5" fill="#1f2329" stroke="#fff" stroke-width="2"/>',
      );
      parts.push(
        '<text x="' +
          (tx - 10).toFixed(1) +
          '" y="' +
          (tyy - 12).toFixed(1) +
          '" text-anchor="end" class="lvat-ax lvat-ax-b">Today ' +
          fmt(p.price) +
          "</text>",
      );
      // 目标线 + 右侧标签（拖拽把手）
      if (t > 0) {
        var gy = Y(t);
        parts.push(
          '<line x1="' +
            ml +
            '" x2="' +
            (ml + pw + 6) +
            '" y1="' +
            gy.toFixed(1) +
            '" y2="' +
            gy.toFixed(1) +
            '" stroke="#007aff" stroke-width="1.8" stroke-dasharray="6 4"/>',
        );
        // 标签宽度跟着金额长短走：左侧上下箭头 + 金额
        var label = tgt(t);
        var hx = ml + pw + 6;
        var hw = Math.min(mr - 6, Math.max(60, 30 + label.length * 7.4));
        parts.push(
          '<g class="lvat-handle"><rect x="' +
            hx +
            '" y="' +
            (gy - 13).toFixed(1) +
            '" width="' +
            hw.toFixed(1) +
            '" height="26" rx="13" fill="#007aff"/>' +
            '<text x="' +
            (hx + 22) +
            '" y="' +
            gy.toFixed(1) +
            '" dy="4.5" text-anchor="start" class="lvat-handle-t">' +
            label +
            "</text>" +
            '<path d="M' +
            (hx + 9) +
            " " +
            (gy - 3).toFixed(1) +
            "l3 -3 3 3M" +
            (hx + 9) +
            " " +
            (gy + 3).toFixed(1) +
            'l3 3 3 -3" stroke="rgba(255,255,255,.75)" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>',
        );
        parts.push(
          '<text x="' +
            (ml + 8) +
            '" y="' +
            (gy - 8).toFixed(1) +
            '" class="lvat-ax lvat-ax-blue">Alert me at or below</text>',
        );
      }
      s.innerHTML = parts.join("");
    }

    // 拖拽 / 点击：在绘图区或右侧标签上按下即把目标线移到指针处，按住拖动
    var dragging = false;
    function valueAt(e) {
      var r = s.getBoundingClientRect();
      var y = ((e.clientY - r.top) * H) / r.height;
      var v = range[0] + ((mt + phh - y) / phh) * (range[1] - range[0]);
      v = Math.round(v / step) * step;
      return Math.min(range[1], Math.max(Math.max(step, range[0]), v));
    }
    function inside(e) {
      var r = s.getBoundingClientRect();
      var x = ((e.clientX - r.left) * W) / r.width;
      var y = ((e.clientY - r.top) * H) / r.height;
      return x >= ml - 4 && x <= W && y >= mt - 14 && y <= mt + phh + 6;
    }
    s.addEventListener("pointerdown", function (e) {
      if (!inside(e)) return;
      dragging = true;
      s.setPointerCapture(e.pointerId);
      node.classList.add("is-drag");
      setT(valueAt(e));
      draw();
      e.preventDefault();
    });
    s.addEventListener("pointermove", function (e) {
      if (dragging) {
        setT(valueAt(e));
        draw();
      } else node.classList.toggle("is-hot", inside(e));
    });
    function end() {
      dragging = false;
      node.classList.remove("is-drag");
    }
    s.addEventListener("pointerup", end);
    s.addEventListener("pointercancel", end);
    s.addEventListener("pointerleave", function () {
      if (!dragging) node.classList.remove("is-hot");
    });

    draw();
    return { node: node, draw: draw };
  }

  /* ================= Add：选商品 → 条件面板 ================= */
  function likedProducts() {
    var likes = {};
    try {
      likes = JSON.parse(localStorage.getItem("mock:likes") || "{}");
    } catch (e) {}
    return products().filter(function (p) {
      return likes[p.info.buybox_id];
    });
  }
  function openPicker(state) {
    state = state || { tab: "suggested", q: "" };
    var box = el("div", "lvat-modal lvat-picker");
    box.appendChild(modalHead("New price tracker", {}));
    var bd = el("div", "lvat-mb");
    box.appendChild(bd);
    bd.appendChild(
      el(
        "p",
        "lvat-desc",
        "Pick a product, then set the price you'd be happy to pay. Okiee watches it across stores and tells you when it gets there.",
      ),
    );

    var sb = el("label", "lvat-search");
    sb.innerHTML = ICON.search;
    var q = el("input");
    q.placeholder = "Search products";
    q.value = state.q;
    sb.appendChild(q);
    bd.appendChild(sb);

    var tabs = el("div", "lvat-chips");
    var liked = likedProducts();
    [
      ["suggested", "Big price drops"],
      ["liked", "Favorites"],
    ].forEach(function (tb) {
      var b = btn(
        "lvat-chip" + (state.tab === tb[0] ? " is-on" : ""),
        null,
        function () {
          state.tab = tb[0];
          [].forEach.call(tabs.children, function (x) {
            x.classList.toggle("is-on", x === b);
          });
          fill();
        },
      );
      b.appendChild(el("span", null, tb[1]));
      if (tb[0] === "liked")
        b.appendChild(el("span", "lvat-chip-n", String(liked.length)));
      tabs.appendChild(b);
    });
    bd.appendChild(tabs);

    var grid = el("div", "lvat-tiles");
    bd.appendChild(grid);
    function fill() {
      var term = q.value.trim().toLowerCase();
      tabs.style.display = term ? "none" : "";
      var list;
      if (term) {
        var words = term.split(/\s+/);
        list = products().filter(function (p) {
          var tl = p.info.title.toLowerCase();
          return words.every(function (w) {
            return tl.indexOf(w) >= 0;
          });
        });
      } else if (state.tab === "liked") list = liked.slice();
      else
        list = products()
          .filter(function (p) {
            return p.price >= 10;
          })
          .sort(
            S().byDrop ||
              function () {
                return 0;
              },
          );
      list = list.slice(0, 40);
      grid.textContent = "";
      if (!list.length) {
        grid.appendChild(
          el(
            "p",
            "lvat-none",
            term
              ? "No products match “" + q.value.trim() + "”."
              : "No favorites yet — tap ♡ on any product to save it.",
          ),
        );
        return;
      }
      list.forEach(function (p) {
        var tracked = findTask(p.id);
        var tile = el("div", "lvat-tile");
        tile.setAttribute("role", "button");
        tile.tabIndex = 0;
        tile.onclick = function () {
          state.q = q.value;
          if (tracked)
            openPanel(p.id, {
              back: function () {
                openPicker(state);
              },
            });
          else
            openPanel(p.id, {
              back: function () {
                openPicker(state);
              },
              focusInput: false,
            });
        };
        tile.appendChild(productImg(p, "lvat-tile-img"));
        if (tracked)
          tile.appendChild(el("span", "lvat-tile-badge", "Tracking"));
        else if (p.drop >= 5)
          tile.appendChild(
            el(
              "span",
              "lvat-tile-badge is-off",
              "−" + Math.round(p.drop) + "%",
            ),
          );
        tile.appendChild(el("div", "lvat-tile-name", p.info.title));
        var meta = el("div", "lvat-tile-meta");
        meta.appendChild(el("b", null, fmt(p.price)));
        meta.appendChild(el("span", null, storeName(p.store)));
        tile.appendChild(meta);
        grid.appendChild(tile);
      });
    }
    q.oninput = fill;
    fill();

    var ft = el("div", "lvat-mf");
    var link = btn(
      "lvat-link",
      ICON.chat + "<span>Or describe it to Okiee</span>",
      function () {
        closeModal();
        chatFill("Track the price of ", null);
      },
    );
    ft.appendChild(link);
    ft.appendChild(el("span", "lvat-mf-note", "Only price trackers for now"));
    box.appendChild(ft);
    openModal(box);
    setTimeout(function () {
      q.focus();
    }, 60);
  }

  /* ================= Adjust with Okiee：右侧会话窗 ================= */
  function quoteOf(p) {
    return {
      quoteSource: "auto_task",
      display: { title: shortTitle(p.info.title), imageUrl: p.info.image },
      pdp: {
        locator: { source: p.store, region: "US", offerId: "at-" + p.id },
      },
      status: "active",
    };
  }
  function chatFill(text, quote) {
    if (window.lvDrawerFill && window.lvDrawerActive && window.lvDrawerActive())
      return window.lvDrawerFill(text, quote);
    // 没有会话窗的方案：直接发出去（同站内其他入口）
    if (S() && S().sendQuery) S().sendQuery(text, quote);
  }
  function adjustWithOkiee(t) {
    var p = t.product;
    chatFill(
      "Update my price tracker for " +
        chatName(p) +
        ": alert me at or below " +
        tgt(t.target),
      quoteOf(p),
    );
  }

  /* ---------- 会话 mock：改目标价 / 用一句话新建 ---------- */
  function textBlock(s) {
    return { type: "text", payload: { content: s } };
  }
  function attachedPid(frame) {
    var pid = null;
    try {
      (JSON.parse(frame.message.customized_data).blocks || []).forEach(
        function (b) {
          var loc = b.payload && b.payload.pdp && b.payload.pdp.locator;
          var id = loc && (loc.offer_id || loc.offerId);
          var m = id && /^(?:at|cmp)-(?:photo-)?(\d+)$/.exec(id);
          if (m) pid = m[1];
        },
      );
    } catch (e) {}
    return pid;
  }
  function productByWords(name) {
    var words = (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(function (w) {
        return (
          w.length >= 2 && ["the", "and", "for", "of", "my", "a"].indexOf(w) < 0
        );
      });
    if (!words.length) return null;
    var best = null;
    var bestScore = 0;
    products().forEach(function (p) {
      var tl = p.info.title.toLowerCase();
      var score = words.filter(function (w) {
        return tl.indexOf(w) >= 0;
      }).length;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    });
    return bestScore >= Math.min(2, words.length) ? best : null;
  }
  var RE_UPDATE =
    /^update my price tracker for (.+?):\s*alert me (?:when it drops )?(?:to |at or below |below |under )?\$\s?([\d,]+(?:\.\d+)?)/i;
  var RE_NEW =
    /^track (?:the )?price (?:of|for) (.+?)(?:,| and| —| -)? (?:alert|notify|tell) me (?:when it drops |if it drops )?(?:to |at or below |below |under )?\$\s?([\d,]+(?:\.\d+)?)/i;
  function confirmText(p, t, verb) {
    var now = p.price <= t.target + 0.004;
    return (
      verb +
      " your price tracker for **" +
      chatName(p) +
      "**: I'll alert you via " +
      listJoin(t.channels) +
      " as soon as it drops to **" +
      tgt(t.target) +
      "** or below" +
      (t.scope === "store" ? " at " + storeName(p.store) : " at any store") +
      ".\n\n" +
      (now
        ? "Heads up — it's already **" +
          fmt(p.price) +
          "** at " +
          storeName(p.store) +
          ", so this one is ready to buy."
        : "Today it's " +
          fmt(p.price) +
          " at " +
          storeName(p.store) +
          " (" +
          pctBelow(t.target, p.price) +
          "% to go).") +
      "\n\nYou can see and edit it anytime under **Auto-task**."
    );
  }
  var prevReply = window.mockReplyFor;
  window.mockReplyFor = function (text, frame) {
    var s = (text || "").trim();
    var m = RE_UPDATE.exec(s);
    if (m) {
      var pid = (frame && attachedPid(frame)) || null;
      var t = pid ? findTask(pid) : null;
      if (!t) {
        var name = m[1].toLowerCase();
        tasks().forEach(function (x) {
          if (!t && chatName(x.product).toLowerCase() === name)
            t = x;
        });
      }
      if (t) {
        var v = r2(parseFloat(m[2].replace(/,/g, "")));
        patch(t.pid, function (o) {
          o.target = v;
          o.on = true;
          delete o.prompt;
        });
        var nt = findTask(t.pid);
        return [textBlock(confirmText(nt.product, nt, "Done — I've updated"))];
      }
    }
    var c = RE_NEW.exec(s);
    if (c) {
      var p =
        (frame && attachedPid(frame) && productById(attachedPid(frame))) ||
        productByWords(c[1]);
      if (p) {
        var val = r2(parseFloat(c[2].replace(/,/g, "")));
        var list = load().filter(function (x) {
          return x.pid !== p.id;
        });
        var old = findTask(p.id);
        list.unshift({
          pid: p.id,
          target: val,
          scope: "all",
          freq: "hourly",
          notify: "email",
          channels: old ? old.channels : ["Okiee Web/App", "Email"],
          note: "",
          on: true,
          orig: old && old.orig ? old.orig : p.price,
          at: old && old.at ? old.at : Date.now(),
        });
        save(list);
        return [
          textBlock(confirmText(p, findTask(p.id), "Done — I've set up")),
        ];
      }
    }
    return prevReply ? prevReply(text, frame) : null;
  };
  var prevThinking = window.lvThinkingFor;
  window.lvThinkingFor = function (text) {
    var s = (text || "").trim();
    if (RE_UPDATE.test(s))
      return ["Updating your price tracker…", "Saving it to Auto-task…"];
    if (RE_NEW.test(s))
      return [
        "Finding the product…",
        "Setting up a price tracker…",
        "Saving it to Auto-task…",
      ];
    return prevThinking ? prevThinking(text) : ["Thinking…"];
  };

  /* ================= PDP：底部按钮上方的 Price tracker 条 ================= */
  var strip = null;
  function syncPdp() {
    var drawer = document.querySelector(
      'aside[class*="_drawer_"][class*="_open_"]',
    );
    var foot = drawer && drawer.querySelector('[class*="_pdpFooter_"]');
    var last = window.__lvLastPdp && window.__lvLastPdp[0];
    var pid = last && String(last.cspuId || last.productId || "");
    var p = pid && productById(pid);
    if (!foot || !p) {
      if (strip) strip.remove();
      return;
    }
    var t = findTask(pid);
    var sig = pid + "|" + (t ? [t.st, t.target, t.on].join(",") : "none");
    if (strip && strip.parentNode === foot && strip._sig === sig) return;
    if (!strip) strip = el("div", "lvat-pdp");
    strip._sig = sig;
    strip.textContent = "";
    strip.className = "lvat-pdp" + (t ? " is-" + t.st : " is-none");
    var ico = el("span", "lvat-pdp-ico");
    ico.innerHTML =
      t && t.st === "reached"
        ? ICON.check
        : t && t.st === "paused"
          ? ICON.pause
          : ICON.bell;
    strip.appendChild(ico);
    var main = el("div", "lvat-pdp-main");
    if (!t) {
      main.appendChild(el("b", null, "Wait for a better price?"));
      main.appendChild(el("span", null, "Okiee can alert you when it drops."));
    } else if (t.st === "reached") {
      main.appendChild(el("b", null, "Target reached · " + tgt(t.target)));
      main.appendChild(el("span", null, "Price tracker in Auto-task"));
    } else if (t.st === "paused") {
      main.appendChild(
        el("b", null, "Price tracker paused · " + tgt(t.target)),
      );
      main.appendChild(el("span", null, "Turn it back on in Auto-task"));
    } else {
      main.appendChild(
        el("b", null, "Tracking · alert at or below " + tgt(t.target)),
      );
      main.appendChild(
        el(
          "span",
          null,
          pctBelow(t.target, p.price) +
            "% below today · via " +
            t.channels.join(", "),
        ),
      );
    }
    strip.appendChild(main);
    strip.appendChild(
      btn(
        "lvat-pdp-btn" + (t ? " is-soft" : ""),
        t ? "Edit" : "Track price",
        function () {
          openPanel(pid);
        },
      ),
    );
    if (strip.parentNode !== foot) foot.insertBefore(strip, foot.firstChild);
  }

  /* ================= 调度 ================= */
  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      if (redirect()) return;
      render();
      syncPdp();
    }, 120);
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("lv:tracked", function () {
    render();
    if (strip) strip._sig = null;
    syncPdp();
  });
  // 会话窗（iframe）里改了任务：storage 事件同步到外层页面
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    render();
    if (strip) strip._sig = null;
    syncPdp();
  });
  schedule();
})();
