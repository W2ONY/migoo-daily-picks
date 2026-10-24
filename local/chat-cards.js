/*
 * Chat 里的商品卡（参考 app.wizard.com 的推荐卡）：
 * 低价合集卡发出的 query 收到引导语回复后（由 categories.js 的 lvCollectionForText 识别是哪个合集），
 * 在这条回复下方渲染横向商品卡轮播 + 操作行 + 追问。
 * 字段全部来自录制数据并按规则补齐：
 *   - 品牌 / 价格 / 评分 / 门店 / 推荐理由：pdp/info（summary.brand、review_data、offer、rcmd_reason、rcmd_reason_tag）
 *   - 原价「was」：近 30 天价格曲线最高价（高于现价 3% 以上才展示）
 *   - 徽标 / 降幅 / 优惠券：由合集给出（如「−63%」「Clip Coupon」）；合集没给徽标时第一张「Best For {推荐理由标签}」
 *   - 有券的商品：价格显示用券后价，原价作为 was；卡片里多一块券信息（Clip 一键领取 / 券码可复制）
 * 交互：收藏（走本地 like/set，Favorites 里能看到）、Visit Store（新标签打开商品页）、See details（回到 Explore 打开真实 PDP）、
 *      Compare（在会话里再发一条对比请求）、Share（复制链接）、Feedback（赞 / 踩）、Sources（展开来源门店）。
 */
