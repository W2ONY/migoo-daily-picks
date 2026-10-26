/*
 * 页面方案切换：右下角悬浮球选方案，结果存 localStorage（local:variant），
 * 通过 <html data-local-variant="…"> 让 overrides.css 里的方案样式生效。
 * 新增方案：在 VARIANTS 里加一项，样式写在 overrides.css 对应的 [data-local-variant] 下。
 */
(function () {
  var VARIANTS = [
    { id: "v1", name: "方案一", desc: "线上原版（带侧边栏）" },
    { id: "v2", name: "方案二", desc: "Daydream 式顶栏：Explore + 个人中心" },
    { id: "v3", name: "方案三（旧）", desc: "Phia 式左侧窄栏：Chat / Explore / Favorites", hidden: true },
    { id: "v4", name: "方案四", desc: "方案三 + 信息流上方 Categories 商品分类", hidden: true },
    { id: "v5", name: "方案三", desc: "左侧窄栏 + Explore 首屏、底部输入框（滚动收起）、小优惠券" },
    { id: "v6", name: "方案四", desc: "方案三 + 右侧会话窗：任何页面都能拉开，可展开全屏，没有单独的会话页" },
  ];
  // hidden：不出现在切换菜单里，存过的也回落到默认方案（代码保留，方案五仍复用方案三、四的改动）
  var KEY = "local:variant";
  var root = document.documentElement;

  function current() {
    var v = null;
    try {
      v = localStorage.getItem(KEY);
    } catch (e) {}
    return VARIANTS.some(function (x) {
      return x.id === v && !x.hidden;
    })
      ? v
      : window.LV_DEFAULT_VARIANT || VARIANTS[0].id;
  }
  // 方案二、三共用 Explore 页改动（输入框在副标题下 / 吸顶胶囊 / 降价 placeholder / 个人中心浮层），
  // 用 <html data-lv-hero> 标记，样式里写 [data-lv-hero]
  // 方案四（v6）= 方案三（v5）+ 右侧会话窗：页面改版全按方案三走，只多一个 data-lv-drawer
  function base() {
    return current() === "v6" ? "v5" : current();
  }
  function isV4Like() {
    return base() === "v4" || base() === "v5";
  }
  function isHero() {
    return current() !== "v1";
  }
  function toggleAttr(name, on) {
    if (on) root.setAttribute(name, "");
    else root.removeAttribute(name);
  }
  function markVariant(id) {
    var v = id === "v6" ? "v5" : id;
    root.setAttribute("data-local-variant", v);
    toggleAttr("data-lv-drawer", id === "v6");
    // data-lv-hero：方案二~四共用 Explore 改动；data-lv-rail：方案三、四的左侧窄栏；data-lv-cats：方案四分类
    toggleAttr("data-lv-hero", v !== "v1");
    // data-lv-v4：方案四、五共用的 Explore 首屏 / 分区 / PDP 浮层等改动
    // 会话窗里的嵌入页不要窄栏
    toggleAttr("data-lv-rail", !root.hasAttribute("data-lv-embed") && (v === "v3" || v === "v4" || v === "v5"));
    toggleAttr("data-lv-cats", v === "v4" || v === "v5");
    toggleAttr("data-lv-v4", v === "v4" || v === "v5");
    window.dispatchEvent(new Event("local:variant"));
  }
  // 方案二、三：点页面空白处不收起输入坞（原页面跳过带 data-daily-picks-input-entry 祖先的点击，
  // 该属性只用于这个判断，挂在 body 上即全局生效）
  function markNoCollapse() {
    if (!document.body) return;
    if (isHero()) document.body.setAttribute("data-daily-picks-input-entry", "");
    else document.body.removeAttribute("data-daily-picks-input-entry");
  }
  // 方案三（原方案四/五）样式分支（localStorage local:v4-layout）：
  //   chat = 对话（默认）：分区和「折叠」一样只露一行，底部按钮改为进对话（More good prices / More good savings）
  //   grid = 折叠：多行网格 + See more 展开；scroll = 横滑
  // <html data-lv-layout> 只有 scroll / grid 两种排版（对话也按 grid 排），对话另加 data-lv-more="chat"
  var V4_LAYOUTS = [
    { id: "scroll", name: "横滑" },
    { id: "grid", name: "折叠" },
    { id: "chat", name: "对话" },
  ];
  function v4Layout() {
    var v = null;
    try {
      v = localStorage.getItem("local:v4-layout");
    } catch (e) {}
    return v === "scroll" || v === "grid" ? v : "chat";
  }
  function markLayout(id) {
    root.setAttribute("data-lv-layout", id === "scroll" ? "scroll" : "grid");
    if (id === "chat") root.setAttribute("data-lv-more", "chat");
    else root.removeAttribute("data-lv-more");
  }
  function setV4Layout(id) {
    try {
      localStorage.setItem("local:v4-layout", id);
    } catch (e) {}
    markLayout(id);
    window.dispatchEvent(new Event("local:layout"));
  }
  markLayout(v4Layout());

  // 方案四输入框分支（localStorage local:v6-dock）：auto = 自动（顶部展开、离开顶部收成胶囊）；
  // collapsed = 收起（默认；任何位置都只露右下角「Ask migoo」胶囊，输入都在右侧会话窗里进行）
  var V6_DOCKS = [
    { id: "auto", name: "自动" },
    { id: "collapsed", name: "收起" },
  ];
  function v6Dock() {
    var v = null;
    try {
      v = localStorage.getItem("local:v6-dock");
    } catch (e) {}
    return v === "auto" ? v : "collapsed";
  }
  function setV6Dock(id) {
    try {
      localStorage.setItem("local:v6-dock", id);
    } catch (e) {}
    schedulePlace();
  }

  function apply(v) {
    markVariant(v);
    markNoCollapse();
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
    renderMenu();
    schedulePlace();
  }
  markVariant(current());

  // 走应用自己的路由（React Router 监听 popstate），不整页刷新
  // path 可带 #hash（如 /daily-picks#chats 打开对话列表）；路径和 hash 都相同才算原地不动
  function go(path) {
    if (lvPath() + location.hash === path) return;
    history.pushState(null, "", (window.LV_BASE || "") + path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------- 悬浮球 ---------- */
  var ball, menu;
  function renderMenu() {
    if (!menu) return;
    var v = current();
    menu.innerHTML = '<div class="lv-menu-title">页面方案</div>';
    VARIANTS.forEach(function (x) {
      if (x.hidden) return;
      var item = el(
        "button",
        "lv-menu-item" + (x.id === v ? " is-active" : ""),
      );
      item.type = "button";
      item.innerHTML =
        '<span class="lv-dot"></span><span><b>' +
        x.name +
        "</b><small>" +
        x.desc +
        "</small></span>";
      item.onclick = function () {
        apply(x.id);
        menu.classList.remove("is-open");
      };
      menu.appendChild(item);
      // 各方案自己的分支挂在该方案下面（不选中也显示）：方案三 = 样式（方案四沿用同一套）；方案四 = 输入框自动 / 收起
      if (x.id === "v5") menu.appendChild(segment("样式", V4_LAYOUTS, v4Layout(), setV4Layout, v === "v6" ? null : "v5"));
      if (x.id === "v6") menu.appendChild(segment("输入框", V6_DOCKS, v6Dock(), setV6Dock, "v6"));
    });
    if (ball)
      ball.querySelector(".lv-ball-label").textContent = VARIANTS.filter(
        function (x) {
          return x.id === v;
        },
      )[0].name.replace("方案", "");
  }
  // 分支切换条：选分支时顺带切到该方案（target 为空则留在当前方案，如方案四里改方案三样式）
  function segment(label, items, active, set, target) {
    var seg = el("div", "lv-menu-seg");
    seg.appendChild(el("span", "lv-menu-seg-label", label));
    var group = el("div", "lv-menu-seg-group");
    items.forEach(function (it) {
      var b = el("button", "lv-menu-seg-btn" + (active === it.id ? " is-active" : ""), it.name);
      b.type = "button";
      b.onclick = function (e) {
        e.stopPropagation();
        set(it.id);
        if (target && current() !== target) apply(target);
        else renderMenu();
      };
      group.appendChild(b);
    });
    seg.appendChild(group);
    return seg;
  }
  var BALL_KEY = "local:ball-pos";
  var BALL_SIZE = 52;
  var ballPos = null;
  function placeBall(x, y) {
    x = Math.min(Math.max(x, 8), window.innerWidth - BALL_SIZE - 8);
    y = Math.min(Math.max(y, 8), window.innerHeight - BALL_SIZE - 8);
    ballPos = { x: x, y: y };
    ball.style.left = x + "px";
    ball.style.top = y + "px";
    ball.style.right = "auto";
    ball.style.bottom = "auto";
  }
  // 菜单跟着球走：上方放得下就放上方，否则放下方；水平方向不出屏
  function positionMenu() {
    var r = ball.getBoundingClientRect();
    var w = 248;
    menu.style.left = Math.min(Math.max(r.right - w, 8), window.innerWidth - w - 8) + "px";
    menu.style.right = "auto";
    if (r.top > 240) {
      menu.style.top = "auto";
      menu.style.bottom = window.innerHeight - r.top + 10 + "px";
    } else {
      menu.style.bottom = "auto";
      menu.style.top = r.bottom + 10 + "px";
    }
  }
  function mountBall() {
    ball = el(
      "button",
      "lv-ball",
      '<span class="lv-ball-top">方案</span><span class="lv-ball-label"></span>',
    );
    ball.type = "button";
    ball.title = "切换页面方案";
    menu = el("div", "lv-menu");
    // 拖动：按下后移动超过 5px 算拖动（不触发点击），松手记住位置
    var drag = null;
    var dragged = false;
    ball.addEventListener("pointerdown", function (e) {
      var r = ball.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY };
      dragged = false;
      ball.setPointerCapture(e.pointerId);
    });
    ball.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (!dragged && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 5) return;
      dragged = true;
      ball.classList.add("is-dragging");
      menu.classList.remove("is-open");
      placeBall(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    ball.addEventListener("pointerup", function () {
      if (drag && dragged) {
        try {
          localStorage.setItem(BALL_KEY, JSON.stringify(ballPos));
        } catch (err) {}
      }
      drag = null;
      ball.classList.remove("is-dragging");
    });
    ball.onclick = function (e) {
      e.stopPropagation();
      if (dragged) {
        dragged = false;
        return;
      }
      positionMenu();
      menu.classList.toggle("is-open");
    };
    try {
      var saved = JSON.parse(localStorage.getItem(BALL_KEY) || "null");
      if (saved) placeBall(saved.x, saved.y);
    } catch (err) {}
    window.addEventListener("resize", function () {
      if (ballPos) placeBall(ballPos.x, ballPos.y);
    });
    menu.onclick = function (e) {
      e.stopPropagation();
    };
    document.addEventListener("click", function () {
      menu.classList.remove("is-open");
    });
    document.body.appendChild(menu);
    document.body.appendChild(ball);
    renderMenu();
  }

  /* ---------- 方案二：顶栏 ---------- */
  var EXT_URL = "https://chromewebstore.google.com/";
  var CHROME_LOGO =
    '<svg class="lv-ext-logo" viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#db4437" d="M24 4a20 20 0 0 1 17.3 10H24a10 10 0 0 0-9.4 6.6L8.2 9.5A20 20 0 0 1 24 4Z"/>' +
    '<path fill="#0f9d58" d="M8.2 9.5 16.9 24.6A10 10 0 0 0 26 33.8L19.7 43.5A20 20 0 0 1 8.2 9.5Z"/>' +
    '<path fill="#ffcd40" d="M41.3 14A20 20 0 0 1 19.7 43.5L28.4 28.4A10 10 0 0 0 24 14h17.3Z"/>' +
    '<circle cx="24" cy="24" r="8" fill="#fff"/><circle cx="24" cy="24" r="6.4" fill="#4285f4"/></svg>';
  var bar, tabs, profileName, profileAvatar;
  function mountTopBar() {
    bar = el("header", "lv-topbar");
    tabs = el("nav", "lv-pill lv-tabs");
    [
      { label: "Explore", path: "/daily-picks", match: /^\/daily-picks\/?$/ },
      // Chat = 原 Assistant 会话页；在 Explore 发消息后原页面本来就会跳到 /home，这里直接承接
      { label: "Chat", path: "/home", match: /^\/home/ },
      { label: "Auto-task", path: "/auto-task", match: /^\/auto-task/ },
      {
        label: "Favorites",
        path: "/daily-picks/likes",
        match: /^\/daily-picks\/likes/,
      },
    ].forEach(function (t) {
      var b = el("button", "lv-tab", t.label);
      b.type = "button";
      b._match = t.match;
      b.onclick = function () {
        go(t.path);
      };
      tabs.appendChild(b);
    });
    var profile = el("button", "lv-pill lv-profile");
    profile.type = "button";
    profile.title = "个人中心";
    profileName = el("span", "lv-profile-name", "");
    profileAvatar = el("img", "lv-profile-avatar");
    profileAvatar.alt = "";
    profile.appendChild(profileName);
    profile.appendChild(profileAvatar);
    profile.onclick = function () {
      showAcct();
    };
    profile.onmouseenter = function () {
      showAcct();
    };
    profile.onmouseleave = scheduleHideAcct;
    // 左侧导航胶囊；浏览器插件引导放右侧个人中心旁（文案 / 链接同 yao.ge 分支的 CommerceExtensionPromo，商店上架前链接是占位）
    var left = el("div", "lv-left");
    var ext = el("a", "lv-pill lv-ext");
    ext.href = EXT_URL;
    ext.target = "_blank";
    ext.rel = "noopener";
    ext.title = "Okiee for Chrome · Best price check on any product page";
    ext.innerHTML = CHROME_LOGO + "<span>Add Okiee to Chrome</span>";
    left.appendChild(tabs);
    bar.appendChild(left);
    var right = el("div", "lv-right");
    right.appendChild(ext);
    right.appendChild(profile);
    bar.appendChild(right);
    document.body.appendChild(bar);
    sync();
  }

  // 用户名和头像从（被隐藏的）原侧边栏里读，保持与登录账号一致
  function sync() {
    if (!bar) return;
    var name = document.querySelector('[class*="_profileName_"]');
    var avatar = document.querySelector('aside[class*="_siteSider_"] img');
    if (name && profileName.textContent !== name.textContent)
      profileName.textContent = name.textContent;
    if (avatar && profileAvatar.src !== avatar.src)
      profileAvatar.src = avatar.src;
    profileAvatar.style.display = profileAvatar.src ? "" : "none";
    var here = lvPath() + location.hash;
    if (here !== lastPath) {
      prevPath = lastPath;
      lastPath = here;
    }
    if (backBtn) backBtn.classList.toggle("is-visible", CHAT_PATH.test(lvPath()));
    if (rail) {
      var img = railAvatar.querySelector("img");
      if (avatar && img.src !== avatar.src) img.src = avatar.src;
      [].forEach.call(railItems.children, function (b) {
        var active = b._match.test(lvPath());
        b.classList.toggle("is-active", active);
      });
    }
    [].forEach.call(tabs.children, function (b) {
      b.classList.toggle("is-active", b._match.test(lvPath()));
    });
  }
  ["pushState", "replaceState"].forEach(function (m) {
    var orig = history[m];
    history[m] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(sync);
      return r;
    };
  });
  window.addEventListener("popstate", function () {
    setTimeout(sync);
  });

  /* ---------- 方案二：输入坞放到副标题下，滚动后吸顶 ----------
   * 输入坞（_dockLayer_）在滚动区之外、贴底绝对定位，且归 React 管，不能挪节点、也不能改它的
   * className（React 重渲染会覆盖），所以用 data-lv-dock 属性 + top 变量控制位置：
   * 标题区可见时跟着副标题走（随滚动同步），滚上去后停在顶栏区域（STICKY_TOP）。
   * 原页面滚动后会把输入坞收成「Ask migoo」胶囊，方案二用 CSS 关掉这个收起。 */
  var GAP = 24; // 副标题与输入框、输入框与 chips 之间的间距
  var STICKY_TOP = 14; // 吸顶时输入框上沿，与顶栏胶囊对齐
  var placing = false;
  function placeDock() {
    placing = false;
    var layer = document.querySelector('[class*="_dockLayer_"]');
    var panel = layer && layer.querySelector('[class*="_dockPanel_"]');
    var heading = document.querySelector(
      '[class*="_feedHeader_"] [class*="_headingGroup_"]',
    );
    if (!layer || !panel) return;
    // 底部输入框（方案三；方案二滚过标题后也用）：页面一离开顶部（> 8px）且输入框空闲就收成「Ask migoo」胶囊，
    // 回到顶部或点开再展开（收起 / 展开的交叉淡入见 overrides.css 的 [data-lv-bottom]）
    function bottomDock(minTop) {
      var fromHero = !!layer.dataset.lvDock;
      delete layer.dataset.lvDock;
      layer.dataset.lvBottom = "1";
      // 从标题下的位置切过来：输入框瞬间藏起（不在底部闪一下再淡出），只让胶囊淡入
      if (fromHero) {
        layer.dataset.lvSnap = "1";
        setTimeout(function () {
          delete layer.dataset.lvSnap;
        }, 80);
      }
      setPhStopped(false);
      var top = currentScrollTop();
      // 方案四：只按滚动位置决定——回到顶部展开成中间的输入框，离开顶部缩成右下角胶囊；
      // 胶囊状态下不会因为挂了引用、获得焦点而展开（唤醒走右侧会话窗，见 drawer.js）
      if (current() === "v6") {
        if (v6Dock() === "collapsed") layer.dataset.lvCompact = "1";
        else if (top <= minTop) delete layer.dataset.lvCompact;
        // 方案四：离开顶部就收成胶囊（输入框聚焦但没内容也收；有字或有引用时保持展开）
        else if (!layer.dataset.lvCompact && isDockIdle(panel, true)) {
          layer.dataset.lvCompact = "1";
          if (panel.contains(document.activeElement)) document.activeElement.blur();
        }
        return;
      }
      // 刚点「Ask migoo」展开的：滚动不超过 80px 前保持展开
      if (pillOpenedAt != null && Math.abs(top - pillOpenedAt) > 80) pillOpenedAt = null;
      var keepOpen = pillOpenedAt != null && panel.contains(document.activeElement);
      if (pillOpenedAt != null && !panel.contains(document.activeElement) && Math.abs(top - pillOpenedAt) <= 80) keepOpen = true;
      if (top > minTop && isDockIdle(panel) && !keepOpen) layer.dataset.lvCompact = "1";
      else delete layer.dataset.lvCompact;
    }
    if (base() === "v5" && heading) return bottomDock(8);
    delete layer.dataset.lvBottom;
    if (!isHero() || !heading || base() === "v5") {
      delete layer.dataset.lvDock;
      delete layer.dataset.lvCompact;
      return;
    }
    var area = layer.offsetParent || layer.parentElement;
    root.style.setProperty("--lv-dock-h", panel.offsetHeight + "px");
    var target =
      heading.getBoundingClientRect().bottom -
      area.getBoundingClientRect().top +
      GAP;
    var sticky = target < STICKY_TOP;
    // 方案二：输入框随标题滚出顶部后，不再吸顶，改成和方案三一样收到底部的「Ask migoo」胶囊
    if (sticky && current() === "v2") return bottomDock(0);
    // 输入框上方可能出现建议问句行（在 panel 之上），吸顶时整层不出视口，让输入框顺势下移
    var top = target - panel.offsetTop;
    if (sticky) {
      // 吸顶时让输入卡片上沿对齐顶栏胶囊；上方有建议问句行时整体下移，保证不出视口
      var body = panel.querySelector(".composer-shell__body") || panel;
      var bodyOffset = body.getBoundingClientRect().top - layer.getBoundingClientRect().top;
      top = Math.max(STICKY_TOP - bodyOffset, -panel.offsetTop);
    }
    layer.style.setProperty("--lv-dock-top", top + "px");
    layer.dataset.lvDock = sticky ? "sticky" : "hero";
    setPhStopped(sticky);
    // 吸顶且空闲时收成单行胶囊；有输入 / 引用商品 / 能力标签 / 正在聚焦 / 弹层打开时展开
    if (sticky && isDockIdle(panel)) layer.dataset.lvCompact = "1";
    else delete layer.dataset.lvCompact;
  }
  /* ---------- 方案二：placeholder 轮播降价商品 ----------
   * 降价商品取自信息流里高亮「Cheapest in 30 days」的商品卡（标题 + 价格），随信息流加载累积。
   * 只替换默认 placeholder；选了能力 chip 后用 chip 自己的 placeholder，输入后自然消失。 */
  var DEFAULT_PH = "What can I help you with today?";
  var PH_INTERVAL = 3000;
  var drops = [];
  var phIndex = 0;
  var phEl = null;
  // 轮播文案：优先用 categories.js 生成的五类短句；没有时退回从信息流里抓「Cheapest in 30 days」商品
  function collectDrops() {
    if (drops._fromLines) return;
    var lines = window.lvPlaceholderLines && window.lvPlaceholderLines();
    if (lines && lines.length) {
      drops = lines;
      drops._fromLines = true;
      return;
    }
    if (drops.length) return;
    document.querySelectorAll('[class*="_productCard_"]').forEach(function (card) {
      var hl = card.querySelector('[class*="_reasonHighlight_"]');
      if (!hl || !/cheapest/i.test(hl.textContent)) return;
      var title = card.querySelector('[class*="_productTitle_"]');
      var price = card.querySelector('[class*="_productPrice_"]');
      var name = title && (title.getAttribute("title") || title.textContent).trim();
      if (!name) return;
      name = name.split(/,| - /)[0].trim();
      if (name.length > 32) name = name.slice(0, 31).trim() + "…";
      drops.push({ kind: "drop", tag: "Price drop", text: name, price: price ? price.textContent.trim() : "" });
    });
  }
  function phLine(d) {
    var line = el("div", "lv-ph-line lv-ph-" + (d.kind || "drop"));
    line.appendChild(el("span", "lv-ph-tag", d.tag || "Price drop"));
    line.appendChild(el("span", "lv-ph-name")).textContent = d.text;
    if (d.price) line.appendChild(el("span", "lv-ph-price")).textContent = d.price;
    return line;
  }
  function ensurePh() {
    var host = document.querySelector(
      '[class*="_dockLayer_"] .composer-shell__editor-host',
    );
    var p = host && host.querySelector("p.is-editor-empty");
    var on =
      isHero() &&
      p &&
      p.getAttribute("data-placeholder") === DEFAULT_PH &&
      drops.length;
    if (!on) {
      if (host) delete host.dataset.lvPh;
      if (phEl) phEl.remove();
      phEl = null;
      return;
    }
    host.dataset.lvPh = "1";
    if (phEl && phEl.parentNode === host) return;
    phEl = el("div", "lv-ph");
    var track = el("div", "lv-ph-track");
    track.appendChild(phStopped ? stopLine() : phLine(drops[phIndex % drops.length]));
    phEl.appendChild(track);
    host.appendChild(phEl);
  }
  // 吸顶后轮播停在这句；回到标题区再继续轮播
  var STOP_PH = "Ask something…";
  var phStopped = false;
  function stopLine() {
    var line = el("div", "lv-ph-line");
    line.appendChild(el("span", "lv-ph-name")).textContent = STOP_PH;
    return line;
  }
  function rollPh(line) {
    var track = phEl && phEl.firstChild;
    if (!track) return;
    track.appendChild(line);
    track.classList.add("is-moving");
    setTimeout(function () {
      track.classList.remove("is-moving");
      while (track.children.length > 1) track.removeChild(track.firstChild);
    }, 450);
  }
  function tickPh() {
    if (!phEl || !drops.length || phStopped || document.hidden) return;
    phIndex = (phIndex + 1) % drops.length;
    rollPh(phLine(drops[phIndex]));
  }
  function setPhStopped(stop) {
    if (stop === phStopped) return;
    phStopped = stop;
    if (phEl && drops.length) rollPh(stop ? stopLine() : phLine(drops[phIndex]));
  }

  var pillOpenedAt = null;
  function currentScrollTop() {
    var h = document.querySelector('[class*="_feedHeader_"]');
    var sc = h && h.parentElement;
    while (sc && sc !== document.body && !(/(auto|scroll)/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight + 10))
      sc = sc.parentElement;
    return sc && sc !== document.body ? sc.scrollTop : 0;
  }
  function isDockIdle(panel, ignoreFocus) {
    var editor = panel.querySelector(".ProseMirror");
    var header = panel.querySelector(".composer-shell__header");
    var empty =
      editor && editor.children.length <= 1 && !!editor.querySelector("p.is-editor-empty");
    var headerFilled = header && (header.textContent.trim() || header.querySelector("img"));
    var popoverOpen = document.querySelector(
      ".ant-popover:not(.ant-popover-hidden), .ant-dropdown:not(.ant-dropdown-hidden)",
    );
    if (ignoreFocus) return empty && !headerFilled && !popoverOpen;
    return empty && !headerFilled && !panel.contains(document.activeElement) && !popoverOpen;
  }
  // 展开收起的底部输入框并聚焦（方案四右下角的 Ask migoo 胶囊也调这个）
  window.lvExpandDock = function () {
    var layer = document.querySelector('[class*="_dockLayer_"]');
    if (!layer || !layer.hasAttribute("data-lv-compact")) return false;
    delete layer.dataset.lvCompact;
    pillOpenedAt = currentScrollTop();
    setTimeout(function () {
      var editor = layer.querySelector(".ProseMirror");
      if (editor) editor.focus();
    }, 60);
    return true;
  };
  // 底部胶囊（方案三，方案二滚动后）：点原页面的「Ask migoo」胶囊 → 聚焦输入框（聚焦后不再空闲，自动展开）
  document.addEventListener(
    "click",
    function (e) {
      var pill = e.target.closest && e.target.closest('[data-lv-bottom][data-lv-compact] [class*="_pill_"]');
      if (!pill) return;
      // 先展开（隐藏状态下的编辑器聚焦不了），等输入框显示出来再聚焦
      var layer = pill.closest('[class*="_dockLayer_"]');
      delete layer.dataset.lvCompact;
      pillOpenedAt = currentScrollTop();
      setTimeout(function () {
        var editor = layer.querySelector(".ProseMirror");
        if (editor) editor.focus();
      }, 60);
    },
    true,
  );
  // 点胶囊任意位置都聚焦输入框（胶囊里编辑区只有一行高）
  document.addEventListener(
    "mousedown",
    function (e) {
      var body = e.target.closest && e.target.closest('[data-lv-compact] .composer-shell__body');
      if (!body) return;
      var editor = body.querySelector(".ProseMirror");
      if (!editor || editor.contains(e.target)) return;
      e.preventDefault();
      editor.focus();
    },
    true,
  );

  function schedulePlace() {
    if (placing) return;
    placing = true;
    requestAnimationFrame(function () {
      placeDock();
      ensurePh();
      sync();
    });
  }

  /* ---------- 方案三：Phia 式左侧窄栏 ----------
   * 从上到下：Logo、Explore（/daily-picks）、Chat（/home，hover 出最近会话）、Auto-task（/auto-task）、Favorites（Likes 页），
   * 底部头像 hover 出个人中心浮层；右上角只放插件引导。
   * Recent chats 只记在 Explore 里发起的购物对话（mock-api 的假 socket 发出 mock:ws-send 事件时记录），
   * 存 localStorage 的 local:shopping-chats，不展示原有的 Agent 会话。 */
  var RAIL_ICONS = {
    chat: '<path d="M12 4c4.7 0 8.5 3.3 8.5 7.4s-3.8 7.4-8.5 7.4c-1 0-2-.1-2.9-.4L5 20l1.1-3.5C4.6 15.1 3.5 13.4 3.5 11.4 3.5 7.3 7.3 4 12 4Z"/>',
    explore: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8Z"/>',
    autotask: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/><path d="M18.5 3.5v3h-3"/>',
    heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z"/>',
  };
  var RAIL_ITEMS = [
    { key: "explore", label: "Explore", path: "/daily-picks", match: /^\/daily-picks\/?$/ },
    { key: "chat", label: "Chat", path: "/home", match: /^\/(home|chat)/ },
    { key: "autotask", label: "Auto-task", path: "/auto-task", match: /^\/auto-task/ },
    { key: "heart", label: "Favorites", path: "/daily-picks/likes", match: /^\/daily-picks\/likes/ },
  ];
  var rail, railItems, railAvatar, recent, recentHideTimer, backBtn;
  var CHAT_PATH = /^\/(home|chat)/;
  var prevPath = null;
  var lastPath = lvPath() + location.hash;
  function railSvg(name) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      RAIL_ICONS[name] +
      "</svg>"
    );
  }
  function mountRail() {
    rail = el("nav", "lv-rail");
    var logo = el(
      "button",
      "lv-rail-logo",
      '<img class="lv-brand-logo" src="' + (window.LV_BASE || "") + '/local/okiee-logo.png" alt="Okiee">',
    );
    logo.type = "button";
    logo.onclick = function () {
      go("/daily-picks");
    };
    rail.appendChild(logo);
    railItems = el("div", "lv-rail-items");
    RAIL_ITEMS.forEach(function (it) {
      var b = el("button", "lv-rail-item lv-rail-" + it.key, railSvg(it.key) + '<span class="lv-rail-tip"></span>');
      b.type = "button";
      b.querySelector(".lv-rail-tip").textContent = it.label;
      b._match = it.match;
      b.onclick = function () {
        if (it.key !== "chat") hideRecent();
        // 方案四：Explore 页首屏就是 Chat 区，Chat / Explore 是同一页的两个锚点
        // 窄栏方案：Chat 直接进入购物对话页（/home 的 Assistant 会话）
        // 方案四、五：Explore 定位到首屏下方的分区
        if (isV4Like() && it.key === "explore") {
          var onExplore = /^\/daily-picks\/?$/.test(lvPath()) && !location.hash;
          if (!onExplore) go("/daily-picks");
          setTimeout(
            function () {
              if (window.lvScrollTo) window.lvScrollTo("explore");
            },
            onExplore ? 0 : 900,
          );
          return;
        }
        go(it.path);
      };
      // Chat（Recent chats）与 Explore（分区导航）的 hover 二级浮层已按需求去掉，悬停只显示名称提示
      railItems.appendChild(b);
    });
    rail.appendChild(railItems);
    railAvatar = el("button", "lv-rail-avatar", "<img alt=''>");
    railAvatar.type = "button";
    railAvatar.title = "个人中心";
    railAvatar.onmouseenter = function () {
      showAcct("rail");
    };
    railAvatar.onmouseleave = scheduleHideAcct;
    railAvatar.onclick = function () {
      showAcct("rail");
    };
    rail.appendChild(railAvatar);
    document.body.appendChild(rail);

    backBtn = el(
      "button",
      "lv-back",
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    );
    backBtn.type = "button";
    backBtn.title = "Back";
    backBtn.onclick = function () {
      go(prevPath && !CHAT_PATH.test(prevPath) ? prevPath : "/daily-picks");
    };
    document.body.appendChild(backBtn);

    var ext = el("a", "lv-pill lv-ext lv-ext-float");
    ext.href = EXT_URL;
    ext.target = "_blank";
    ext.rel = "noopener";
    ext.title = "Okiee for Chrome · Best price check on any product page";
    ext.innerHTML = CHROME_LOGO + "<span>Add Okiee to Chrome</span>";
    document.body.appendChild(ext);
  }
  var CHATS_KEY = "local:shopping-chats";
  function recentChats() {
    try {
      return JSON.parse(localStorage.getItem(CHATS_KEY) || "[]");
    } catch (err) {
      return [];
    }
  }
  // 标题取消息里的文本；只引用了商品没打字时用商品名
  function chatTitle(frame) {
    var blocks = [];
    try {
      blocks = JSON.parse(frame.message.customized_data).blocks || [];
    } catch (err) {}
    var text = "";
    var product = "";
    blocks.forEach(function (b) {
      var p = b.payload || {};
      if (!text && typeof p.content === "string" && p.content.trim()) text = p.content.trim();
      if (!product && p.display && p.display.title) product = p.display.title;
    });
    return text || product;
  }
  window.addEventListener("mock:ws-send", function (e) {
    var frame = e.detail || {};
    if (frame.type !== "send" || !/^\/daily-picks/.test(lvPath())) return;
    var title = chatTitle(frame);
    if (!title) return;
    var list = recentChats().filter(function (c) {
      return c.title !== title;
    });
    list.unshift({ title: title, ts: Date.now() });
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (err) {}
  });
  // 打开 Chat 后定位到这条提问：消息列表是虚拟列表，没渲染出来就往上翻，找到后滚到中间并闪一下
  function revealMessage(text) {
    var start = Date.now();
    (function attempt() {
      // 用户气泡是 .chat-blocks-group.is-self，助手是 .chat-blocks，两者都带 ai-self-chat-item
      var hit = [].filter.call(document.querySelectorAll(".ai-self-chat-item"), function (b) {
        return b.textContent.trim() === text;
      })[0];
      if (hit) {
        hit.scrollIntoView({ block: "center", behavior: "smooth" });
        hit.classList.add("lv-flash");
        setTimeout(function () {
          hit.classList.remove("lv-flash");
        }, 1600);
        return;
      }
      if (Date.now() - start > 8000) return;
      var any = document.querySelector(".ai-self-chat-item");
      var scroller = any;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 10 && /(auto|scroll)/.test(getComputedStyle(scroller).overflowY)))
        scroller = scroller.parentElement;
      if (scroller && Date.now() - start > 1200) scroller.scrollTop -= 700;
      setTimeout(attempt, 250);
    })();
  }
  window.lvRevealChat = function (text) {
    go("/home");
    revealMessage(text);
  };
  /* ---------- 方案四：Explore 图标 hover 出分区导航（同 Recent chats 浮层样式），点击定位到对应分区 ---------- */
  var EXPLORE_SECTIONS = [
    { key: "shopping", label: "Shopping for" },
    { key: "tracker", label: "Price Drops" },
    { key: "coupons", label: "Big Savings" },
    { key: "browse", label: "Deals for You" },
  ];
  var exploreFly = null;
  var exploreHideTimer = null;
  function showExploreFly() {
    if (!isV4Like()) return;
    clearTimeout(exploreHideTimer);
    if (!exploreFly) {
      exploreFly = el("div", "lv-recent lv-explore-fly");
      exploreFly.onmouseenter = function () {
        clearTimeout(exploreHideTimer);
      };
      exploreFly.onmouseleave = scheduleHideExploreFly;
      document.body.appendChild(exploreFly);
    }
    renderExploreFly();
    var anchor = railItems.querySelector(".lv-rail-explore").getBoundingClientRect();
    exploreFly.style.top = anchor.top - 6 + "px";
    exploreFly.classList.add("is-open");
  }
  function renderExploreFly() {
    var onExplore = /^\/daily-picks\/?$/.test(lvPath());
    var cur = onExplore && window.lvHeroInView === false && window.lvCurrentSection ? window.lvCurrentSection() : null;
    exploreFly.innerHTML = '<div class="lv-recent-title">Explore</div>';
    EXPLORE_SECTIONS.forEach(function (s) {
      if (s.key === "shopping" && base() === "v5") return;
      var row = el("button", "lv-recent-item" + (s.key === cur ? " is-current" : ""));
      row.type = "button";
      row.appendChild(el("span")).textContent = s.label;
      // 点了不关浮层，只在鼠标移出后关闭；不在 Explore 页时先切回来再定位
      row.onclick = function () {
        var go1 = !/^\/daily-picks\/?$/.test(lvPath());
        if (go1) go("/daily-picks");
        setTimeout(
          function () {
            if (window.lvScrollTo) window.lvScrollTo(s.key);
            setTimeout(function () {
              if (exploreFly && exploreFly.classList.contains("is-open")) renderExploreFly();
            }, 700);
          },
          go1 ? 900 : 0,
        );
      };
      exploreFly.appendChild(row);
    });
  }
  function scheduleHideExploreFly() {
    clearTimeout(exploreHideTimer);
    exploreHideTimer = setTimeout(function () {
      if (exploreFly) exploreFly.classList.remove("is-open");
    }, 220);
  }

  function showRecent() {
    if (!root.hasAttribute("data-lv-rail")) return;
    clearTimeout(recentHideTimer);
    if (!recent) {
      recent = el("div", "lv-recent");
      recent.onmouseenter = function () {
        clearTimeout(recentHideTimer);
      };
      recent.onmouseleave = scheduleHideRecent;
      document.body.appendChild(recent);
    }
    recent.innerHTML = '<div class="lv-recent-title">Recent chats</div>';
    var chats = recentChats();
    if (!chats.length)
      recent.appendChild(el("div", "lv-recent-empty", "Shopping chats you start in Explore will show up here"));
    chats.slice(0, 8).forEach(function (c) {
      var row = el("button", "lv-recent-item");
      row.type = "button";
      row.appendChild(el("span")).textContent = c.title;
      // 点条目不关浮层（体现历史记录能力），只在鼠标移出图标 / 浮层后关闭
      row.onclick = function () {
        go("/home");
        revealMessage(c.title);
      };
      recent.appendChild(row);
    });
    var anchor = railItems.querySelector(".lv-rail-chat").getBoundingClientRect();
    recent.style.top = anchor.top - 6 + "px";
    recent.classList.add("is-open");
  }
  function hideRecent() {
    if (recent) recent.classList.remove("is-open");
  }
  function scheduleHideRecent() {
    clearTimeout(recentHideTimer);
    recentHideTimer = setTimeout(hideRecent, 220);
  }

  /* ---------- 方案二：个人中心浮层（hover 头像胶囊出现，参考 Google 账号面板） ----------
   * 数据取自录制的 user/info/me（mock-api 暴露的 mockLookup）。不展示 Plan / Points / Upgrade、AI Model、Invite Code。
   * 各菜单项不自己实现二级页：Memory 等打开原页面的个人中心卡片（#me）并点中对应项，
   * Feedback & Support 只在原侧边栏头像菜单里，就去点那里的原入口。 */
  var ICONS = {
    memory: '<path d="M9.5 4.5a4.5 4.5 0 0 0-4.4 5.4A4 4 0 0 0 6.5 17H8v2.5h6V17a5 5 0 0 0 4.5-5v-.5A7 7 0 0 0 9.5 4.5Z"/><path d="m12 8.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>',
    browser: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 9.5h17"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z"/>',
    chat: '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3v-3H5A1.5 1.5 0 0 1 3.5 16V7A1.5 1.5 0 0 1 5 5.5Z"/>',
    people: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M15.5 14.6c2.4-.3 4.4.9 5 3.9"/>',
    logout: '<path d="M14 5.5V5a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5h6A1.5 1.5 0 0 0 14 19v-.5M10 12h10.5M17.5 9l3 3-3 3"/>',
  };
  var ACCT_GROUPS = [
    [
      { icon: "memory", label: "Memory", me: true },
      { icon: "browser", label: "Cloud Browser", me: true },
    ],
    [
      { icon: "lock", label: "Web Permissions", me: true },
      { icon: "globe", label: "Language", me: true },
    ],
    [
      { icon: "chat", label: "Feedback & Support", sider: true },
      { icon: "people", label: "Join Community", me: true },
    ],
    [{ icon: "logout", label: "Logout", me: true }],
  ];
  var acct = null;
  var acctHideTimer = null;
  function svg(name) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS[name] +
      "</svg>"
    );
  }
  function buildAcct() {
    acct = el("div", "lv-acct");
    acct.onmouseenter = function () {
      clearTimeout(acctHideTimer);
    };
    acct.onmouseleave = scheduleHideAcct;
    var me = (window.mockLookup && window.mockLookup("GET /beeai/api/v1/user/info/me")) || {};
    var name = me.display_name || profileName.textContent;
    var avatar = me.avatar_url || profileAvatar.src;

    var head = el("button", "lv-acct-card");
    head.type = "button";
    head.innerHTML =
      '<img class="lv-acct-avatar" alt=""><span class="lv-acct-who"><b></b><small></small></span>' +
      '<span class="lv-acct-chev">' + svg("browser").replace(ICONS.browser, '<path d="m9 6 6 6-6 6"/>') + "</span>";
    head.querySelector("img").src = avatar;
    head.querySelector("b").textContent = name;
    head.querySelector("small").textContent = me.email || "";
    head.onclick = function () {
      openInMe(null);
    };
    acct.appendChild(head);

    // Plan / Points / Upgrade 分区按需求去掉

    ACCT_GROUPS.forEach(function (group) {
      var g = el("div", "lv-acct-group");
      group.forEach(function (item) {
        var row = el("button", "lv-acct-row" + (item.icon === "logout" ? " is-danger" : ""));
        row.type = "button";
        row.innerHTML = '<span class="lv-acct-icon">' + svg(item.icon) + '</span><span class="lv-acct-label"></span>' +
          (item.icon === "logout" ? "" : '<svg class="lv-acct-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>');
        row.querySelector(".lv-acct-label").textContent = item.label;
        row.onclick = function () {
          if (item.sider) openInSider(item.label);
          else openInMe(item.label);
        };
        g.appendChild(row);
      });
      acct.appendChild(g);
    });

    var foot = el("div", "lv-acct-foot");
    ["Terms of Service", "Privacy"].forEach(function (label, i) {
      if (i) foot.appendChild(el("span", "lv-acct-dot", "·"));
      var a = el("button", "lv-acct-link");
      a.type = "button";
      a.textContent = label;
      a.onclick = function () {
        openInMe(label);
      };
      foot.appendChild(a);
    });
    acct.appendChild(foot);
    document.body.appendChild(acct);
  }
  function showAcct(from) {
    if (!isHero()) return;
    clearTimeout(acctHideTimer);
    if (!acct) buildAcct();
    acct.classList.toggle("at-rail", from === "rail");
    acct.classList.add("is-open");
  }
  function hideAcct() {
    if (acct) acct.classList.remove("is-open");
  }
  function scheduleHideAcct() {
    clearTimeout(acctHideTimer);
    acctHideTimer = setTimeout(hideAcct, 220);
  }
  function waitFor(fn, timeout) {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function poll() {
        var v = fn();
        if (v || Date.now() - start > timeout) return resolve(v);
        setTimeout(poll, 80);
      })();
    });
  }
  function clickText(scope, label) {
    var leaf = [].filter.call(scope.querySelectorAll("*"), function (e) {
      return e.children.length === 0 && e.textContent.trim() === label;
    })[0];
    if (!leaf) return false;
    (leaf.closest('button, a, [role="button"], [class*="Item"], [class*="item"]') || leaf).click();
    return true;
  }
  function findMeCard() {
    return [].filter.call(document.querySelectorAll('[class*="_card_"]'), function (e) {
      return e.offsetHeight > 100 && /Delete Account/.test(e.textContent);
    })[0];
  }
  // 打开原页面的个人中心卡片（#me），label 为空时只打开卡片
  function openInMe(label) {
    hideAcct();
    if (!findMeCard()) {
      history.pushState(history.state, "", location.pathname + location.search + "#me");
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    waitFor(findMeCard, 3000).then(function (card) {
      if (card && label) clickText(card, label);
    });
  }
  // 原侧边栏头像菜单里的入口（侧边栏已隐藏，菜单弹出后立刻点中目标项）
  function openInSider(label) {
    hideAcct();
    var entry = document.querySelector('[class*="_profileEntry_"]');
    if (!entry) return;
    entry.click();
    waitFor(function () {
      return document.querySelector(".ant-popover:not(.ant-popover-hidden)");
    }, 2000).then(function (pop) {
      if (pop) clickText(pop, label);
    });
  }

  function boot() {
    markNoCollapse();
    mountBall();
    mountTopBar();
    mountRail();
    sync();
    var pending = false;
    new MutationObserver(function () {
      schedulePlace();
      if (pending) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        sync();
        collectDrops();
      }, 300);
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", schedulePlace, true);
    document.addEventListener("focusin", schedulePlace);
    document.addEventListener("focusout", function () {
      setTimeout(schedulePlace, 120);
    });
    setInterval(tickPh, PH_INTERVAL);
    window.addEventListener("resize", schedulePlace);
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