(function () {
  var STORE_NAMES = {
    amazon: "Amazon",
    walmart: "Walmart",
    bestbuy: "Best Buy",
    ebay: "eBay",
    target: "Target",
    homedepot: "The Home Depot",
    kroger: "Kroger",
    nordstrom: "Nordstrom",
    rei: "REI",
    quince: "Quince",
    dickssportinggoods: "Dick's Sporting Goods",
    costco: "Costco",
    lowes: "Lowe's",
  };
  var pdpIndex = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(path, cls) {
    return (
      '<svg class="' +
      (cls || "") +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      path +
      "</svg>"
    );
  }
  var ICON = {
    spark:
      '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" fill="currentColor" stroke="none"/>',
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    more: '<circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    external:
      '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    compare:
      '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M9.5 5v14M14.5 5v14"/>',
    share: '<path d="M14 5l6 6-6 6M20 11H10a6 6 0 0 0-6 6v1"/>',
    feedback:
      '<path d="M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M12 7.5v4M12 14h.01"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    thumbUp:
      '<path d="M7 11v9H4v-9h3Zm0 0 4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/>',
    thumbDown:
      '<path d="M17 13V4h3v9h-3Zm0 0-4 7a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 6.7 4H17"/>',
  };

  function pdpFor(cspuId) {
    if (!pdpIndex) {
      pdpIndex = {};
      (
        (window.mockAll && window.mockAll("POST /beeai/api/v1/pdp/info")) ||
        []
      ).forEach(function (r) {
        if (r && r.cspu_id) pdpIndex[String(r.cspu_id)] = r;
      });
    }
    return pdpIndex[String(cspuId)] || {};
  }
  function money(v) {
    return (v || 0) / 100000;
  }
  function storeName(site) {
    if (!site) return "";
    return STORE_NAMES[site] || site.charAt(0).toUpperCase() + site.slice(1);
  }
  // 品牌：pdp 有像样的品牌才用（亚马逊式全大写乱码品牌如 TGDLLF 跳过）；
  // 否则取标题里「品牌 - 型号」的前半段；都没有就不显示品牌行
  function brandOf(info, pdp) {
    var b = pdp.summary && pdp.summary.brand;
    if (b && !/^[A-Z]{5,}$/.test(b)) return b;
    var t = info.title || "";
    var dash = t.indexOf(" - ");
    return dash > 0 && dash < 30 ? t.slice(0, dash) : "";
  }
  function ratingOf(pdp) {
    var rs = (pdp.review_data && pdp.review_data.featured_reviews) || [];
    var vals = rs
      .map(function (r) {
        return r.rating;
      })
      .filter(function (x) {
        return x > 0;
      });
    if (!vals.length) return null;
    var avg =
      vals.reduce(function (a, b) {
        return a + b;
      }, 0) / vals.length;
    return {
      value: Math.round(avg * 10) / 10,
      count:
        (pdp.review_data.summary && pdp.review_data.summary.total_count) ||
        vals.length,
    };
  }
  function wasPrice(cur, pdp) {
    var list =
      (pdp.cheapest_info &&
        pdp.cheapest_info.chart &&
        pdp.cheapest_info.chart.price_list) ||
      [];
    var max = Math.max.apply(null, [0].concat(list.map(Number)));
    var m = money(max);
    return m > cur * 1.03 ? m : null;
  }
  // 「Migoo says」：第一条推荐理由，「标题: 正文」拆成加粗标题 + 正文
  function saysOf(info, pdp) {
    var r = (pdp.rcmd_reason && pdp.rcmd_reason[0]) || info.rcmd_reason || "";
    var m = /^([^:：]{2,40})[:：]\s*(.+)$/.exec(r);
    return m ? { strong: m[1], rest: m[2] } : { strong: "", rest: r };
  }

  function buildItems(entries) {
    var items = entries.map(function (p) {
      var cs = p.cs;
      var info = cs.offer_info || {};
      var pdp = pdpFor(cs.cspu_id);
      var offer = pdp.offer || {};
      var cur = p.price;
      var was = p.noWas ? null : p.max || wasPrice(cur, pdp);
      // Clip / Promo code 是立减：显示券后价、原价作 was；Walmart Cash 是返现，不改价格
      if (p.coupon && p.coupon.kind !== "cash") {
        was = cur;
        cur = Math.max(0.01, cur - p.coupon.off);
      }
      return {
        cs: cs,
        info: info,
        pdp: pdp,
        brand: brandOf(info, pdp),
        title: info.title,
        image: info.image,
        price: cur,
        was: was,
        rating: ratingOf(pdp),
        // 比价结果里同一商品挂在不同门店：门店 / logo / 链接由条目覆盖
        store: p.storeLabel || storeName(offer.website || info.source),
        logo: p.logo || offer.website_logo_url || info.website_logo_url,
        url: p.url || offer.url || info.pdp_url,
        says: saysOf(info, pdp),
        tag: (pdp.rcmd_reason_tag && pdp.rcmd_reason_tag[0]) || "",
        badge: p.badge,
        coupon: p.coupon,
      };
    });
    if (items[0] && items[0].badge === undefined && items[0].tag) items[0].badge = "Best For " + items[0].tag;
    return items;
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
    }, 1600);
  }

  // 收藏 = 走本地 like/set（mock-api 维护状态），Favorites 页即可看到
  function setLike(it, on) {
    var info = it.info;
    return fetch(
      location.protocol +
        "//sg." +
        location.host +
        "/beeai/api/v1/ecommerce/like/set",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          product: {
            region: info.region || "US",
            buybox_id: info.buybox_id,
            cspu_id: String(it.cs.cspu_id),
            offer_id: info.offer_id,
          },
          target_state: on ? 1 : 2,
        }),
      },
    );
  }
  function isLiked(it) {
    try {
      var likes = JSON.parse(localStorage.getItem("mock:likes") || "{}");
      return !!likes[it.info.buybox_id];
    } catch (e) {
      return false;
    }
  }

  // 在当前页（Chat）直接拉起右侧 PDP 抽屉：原页面的 openPdp 由 Daily Picks 模块暴露（assets 里的 local-patch），
  // 直接进 Chat 时该模块还没加载，就按需 import 一次
  var DAILY_PICKS_MODULE = (window.LV_BASE || "") + "/migoo-daily-picks/assets/js/index-B8tGR6gk.js";
  function openDetails(it) {
    var info = it.info;
    var args = {
      offerId: info.offer_id,
      cspuId: String(it.cs.cspu_id),
      region: info.region || "US",
      productId: String(it.cs.cspu_id),
    };
    var ready = window.__lvOpenPdp ? Promise.resolve() : import(DAILY_PICKS_MODULE);
    ready.then(function () {
      if (window.__lvOpenPdp) window.__lvOpenPdp(args);
    });
  }


  // 在当前会话页的输入框里发一条消息（同 Explore 分类卡的做法）
  function sendInChat(text) {
    var editors = document.querySelectorAll(".ProseMirror");
    var editor = editors[editors.length - 1];
    if (!editor) return;
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
    }, 60);
  }

  function priceHtml(v) {
    var s = v.toFixed(2).split(".");
    return '<span class="lv-wz-amt"><sup>$</sup>' + Number(s[0]).toLocaleString("en-US") + "<sup>" + s[1] + "</sup></span>";
  }


  // 券信息：Clip 类一键领取，Promo code 类可复制券码，Walmart Cash 类只展示
  function couponBox(cp) {
    var box = el("div", "lv-wz-coupon");
    box.appendChild(el("span", "lv-wz-coupon-label", cp.label));
    if (cp.kind === "clip" || cp.kind === "code") {
      var b = el("button", "lv-wz-coupon-btn", cp.kind === "clip" ? "Clip" : cp.code);
      b.type = "button";
      b.onclick = function () {
        if (cp.kind === "clip") {
          b.textContent = "Clipped ✓";
          b.classList.add("is-done");
          toast("Coupon clipped — applies at checkout");
        } else {
          (navigator.clipboard ? navigator.clipboard.writeText(cp.code) : Promise.reject()).then(
            function () {
              toast("Code " + cp.code + " copied");
            },
            function () {
              toast("Code: " + cp.code);
            },
          );
        }
      };
      box.appendChild(b);
    }
    return box;
  }

  function card(it) {
    var c = el("div", "lv-wz-card");
    if (it.badge) c.appendChild(el("div", "lv-wz-badge", it.badge));
    var media = el("div", "lv-wz-media");
    var img = el("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = it.image;
    media.appendChild(img);
    var mark = el("button", "lv-wz-mark");
    mark.type = "button";
    mark.title = "Save to Favorites";
    mark.innerHTML = svg(ICON.bookmark);
    mark.classList.toggle("is-on", isLiked(it));
    mark.onclick = function (e) {
      e.stopPropagation();
      var on = !mark.classList.contains("is-on");
      mark.classList.toggle("is-on", on);
      setLike(it, on);
      toast(on ? "Saved to Favorites" : "Removed from Favorites");
    };
    media.appendChild(mark);
    c.appendChild(media);

    var body = el("div", "lv-wz-body");
    if (it.brand) body.appendChild(el("div", "lv-wz-brand", it.brand));
    body.appendChild(el("div", "lv-wz-title", it.title));
    if (it.rating) {
      var r = el("div", "lv-wz-rating");
      var stars = el("span", "lv-wz-stars");
      stars.style.setProperty("--pct", (it.rating.value / 5) * 100 + "%");
      r.appendChild(stars);
      r.appendChild(el("span", "lv-wz-rating-num", it.rating.value.toFixed(1)));
      body.appendChild(r);
    }
    var pr = el("div", "lv-wz-price");
    pr.innerHTML = priceHtml(it.price);
    if (it.was)
      pr.appendChild(el("span", "lv-wz-was", "was $" + it.was.toFixed(2)));
    body.appendChild(pr);
    if (it.store) body.appendChild(el("div", "lv-wz-store", "at " + it.store));
    if (it.coupon) body.appendChild(couponBox(it.coupon));

    if (it.says.rest) {
      var says = el("div", "lv-wz-says");
      var h = el("div", "lv-wz-says-head");
      h.innerHTML = svg(ICON.spark) + "<span>Migoo says...</span>";
      says.appendChild(h);
      var q = el("div", "lv-wz-quote");
      q.appendChild(document.createTextNode("“"));
      if (it.says.strong) {
        q.appendChild(el("b", null, it.says.strong));
        q.appendChild(document.createTextNode(" "));
      }
      q.appendChild(
        document.createTextNode(it.says.rest.replace(/\.$/, "") + "”"),
      );
      says.appendChild(q);
      var src = el("div", "lv-wz-src");
      if (it.logo) {
        var logo = el("img");
        logo.alt = "";
        logo.src = it.logo;
        src.appendChild(logo);
      }
      src.appendChild(el("span", null, "Sources"));
      says.appendChild(src);
      body.appendChild(says);
    }

    c.onclick = function (e) {
      if (e.target.closest("a, button")) return;
      openDetails(it);
    };
    var acts = el("div", "lv-wz-actions");
    var visit = el("a", "lv-wz-btn lv-wz-btn-primary");
    visit.href = it.url || "#";
    visit.target = "_blank";
    visit.rel = "noopener";
    visit.innerHTML = "<span>Visit Store</span>" + svg(ICON.external);
    var details = el("button", "lv-wz-btn lv-wz-btn-ghost");
    details.type = "button";
    details.innerHTML = svg(ICON.spark) + "<span>See details</span>";
    details.onclick = function () {
      openDetails(it);
    };
    acts.appendChild(visit);
    acts.appendChild(details);
    body.appendChild(acts);
    c.appendChild(body);
    return c;
  }

  // 会话里的商品卡：参考 Daydream 会话结果（灰底大图 + 左上 … / 右上收藏，下方品牌 + 一行标题与价格），多行网格排列
  function ddCard(it) {
    var c = el("div", "lv-dd-card");
    var media = el("div", "lv-dd-media");
    var img = el("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = it.image;
    media.appendChild(img);
    var more = el("button", "lv-dd-btn lv-dd-more");
    more.type = "button";
    more.title = "See details";
    more.innerHTML = svg(ICON.more);
    more.onclick = function (e) {
      e.stopPropagation();
      openDetails(it);
    };
    media.appendChild(more);
    var heart = el("button", "lv-dd-btn lv-dd-heart");
    heart.type = "button";
    heart.title = "Save to Favorites";
    heart.innerHTML = svg(ICON.heart);
    heart.classList.toggle("is-on", isLiked(it));
    heart.onclick = function (e) {
      e.stopPropagation();
      var on = !heart.classList.contains("is-on");
      heart.classList.toggle("is-on", on);
      setLike(it, on);
      toast(on ? "Saved to Favorites" : "Removed from Favorites");
    };
    media.appendChild(heart);
    // 回复给的理由（Lowest total / Coupon applies / Alert below…）作为图上的小标签
    if (it.badge) media.appendChild(el("span", "lv-dd-tag", it.badge));
    c.appendChild(media);
    var body = el("div", "lv-dd-body");
    var brand = it.brand || it.store || "";
    body.appendChild(el("div", "lv-dd-brand", brand));
    var line = el("div", "lv-dd-line");
    var title = it.title || "";
    if (brand && title.toLowerCase().indexOf(brand.toLowerCase()) === 0) title = title.slice(brand.length).replace(/^[\s\-–—:,]+/, "");
    line.appendChild(el("span", "lv-dd-title", title));
    var price = el("span", "lv-dd-price");
    if (it.was && it.was > it.price) price.appendChild(el("s", null, money$(it.was)));
    price.appendChild(el("b", null, money$(it.price)));
    line.appendChild(price);
    body.appendChild(line);
    c.appendChild(body);
    c.onclick = function () {
      openDetails(it);
    };
    return c;
  }
  // 整数价不带小数（$145），否则保留两位
  function money$(v) {
    return "$" + (Math.round(v * 100) % 100 ? v.toFixed(2) : String(Math.round(v)));
  }

  // 电商大卡（上一版，暂留未用）（Figma 草稿箱 2057-2063）；原 wizard 卡 card() 暂留未用：整幅商品图 + 标题 / 一行卖点 / 价格，虚线下是「Buy at 门店 ↗」
  function bigCard(it) {
    var c = el("div", "lv-big");
    var media = el("div", "lv-big-media");
    var img = el("img");
    img.alt = "";
    img.src = it.image;
    media.appendChild(img);
    c.appendChild(media);
    var body = el("div", "lv-big-body");
    body.appendChild(el("div", "lv-big-title", it.title));
    var pct = it.was && it.was > it.price ? Math.round((1 - it.price / it.was) * 100) : 0;
    // 降幅不进卖点行，放到价格行：现价 + 划线原价 + 降幅胶囊（同 Big Price Drops 卡）；标签里的降幅文案也去掉免得重复
    var badge = (it.badge || "").replace(/\s*·?\s*[−-]?\d+%[^·]*/g, "").trim();
    var sub = [badge, it.rating ? "★ " + it.rating.value.toFixed(1) : ""].filter(Boolean);
    if (sub.length) body.appendChild(el("div", "lv-big-sub", sub.join(" · ")));
    var price = el("div", "lv-big-price");
    price.appendChild(el("b", null, "$" + it.price.toFixed(2)));
    if (pct) {
      price.appendChild(el("s", null, "$" + it.was.toFixed(2)));
      price.appendChild(el("span", "lv-steal-pill", "−" + pct + "%"));
    }
    body.appendChild(price);
    var buy = el("a", "lv-big-buy");
    buy.href = it.url || "#";
    buy.target = "_blank";
    buy.rel = "noopener";
    buy.textContent = "Buy at " + (it.store || "store") + " ↗";
    body.appendChild(buy);
    c.appendChild(body);
    c.onclick = function (e) {
      if (e.target.closest("a, button")) return;
      openDetails(it);
    };
    return c;
  }

  function actionRow(items, title) {
    var row = el("div", "lv-wz-row");
    function btn(cls, icon, label, fn) {
      var b = el("button", "lv-wz-chip " + cls);
      b.type = "button";
      b.innerHTML = svg(icon) + "<span>" + label + "</span>";
      b.onclick = fn;
      row.appendChild(b);
      return b;
    }
    // 比价结果本身就是对比、单个商品没得比：都不给 Compare
    if (title !== "Price comparison" && items.length > 1)
      btn("is-primary", ICON.compare, "Compare", function () {
        sendInChat(
          "Compare these " + items.length + " " + title + " picks side by side",
        );
      });
    btn("", ICON.share, "Share", function () {
      var text = items
        .map(function (it) {
          return (
            it.title +
            " — $" +
            it.price.toFixed(2) +
            (it.url ? " " + it.url : "")
          );
        })
        .join("\n");
      (navigator.clipboard
        ? navigator.clipboard.writeText(text)
        : Promise.reject()
      ).then(
        function () {
          toast("Copied to clipboard");
        },
        function () {
          toast("Copy failed");
        },
      );
    });
    var fb = btn("", ICON.feedback, "Feedback", function () {
      fb.classList.toggle("is-open");
    });
    var thumbs = el("span", "lv-wz-thumbs");
    [
      ["up", ICON.thumbUp, "Thanks for the feedback"],
      ["down", ICON.thumbDown, "Thanks — we'll improve these picks"],
    ].forEach(function (t) {
      var b = el("button", "lv-wz-thumb");
      b.type = "button";
      b.innerHTML = svg(t[1]);
      b.onclick = function (e) {
        e.stopPropagation();
        [].forEach.call(thumbs.children, function (x) {
          x.classList.remove("is-on");
        });
        b.classList.add("is-on");
        toast(t[2]);
      };
      thumbs.appendChild(b);
    });
    fb.appendChild(thumbs);
    var srcList = el("div", "lv-wz-sources");
    var stores = {};
    items.forEach(function (it) {
      if (it.store && !stores[it.store]) stores[it.store] = it;
    });
    Object.keys(stores).forEach(function (name) {
      var a = el("a", "lv-wz-source");
      a.href = stores[name].url || "#";
      a.target = "_blank";
      a.rel = "noopener";
      if (stores[name].logo) {
        var i = el("img");
        i.alt = "";
        i.src = stores[name].logo;
        a.appendChild(i);
      }
      a.appendChild(el("span", null, name));
      srcList.appendChild(a);
    });
    btn("", ICON.link, "Sources", function () {
      srcList.classList.toggle("is-open");
    });
    var wrap = el("div");
    wrap.appendChild(row);
    wrap.appendChild(srcList);
    return wrap;
  }

  function followUpRow(list) {
    var row = el("div", "lv-wz-follow");
    list.forEach(function (q) {
      var b = el("button", "lv-wz-follow-btn");
      b.type = "button";
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h12M13 7l5 5-5 5"/></svg>';
      b.appendChild(el("span", null, q));
      b.onclick = function () {
        sendInChat(q);
      };
      row.appendChild(b);
    });
    return row;
  }

  function carousel(items, title, follows) {
    var box = el("div", "lv-wz");
    // 卡片在原会话气泡容器里，阻断事件冒泡，避免触发原消息的点选 / 菜单
    ["click", "mousedown", "contextmenu"].forEach(function (t) {
      box.addEventListener(t, function (e) {
        e.stopPropagation();
      });
    });
    var track = el("div", "lv-wz-track lv-dd-grid");
    box.classList.add("lv-wz-single"); // 网格不需要左右箭头
    items.forEach(function (it) {
      track.appendChild(ddCard(it));
    });
    box.appendChild(track);
    ["prev", "next"].forEach(function (dir) {
      var a = el("button", "lv-wz-arrow lv-wz-arrow-" + dir);
      a.type = "button";
      a.innerHTML = svg(dir === "prev" ? ICON.chevronLeft : ICON.chevron);
      a.onclick = function () {
        track.scrollBy({
          left: (dir === "prev" ? -1 : 1) * (track.clientWidth - 60),
          behavior: "smooth",
        });
      };
      box.appendChild(a);
    });
    function arrows() {
      box.classList.toggle("can-prev", track.scrollLeft > 4);
      box.classList.toggle(
        "can-next",
        track.scrollLeft + track.clientWidth < track.scrollWidth - 4,
      );
    }
    track.addEventListener("scroll", arrows);
    setTimeout(arrows, 60);
    // 卡片下方的 Compare / Share / Feedback / Sources 一排按钮已去掉（actionRow 暂留未用）
    if (follows && follows.length) box.appendChild(followUpRow(follows));
    return box;
  }

  function scan() {
    if (!/^\/(home|chat)/.test(lvPath()) || !window.lvCollectionForText) return;
    var fresh = freshHost();
    if (fresh && !fresh.classList.contains("lv-reply-in")) fresh.classList.add("lv-reply-in");
    [].forEach.call(document.querySelectorAll(".chat-blocks .markdown-paragraph"), function (p) {
      var host = p.closest(".chat-blocks");
      if (!host || host.querySelector(".lv-wz")) return;
      var c = window.lvCollectionForText(p.textContent);
      if (!c || !c.items.length) return;
      var box = carousel(buildItems(c.items), c.title, c.followUps);
      // 卡片序号给依次淡入用（只有带 lv-reply-in 的新回复才会播放，见 overrides.css）
      [].forEach.call(box.querySelectorAll(".lv-dd-card"), function (card, n) {
        card.style.setProperty("--i", n);
      });
      if (c.lead) {
        var lead = el("div", "lv-wz-lead");
        lead.appendChild(c.lead());
        ["click", "mousedown", "contextmenu"].forEach(function (t) {
          lead.addEventListener(t, function (e) {
            e.stopPropagation();
          });
        });
        host.appendChild(lead);
      }
      host.appendChild(box);
    });
  }

  /* ---------- 发送动效 + Migoo「思考」动画 ----------
   * 假 socket 发出消息（mock:ws-send）→ 等进到 Chat 页：最新的用户气泡加上浮动效；
   * 输入框上方浮出思考气泡，逐步轮播文案；步骤走完才放出回复（mockReplyGate，mock-api 调用）。
   * 回复到达（mock:ws-reply）→ 收起思考气泡；回复到达后新出现的回复气泡淡入、其商品卡依次淡入。 */
  var CHAT_PATH = /^\/(home|chat)/;
  var STEP_MS = 900;
  var think = null;
  var thinkTimer = null;
  var gateResolve = null;
  var gateText = "";
  var freshUntil = 0;
  function userText(frame) {
    try {
      return JSON.parse(frame.message.customized_data)
        .blocks.filter(function (b) {
          return b.type === "text";
        })
        .map(function (b) {
          return b.payload.content;
        })
        .join("\n")
        .trim();
    } catch (e) {
      return "";
    }
  }
  function newestSelfBubble(text) {
    var best = null;
    [].forEach.call(document.querySelectorAll(".chat-blocks-group.is-self"), function (b) {
      if (b.textContent.trim() !== text) return;
      if (!best || b.getBoundingClientRect().top > best.getBoundingClientRect().top) best = b;
    });
    return best;
  }
  // 思考气泡钉在 Chat 输入框上方、与消息列左对齐
  function placeThink() {
    if (!think) return;
    var editors = document.querySelectorAll(".ProseMirror");
    var shell = editors.length && editors[editors.length - 1].closest(".composer-shell");
    if (!shell || !CHAT_PATH.test(lvPath())) {
      think.style.display = "none";
      return;
    }
    var r = shell.getBoundingClientRect();
    think.style.display = "";
    think.style.left = r.left + 4 + "px";
    think.style.bottom = window.innerHeight - r.top + 14 + "px";
  }
  function stopThinking() {
    clearInterval(thinkTimer);
    if (think && think.parentNode) think.remove();
    think = null;
  }
  function releaseGate() {
    if (gateResolve) gateResolve();
    gateResolve = null;
  }
  window.mockReplyGate = function (text) {
    releaseGate();
    gateText = text;
    return new Promise(function (resolve) {
      gateResolve = resolve;
      // 兜底：不管动画走没走完，最多 9s 放出回复
      setTimeout(resolve, 9000);
    });
  };
  function startThinking(text) {
    stopThinking();
    var steps = (window.lvThinkingFor && window.lvThinkingFor(text)) || ["Thinking…"];
    think = el("div", "lv-think");
    think.innerHTML =
      '<span class="lv-think-orb"><span></span><span></span><span></span></span><span class="lv-think-text"></span>';
    var label = think.querySelector(".lv-think-text");
    label.textContent = steps[0];
    var start = Date.now();
    // 等进到 Chat 页、用户气泡渲染出来（最多等 6s）再开始
    (function waitChat() {
      if (!think) return;
      var bubble = CHAT_PATH.test(lvPath()) && newestSelfBubble(text);
      if (!bubble && Date.now() - start < 6000) return setTimeout(waitChat, 80);
      if (bubble) bubble.classList.add("lv-sent");
      document.body.appendChild(think);
      placeThink();
      var i = 0;
      thinkTimer = setInterval(function () {
        placeThink();
        i += 1;
        if (i < steps.length) {
          label.classList.remove("is-in");
          void label.offsetWidth;
          label.textContent = steps[i];
          label.classList.add("is-in");
        } else if (gateText === text) releaseGate();
      }, STEP_MS);
    })();
  }
  window.addEventListener("mock:ws-send", function (e) {
    var frame = e.detail || {};
    if (frame.type !== "send") return;
    startThinking(userText(frame));
  });
  window.addEventListener("resize", placeThink);
  // 回复到达后 3s 内：页面每次重渲染都把「最靠下、正文就是这次回复」的那条标成新回复（节点被重建也会重新标上）
  var freshText = "";
  window.addEventListener("mock:ws-reply", function (e) {
    stopThinking();
    freshText = userText(e.detail || {});
    freshUntil = Date.now() + 3000;
    schedule();
  });
  function freshHost() {
    if (Date.now() > freshUntil || !freshText) return null;
    var best = null;
    [].forEach.call(document.querySelectorAll(".chat-blocks"), function (b) {
      var p = b.querySelector(".markdown-content");
      if (!p || p.textContent.trim() !== freshText) return;
      if (!best || b.getBoundingClientRect().top > best.getBoundingClientRect().top) best = b;
    });
    return best;
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      scan();
    }, 120);
  }
  function boot() {
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
    });
    schedule();
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
