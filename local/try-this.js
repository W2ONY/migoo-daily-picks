/*
 * Start here 的四张「TRY THIS」卡：点击弹出各自的创作弹窗（版式参考 /new-task 的「Make a product video」）——
 * 左侧示意图 + 一句话说明，右侧是这一项的主输入 + 一行可选补充 + 选项 chips，底部主按钮。
 *   compare  Compare Prices          选商品（贴链接 / 照片 / 看过的）→ 多门店报价表 + 门店报价卡
 *   track    Track Price Drops       选商品 + 目标价 → 降价提醒卡 + 商品卡
 *   budget   Shop Within Your Budget 想买什么 + 预算 → 预算内的商品卡
 *   ideas    Find Shopping Ideas     送给谁 + 场合 → 灵感商品卡
 * 提交：需要商品的项把商品作为引用附件放进输入坞（同 Claim now），再发 query，跳进会话页；回复是本地 mock。
 * 依赖 categories.js 暴露的 window.lvShop（商品池与工具函数）；回复钩子在原有 mockReplyFor 等外面包一层。
 */
(function () {
  var RUNS_KEY = "lv:compare-runs";
  var MAX_STORES = 5;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function S() {
    return window.lvShop;
  }
  function shortTitle(t) {
    t = (t || "").split(/,| - | \| /)[0];
    return t.length > 44 ? t.slice(0, 42).trim() + "…" : t;
  }
  function productById(id) {
    return S()
      .products()
      .filter(function (p) {
        return p.id === id;
      })[0];
  }
  function dollars(v) {
    return "$" + (Math.round(v) === v ? v : v.toFixed(2));
  }

  /* ---------- 品类：按标题关键词归类，按顺序取第一个命中（避免猫零食算进零食） ---------- */
  var CATS = [
    {
      key: "pets",
      name: "Pet supplies",
      short: "Pets",
      emoji: "🐾",
      re: /\bcats?\b|\bdogs?\b|pet\b|kitten|puppy|litter/i,
    },
    {
      key: "travel",
      name: "Travel & bags",
      short: "Travel",
      emoji: "🧳",
      re: /backpack|luggage|suitcase|dry bag|travel|duffel|carry-on/i,
    },
    {
      key: "sports",
      name: "Sports & outdoors",
      short: "Sports",
      emoji: "⚽",
      re: /batting|glove|sports|lures?\b|scooter|bike|\bball\b|balls\b|fitness|yoga|camping|fishing|golf|shin guard/i,
    },
    {
      key: "tech",
      name: "Tech & gadgets",
      short: "Tech",
      emoji: "🎧",
      re: /wifi|router|\btv\b|iphone|bluetooth|headset|headphone|adapter|printer|controller|charger|speaker|monitor|laptop|tablet|camera|earbuds|keyboard|mouse|handheld/i,
    },
    {
      key: "home",
      name: "Home & kitchen",
      short: "Home",
      emoji: "🏠",
      re: /cookware|microwave|kitchen|storage|tote|bed frame|vacuum|air filter|furnace|blender|knife|skillet|pan\b|mattress|lamp|towel|washer|dryer|refrigerator|sheets|pillow|organizer|fabric soft/i,
    },
    {
      key: "snacks",
      name: "Snacks & treats",
      short: "Snacks",
      emoji: "🍫",
      re: /chocolate|candy|snickers|grapes|milk\b|coffee|snack|cookie|chips|\btea\b|nuts|shake/i,
    },
  ];
  function catOf(p) {
    for (var i = 0; i < CATS.length; i++)
      if (CATS[i].re.test(p.info.title)) return CATS[i];
    return null;
  }
  function catByName(name) {
    return CATS.filter(function (c) {
      return c.name.toLowerCase() === String(name).toLowerCase();
    })[0];
  }

  /* ---------- 可比价的门店：商品池里有 logo 的门店 ---------- */
  function stores() {
    var seen = {};
    var out = [];
    S()
      .products()
      .forEach(function (p) {
        if (!p.store || seen[p.store] || !p.info.website_logo_url) return;
        seen[p.store] = true;
        out.push(p.store);
      });
    return out;
  }

  /* ======================= Compare：同一商品在各门店的价格 / 券 / 运费 ======================= */
  function offersFor(p, opts) {
    var sh = S();
    var all = stores();
    var list;
    if (opts.stores && opts.stores.length) list = opts.stores.slice();
    else {
      // 全部门店：商品自己的门店 + 按 id 轮转取另外几家
      list = [p.store];
      var start = sh.seeded(p.id, all.length);
      for (var i = 0; list.length < MAX_STORES && i < all.length; i++) {
        var s = all[(start + i) % all.length];
        if (list.indexOf(s) < 0) list.push(s);
      }
    }
    var factors = [0.86, 0.91, 0.95, 0.98, 1.04, 1.08, 1.13, 1.19];
    var couponAt = list[sh.seeded(p.id + "c", list.length)];
    var offers = list.map(function (store) {
      var price =
        store === p.store
          ? p.price
          : sh.money(
              p.price * factors[sh.seeded(p.id + store, factors.length)],
            );
      var ship =
        price >= 35 || /amazon|walmart|target|costco/.test(store)
          ? 0
          : [4.99, 5.99, 6.95][sh.seeded(store + p.id, 3)];
      var coupon = null;
      if (store === couponAt) {
        var off = Math.max(
          1,
          Math.round(price * [0.05, 0.08, 0.1][sh.seeded(p.id + "o", 3)]),
        );
        coupon = {
          kind: "clip",
          off: off,
          code: "",
          label: "Clip coupon: $" + off + " off",
        };
      }
      var couponOff = coupon && opts.coupons !== false ? coupon.off : 0;
      var item = sh.money(Math.max(0.01, price - couponOff));
      return {
        store: store,
        name: sh.storeName(store),
        logo: sh.storeLogo(store),
        price: price,
        coupon: opts.coupons !== false ? coupon : null,
        ship: ship,
        total: opts.mode === "item" ? item : sh.money(item + ship),
      };
    });
    offers.sort(function (a, b) {
      return a.total - b.total;
    });
    return offers;
  }
  function joinNames(list) {
    return list.length < 2
      ? list.join("")
      : list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }
  function withNote(q, note) {
    note = (note || "").trim().replace(/\s+/g, " ");
    return note ? q + ". " + note : q;
  }

  var COMPARE = {
    query: function (st) {
      var sh = S();
      var o = st.opts;
      return withNote(
        "Compare prices for this product" +
          (o.stores.length
            ? " at " + joinNames(o.stores.map(sh.storeName))
            : " across all stores") +
          (o.mode === "item" ? ", item price only" : "") +
          (o.coupons === false ? ", without coupons" : ""),
        st.note,
      );
    },
    parse: function (text) {
      var m =
        /^Compare prices for this product (?:at (.+?)|across all stores)(, item price only)?(, without coupons)?(?:\.|$)/.exec(
          text,
        );
      if (!m) return null;
      var sh = S();
      var picked = [];
      if (m[1])
        stores().forEach(function (s) {
          if (m[1].indexOf(sh.storeName(s)) >= 0) picked.push(s);
        });
      return { stores: picked, mode: m[2] ? "item" : "total", coupons: !m[3] };
    },
    thinking: [
      "Finding this product at other stores…",
      "Checking prices, coupons and shipping…",
      "Working out the lowest total…",
    ],
    reply: function (opts, att) {
      var sh = S();
      var p = att && productById(att.pid);
      if (!p)
        return {
          blocks: [
            "Which product should I compare? Paste a link or add a photo from Compare Prices.",
          ],
        };
      var offers = offersFor(p, opts);
      var best = offers[0];
      var worst = offers[offers.length - 1];
      var save = sh.money(worst.total - best.total);
      var intro =
        (att.photo
          ? "Matched your photo to " + shortTitle(p.info.title) + ". "
          : "") +
        "Checked " +
        offers.length +
        " stores for " +
        (att.photo ? "it" : shortTitle(p.info.title)) +
        " — the lowest " +
        (opts.mode === "item" ? "price" : "total") +
        " is " +
        sh.fmt(best.total) +
        " at " +
        best.name +
        (save > 0 ? ", " + sh.fmt(save) + " less than the most expensive" : "");
      var rows = offers.map(function (o, i) {
        var cells = [
          o.name,
          sh.fmt(o.price),
          o.coupon ? "−" + sh.fmt(o.coupon.off) : "—",
          o.ship ? sh.fmt(o.ship) : "Free",
          i === 0 ? "**" + sh.fmt(o.total) + "** ✓" : sh.fmt(o.total),
        ];
        if (opts.mode === "item") cells.splice(3, 1);
        return "| " + cells.join(" | ") + " |";
      });
      var head =
        opts.mode === "item"
          ? "| Store | Price | Coupon | You pay |\n|---|---|---|---|"
          : "| Store | Price | Coupon | Shipping | Total |\n|---|---|---|---|---|";
      var tip =
        "**Migoo's pick:** buy at " +
        best.name +
        (best.coupon
          ? " and clip the $" + best.coupon.off + " coupon first"
          : "") +
        (best.ship
          ? " (shipping included above)"
          : best.price >= 35
            ? " — it ships free"
            : "") +
        ". Want me to keep watching these stores and tell you if it gets cheaper?";
      return {
        intro: intro,
        run: { pid: p.id, opts: opts },
        blocks: [intro, head + "\n" + rows.join("\n"), tip],
      };
    },
    cards: function (run) {
      var sh = S();
      var p = productById(run.pid);
      if (!p) return null;
      var offers = offersFor(p, run.opts);
      return {
        title: "Price comparison",
        items: offers.map(function (o, i) {
          return Object.assign({}, p, {
            price: o.price,
            max: 0,
            drop: 0,
            noWas: true,
            storeLabel: o.name,
            logo: o.logo,
            coupon: o.coupon,
            badge:
              i === 0
                ? "Lowest " +
                  (run.opts.mode === "item" ? "price" : "total") +
                  " · " +
                  sh.fmt(o.total)
                : "+" +
                  sh.fmt(sh.money(o.total - offers[0].total)) +
                  " vs lowest",
          });
        }),
        followUps: [
          "Alert me if " +
            shortTitle(p.info.title) +
            " drops below $" +
            Math.max(1, Math.floor(offers[0].total * 0.9)),
        ],
      };
    },
  };

  /* ======================= Track：目标价提醒 ======================= */
  // 价格走势：有录制的 30 天价格就用，没有就按 id 播种一条围绕现价的走势
  function historyOf(p) {
    if (p.chart && p.chart.length >= 4) return p.chart.slice(-30);
    var sh = S();
    var out = [];
    var v = p.price * (1 + (8 + sh.seeded(p.id, 18)) / 100);
    for (var i = 0; i < 30; i++) {
      v = v * (1 + (sh.seeded(p.id + "h" + i, 9) - 4.6) / 100);
      out.push(sh.money(Math.max(p.price * 0.85, v)));
    }
    out.push(p.price);
    return out;
  }
  function lowOf(p) {
    return S().money(Math.min.apply(null, historyOf(p).concat([p.price])));
  }
  var TRACK = {
    query: function (st) {
      var o = st.opts;
      return withNote(
        "Track this product's price and alert me below $" +
          st.target +
          (o.scope === "store" ? ", at this store only" : "") +
          (o.freq === "hourly" ? ", check hourly" : "") +
          (o.notify === "email" ? ", email me too" : ""),
        st.note,
      );
    },
    parse: function (text) {
      var m =
        /^Track this product's price and alert me below \$(\d+(?:\.\d+)?)(, at this store only)?(, check hourly)?(, email me too)?(?:\.|$)/.exec(
          text,
        );
      if (!m) return null;
      return {
        target: Number(m[1]),
        opts: {
          scope: m[2] ? "store" : "any",
          freq: m[3] ? "hourly" : "daily",
          notify: m[4] ? "email" : "app",
        },
      };
    },
    thinking: [
      "Reading this product's price history…",
      "Setting your target price…",
      "Saving the alert to Auto-task…",
    ],
    reply: function (q, att) {
      var sh = S();
      var p = att && productById(att.pid);
      if (!p)
        return {
          blocks: [
            "Which product should I track? Paste a link or pick one from Track Price Drops.",
          ],
        };
      var low = lowOf(p);
      var intro =
        (att.photo
          ? "Matched your photo to " + shortTitle(p.info.title) + ". "
          : "") +
        "Tracking " +
        (att.photo ? "it" : shortTitle(p.info.title)) +
        " — I'll alert you when it drops below $" +
        q.target +
        ". It's " +
        sh.fmt(p.price) +
        " at " +
        sh.storeName(p.store) +
        " right now";
      var more =
        (q.target < low
          ? "Heads up: $" +
            q.target +
            " is below its 30-day low of " +
            sh.fmt(low) +
            ", so it may take a big sale to get there."
          : "It hit " +
            sh.fmt(low) +
            " in the last 30 days, so $" +
            q.target +
            " is realistic.") +
        " I'll check " +
        (q.opts.scope === "store" ? sh.storeName(p.store) : "every store") +
        " " +
        q.opts.freq +
        " and message you here" +
        (q.opts.notify === "email" ? " and by email" : "") +
        ". You can edit or stop this alert anytime under **Auto-task**.";
      return { intro: intro, run: { pid: p.id, q: q }, blocks: [intro, more] };
    },
    cards: function (run) {
      var p = productById(run.pid);
      if (!p) return null;
      var cat = catOf(p);
      return {
        title: "Price alert",
        items: [
          Object.assign({}, p, { badge: "Alert below $" + run.q.target }),
        ],
        followUps: cat
          ? [
              BUDGET.query({
                what: cat.name,
                budget: Math.max(5, Math.round(run.q.target)),
                opts: { sort: "value" },
              }),
            ]
          : [],
        lead: function () {
          return trackerCard(p, run.q);
        },
      };
    },
  };
  function sparkPath(values, w, h) {
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min || 1;
    return values
      .map(function (v, i) {
        var x = (i / (values.length - 1)) * w;
        var y = h - 4 - ((v - min) / span) * (h - 8);
        return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      })
      .join(" ");
  }
  // 会话页里商品卡上方的「降价提醒」卡：现价 / 目标价 / 30 天最低 + 走势线（虚线是目标价）
  function trackerCard(p, q) {
    var sh = S();
    var hist = historyOf(p);
    var c = el("div", "lv-trk");
    var head = el("div", "lv-trk-head");
    var img = el("img");
    img.alt = "";
    img.src = p.info.image;
    head.appendChild(img);
    var t = el("div", "lv-trk-title");
    t.appendChild(el("small", null, "Price alert · Active"));
    t.appendChild(el("b", null, shortTitle(p.info.title)));
    head.appendChild(t);
    head.appendChild(
      el(
        "span",
        "lv-trk-live",
        q.opts.freq === "hourly" ? "Checks hourly" : "Checks daily",
      ),
    );
    c.appendChild(head);
    var stats = el("div", "lv-trk-stats");
    [
      ["Now", sh.fmt(p.price)],
      ["Your target", "$" + q.target],
      ["30-day low", sh.fmt(lowOf(p))],
    ].forEach(function (s, i) {
      var d = el("div", "lv-trk-stat" + (i === 1 ? " is-target" : ""));
      d.appendChild(el("small", null, s[0]));
      d.appendChild(el("b", null, s[1]));
      stats.appendChild(d);
    });
    c.appendChild(stats);
    var W = 400;
    var H = 72;
    var all = hist.concat([q.target]);
    var min = Math.min.apply(null, all);
    var max = Math.max.apply(null, all);
    var ty = H - 4 - ((q.target - min) / (max - min || 1)) * (H - 8);
    c.insertAdjacentHTML(
      "beforeend",
      '<svg class="lv-trk-chart" viewBox="0 0 ' +
        W +
        " " +
        H +
        '" preserveAspectRatio="none"><path d="M0 ' +
        ty.toFixed(1) +
        "H" +
        W +
        '" class="lv-trk-target"/><path class="lv-trk-line"/></svg>',
    );
    // 走势线和目标线用同一坐标区间（含目标价），目标价低于历史时虚线落在走势下方
    c.querySelector(".lv-trk-line").setAttribute(
      "d",
      hist
        .map(function (v, i) {
          var x = (i / (hist.length - 1)) * W;
          var y = H - 4 - ((v - min) / (max - min || 1)) * (H - 8);
          return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
        })
        .join(" "),
    );
    c.appendChild(
      el(
        "div",
        "lv-trk-foot",
        "Last 30 days · " +
          (q.opts.scope === "store"
            ? sh.storeName(p.store) + " only"
            : "All stores") +
          (q.opts.notify === "email"
            ? " · Migoo + email"
            : " · Notify in Migoo"),
      ),
    );
    return c;
  }

  /* ======================= Budget：预算内的商品 ======================= */
  function budgetPicks(what, budget, sort) {
    var sh = S();
    var cat = catByName(what);
    var words = String(what)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (w) {
        return (
          w.length >= 3 &&
          [
            "for",
            "and",
            "the",
            "with",
            "some",
            "good",
            "best",
            "cheap",
          ].indexOf(w) < 0
        );
      })
      .map(function (w) {
        return w.replace(/s$/, "");
      });
    var P = sh.products().filter(function (p) {
      if (cat) return catOf(p) === cat;
      var t = p.info.title.toLowerCase();
      return words.some(function (w) {
        return t.indexOf(w) >= 0;
      });
    });
    var under = P.filter(function (p) {
      return p.price <= budget;
    });
    under.sort(
      sort === "low"
        ? function (a, b) {
            return a.price - b.price;
          }
        : function (a, b) {
            // 性价比：降幅优先，其次越接近预算（买得越好）越靠前
            return b.drop - a.drop || b.price - a.price;
          },
    );
    return { all: P, under: under.slice(0, 8) };
  }
  var BUDGET = {
    query: function (st) {
      return withNote(
        "Find " +
          st.what.trim() +
          " within a $" +
          st.budget +
          " budget" +
          (st.opts.sort === "low" ? ", cheapest first" : ""),
        st.note,
      );
    },
    parse: function (text) {
      var m = /^Find (.+?) within a \$(\d+) budget(, cheapest first)?(?:\.|$)/.exec(text);
      if (!m) return null;
      return {
        what: m[1],
        budget: Number(m[2]),
        opts: { sort: m[3] ? "low" : "value" },
      };
    },
    thinking: [
      "Searching stores for what you need…",
      "Keeping everything within your budget…",
      "Ranking by value…",
    ],
    reply: function (q) {
      var sh = S();
      var r = budgetPicks(q.what, q.budget, q.opts.sort);
      if (!r.under.length) {
        var cheapest = r.all.slice().sort(function (a, b) {
          return a.price - b.price;
        })[0];
        return {
          blocks: [
            cheapest
              ? "I couldn't find " +
                q.what +
                " under $" +
                q.budget +
                " right now — the cheapest I found is " +
                sh.fmt(cheapest.price) +
                ". Want to raise the budget a little?"
              : "I couldn't find any " +
                q.what +
                " yet. Try another wording, or pick a category in Shop Within Your Budget.",
          ],
        };
      }
      var intro =
        "Found " +
        r.under.length +
        " " +
        q.what +
        " picks under $" +
        q.budget +
        (q.opts.sort === "low" ? ", cheapest first" : ", best value first");
      var spend = r.under[0];
      return {
        intro: intro,
        run: { q: q },
        blocks: [
          intro,
          "Everything here fits your budget before tax. **Top pick:** " +
            shortTitle(spend.info.title) +
            " at " +
            sh.fmt(spend.price) +
            " from " +
            sh.storeName(spend.store) +
            (spend.drop
              ? " — " + spend.drop + "% below its recent high."
              : "."),
        ],
      };
    },
    cards: function (run) {
      var sh = S();
      var q = run.q;
      var r = budgetPicks(q.what, q.budget, q.opts.sort);
      if (!r.under.length) return null;
      var lower = Math.max(5, Math.round(q.budget / 2 / 5) * 5);
      return {
        title: q.what + " under $" + q.budget,
        items: r.under.map(function (p) {
          return Object.assign({}, p, {
            badge: sh.fmt(sh.money(q.budget - p.price)) + " under budget",
          });
        }),
        followUps:
          lower < q.budget
            ? [
                BUDGET.query({
                  what: q.what,
                  budget: lower,
                  opts: { sort: "low" },
                }),
              ]
            : [],
      };
    },
  };

  /* ======================= Ideas：送礼 / 灵感 ======================= */
  var WHO = [
    {
      key: "her",
      label: "For her",
      short: "Her",
      emoji: "💐",
      re: /backpack|bag|cookware|coffee|chocolate|candy|tote|serum|skin|beauty|fabric soft|shake|travel/i,
    },
    {
      key: "him",
      label: "For him",
      short: "Him",
      emoji: "🧢",
      re: /golf|batting|glove|lures?\b|scooter|headset|bluetooth|router|controller|handheld|tv\b|coffee|dry bag|grill/i,
    },
    {
      key: "kids",
      label: "For kids",
      short: "Kids",
      emoji: "🧸",
      re: /kids|toy|game|controller|handheld|ball|candy|chocolate|m&m|shin guard|scooter/i,
    },
    { key: "pets", label: "For pets", short: "Pets", emoji: "🐶", re: CATS[0].re },
    { key: "home", label: "For the home", short: "Home", emoji: "🪴", re: CATS[4].re },
    { key: "travel", label: "For travel", short: "Travel", emoji: "✈️", re: CATS[1].re },
  ];
  var OCCASIONS = [
    ["birthday", "Birthday", "a birthday"],
    ["anniversary", "Anniversary", "an anniversary"],
    ["housewarming", "Housewarming", "a housewarming"],
    ["holidays", "Holidays", "the holidays"],
    ["none", "Just because", ""],
  ];
  var IDEA_BADGES = [
    "Top idea",
    "Crowd favorite",
    "Thoughtful pick",
    "Fun surprise",
    "Practical pick",
    "Little luxury",
    "Easy win",
    "Great value",
  ];
  function whoByKey(k) {
    return WHO.filter(function (w) {
      return w.key === k;
    })[0];
  }
  function ideaPicks(q) {
    var sh = S();
    var who = whoByKey(q.who) || WHO[0];
    var list = sh.products().filter(function (p) {
      return (
        who.re.test(p.info.title) &&
        (!q.budget || p.price <= q.budget) &&
        (who.key === "pets" || catOf(p) !== CATS[0])
      );
    });
    // 同一组条件每次给一样的结果，换个场合 / 补充说明就换一批
    var seed = q.who + q.occasion + (q.budget || "") + (q.note || "");
    list.sort(function (a, b) {
      return sh.seeded(seed + a.id, 997) - sh.seeded(seed + b.id, 997);
    });
    return list.slice(0, 8);
  }
  var IDEAS = {
    query: function (st) {
      var who = whoByKey(st.who);
      var occ = OCCASIONS.filter(function (o) {
        return o[0] === st.occasion;
      })[0];
      return withNote(
        "Give me shopping ideas " +
          who.label.toLowerCase() +
          (occ && occ[2] ? ", for " + occ[2] : "") +
          (st.opts.budget ? ", under $" + st.opts.budget : ""),
        st.note,
      );
    },
    parse: function (text) {
      var m =
        /^Give me shopping ideas (for her|for him|for kids|for pets|for the home|for travel)(?:, for (a birthday|an anniversary|a housewarming|the holidays))?(?:, under \$(\d+))?(?:\.\s*(.*))?$/.exec(
          text,
        );
      if (!m) return null;
      var who = WHO.filter(function (w) {
        return w.label.toLowerCase() === m[1];
      })[0];
      var occ = OCCASIONS.filter(function (o) {
        return o[2] && o[2] === m[2];
      })[0];
      return {
        who: who.key,
        occasion: occ ? occ[0] : "none",
        budget: m[3] ? Number(m[3]) : 0,
        note: m[4] || "",
      };
    },
    thinking: [
      "Thinking about who it's for…",
      "Browsing what's popular right now…",
      "Picking ideas worth giving…",
    ],
    reply: function (q) {
      var who = whoByKey(q.who);
      var items = ideaPicks(q);
      var occ = OCCASIONS.filter(function (o) {
        return o[0] === q.occasion;
      })[0];
      if (!items.length)
        return {
          blocks: [
            "I couldn't find ideas " +
              who.label.toLowerCase() +
              (q.budget ? " under $" + q.budget : "") +
              " right now — try a bigger budget?",
          ],
        };
      var intro =
        "Here are " +
        items.length +
        " ideas " +
        who.label.toLowerCase() +
        (occ && occ[2] ? " for " + occ[2] : "") +
        (q.budget ? " under $" + q.budget : "");
      return {
        intro: intro,
        run: { q: q },
        blocks: [
          intro,
          "I mixed practical picks with a few fun surprises" +
            (q.note ? ", keeping in mind: _" + q.note + "_" : "") +
            ". Save the ones you like and I'll watch their prices for you.",
        ],
      };
    },
    cards: function (run) {
      var sh = S();
      var q = run.q;
      var items = ideaPicks(q);
      if (!items.length) return null;
      var cheaper = q.budget && q.budget <= 25 ? 0 : 25;
      return {
        title: "Shopping ideas",
        items: items.map(function (p, i) {
          return Object.assign({}, p, {
            badge:
              IDEA_BADGES[i % IDEA_BADGES.length] +
              (p.price < 25 ? " · Under $25" : ""),
          });
        }),
        followUps: cheaper
          ? [
              IDEAS.query({
                who: q.who,
                occasion: q.occasion,
                opts: { budget: cheaper },
                note: "",
              }),
            ]
          : [],
      };
    },
  };

  var KINDS = { compare: COMPARE, track: TRACK, budget: BUDGET, ideas: IDEAS };

  /* ---------- 一句引导语 → 本次参数（会话页重建卡片 / 刷新后从历史恢复都靠它） ---------- */
  function runs() {
    try {
      return JSON.parse(localStorage.getItem(RUNS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveRun(intro, run) {
    var all = runs();
    all[intro] = run;
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  // 发出的消息里的商品附件（offer_id = cmp-[photo-]{商品 id}）
  function attachmentOf(frame) {
    var blocks = [];
    try {
      blocks = JSON.parse(frame.message.customized_data).blocks || [];
    } catch (e) {}
    var hit = null;
    blocks.forEach(function (b) {
      var loc = b.payload && b.payload.pdp && b.payload.pdp.locator;
      var id = loc && (loc.offer_id || loc.offerId);
      var m = id && /^cmp-(photo-)?(.+)$/.exec(id);
      if (m) hit = { pid: m[2], photo: !!m[1] };
    });
    return hit;
  }
  function kindOf(text) {
    for (var k in KINDS) {
      var q = KINDS[k].parse(text);
      if (q) return { kind: k, q: q };
    }
    return null;
  }

  /* ---------- 回复钩子：包在 categories.js 的实现外面 ---------- */
  function textBlock(s) {
    return { type: "text", payload: { content: s } };
  }
  // 会话里已展示过的卡片（标题 → 商品），给卡片下方的 Compare 用
  var shown = {};
  var prevReply = window.mockReplyFor;
  window.mockReplyFor = function (text, frame) {
    text = (text || "").trim();
    // 比价结果下的跟进：一键设提醒（会话里已没有商品附件，按文案回复）
    var alert = /^Alert me if (.+) drops below \$(\d+)$/.exec(text);
    if (alert)
      return [
        textBlock(
          "Done! I'll watch **" +
            alert[1] +
            "** at every store above and message you here as soon as the total drops below $" +
            alert[2] +
            ".\n\nYou can see and edit this alert anytime under **Auto-task**.",
        ),
      ];
    // 预算 / 灵感结果卡片下的 Compare：按卡片顺序出对比表
    var cmp = /^Compare these (\d+) (.+) picks side by side$/.exec(text);
    if (cmp && shown[cmp[2]]) {
      var sh = S();
      var rows = shown[cmp[2]].slice(0, Number(cmp[1])).map(function (p) {
        return "| " + shortTitle(p.info.title).replace(/\|/g, "/") + " | " + sh.fmt(p.price) + " | " + sh.storeName(p.store) + " | " + (p.badge || "—") + " |";
      });
      return [textBlock("Here's how these " + cmp[2] + " picks compare:\n\n| Product | Price | Store | Why |\n|---|---|---|---|\n" + rows.join("\n"))];
    }
    var hit = kindOf(text);
    if (hit) {
      var r = KINDS[hit.kind].reply(hit.q, frame && attachmentOf(frame));
      if (r.intro) saveRun(r.intro, Object.assign({ kind: hit.kind }, r.run));
      return r.blocks.map(textBlock);
    }
    return prevReply ? prevReply(text, frame) : null;
  };
  var prevThinking = window.lvThinkingFor;
  window.lvThinkingFor = function (text) {
    text = (text || "").trim();
    if (/^Alert me if .+ drops below \$\d+$/.test(text)) return ["Setting up a price alert…", "Saving it to Auto-task…"];
    var hit = kindOf(text);
    if (hit) return KINDS[hit.kind].thinking;
    return prevThinking ? prevThinking(text) : ["Thinking…"];
  };
  var prevCards = window.lvCollectionForText;
  window.lvCollectionForText = function (text) {
    var run = runs()[(text || "").trim()];
    if (run) {
      var c = KINDS[run.kind || "compare"].cards(run);
      if (c) shown[c.title] = c.items;
      return c;
    }
    return prevCards ? prevCards(text) : null;
  };

  /* ======================= 弹窗 ======================= */
  var ICON = {
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    upload:
      '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    store:
      '<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v7.5h13V12"/>',
    bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14z"/><path d="M10 20.5h4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sort: '<path d="M7 5v14M4 16l3 3 3-3"/><path d="M13 7h7M13 12h5M13 17h3"/>',
    wallet:
      '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4"/><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 6.5"/><circle cx="16" cy="14" r="1"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    spark:
      '<path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9z"/>',
  };
  function svg(path) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path +
      "</svg>"
    );
  }

  var modal = null;
  var state = null;

  // 贴的链接 → 商品：先按 offer_id / 商品链接精确匹配，再按域名认门店，都不中就按链接播种取一件（mock）
  function productForLink(url) {
    var sh = S();
    var P = sh.products();
    var u = url.toLowerCase();
    var exact = P.filter(function (p) {
      return (
        (p.info.offer_id &&
          u.indexOf(String(p.info.offer_id).toLowerCase()) >= 0) ||
        (p.info.pdp_url && u.indexOf(p.info.pdp_url.toLowerCase()) >= 0)
      );
    })[0];
    if (exact) return exact;
    var byStore = P.filter(function (p) {
      return p.store && u.indexOf(p.store.toLowerCase()) >= 0;
    });
    var pool = byStore.length ? byStore : P;
    return pool[sh.seeded(u, pool.length)];
  }
  function suggestions() {
    var sh = S();
    var viewed = [];
    try {
      viewed = JSON.parse(localStorage.getItem("local:viewed") || "[]");
    } catch (e) {}
    var seen = {};
    var list = [];
    viewed
      .map(productById)
      .concat(sh.products().slice().sort(sh.byDrop))
      .forEach(function (p) {
        if (p && !seen[p.id] && list.length < 4) {
          seen[p.id] = true;
          list.push(p);
        }
      });
    return list;
  }

  /* ---------- 左侧示意图 ---------- */
  function artCard(p, cls, foot, tag) {
    var c = el("div", "lv-cmp-art-card " + cls);
    var img = el("img");
    img.alt = "";
    img.src = p.info.image;
    c.appendChild(img);
    var f = el("div", "lv-cmp-art-foot");
    foot(f);
    c.appendChild(f);
    if (tag) c.appendChild(el("span", "lv-cmp-art-tag", tag));
    return c;
  }
  var ART = {
    compare: function (wrap) {
      var sh = S();
      var p = suggestions()[0];
      var offers = offersFor(p, {
        stores: [],
        mode: "total",
        coupons: true,
      }).slice(0, 3);
      // 中间放最低价那张，左右两张更贵
      [offers[1], offers[0], offers[2]].forEach(function (o, i) {
        if (!o) return;
        wrap.appendChild(
          artCard(
            p,
            "lv-cmp-art-" + ["l", "c", "r"][i],
            function (f) {
              if (o.logo) {
                var lg = el("img", "lv-cmp-art-logo");
                lg.alt = "";
                lg.src = o.logo;
                f.appendChild(lg);
              }
              f.appendChild(el("span", "lv-cmp-art-store", o.name));
              f.appendChild(el("b", null, sh.fmt(o.total)));
            },
            i === 1 ? "Lowest" : "",
          ),
        );
      });
    },
    track: function (wrap) {
      var sh = S();
      var p = suggestions()[0];
      var hist = historyOf(p);
      var card = el("div", "lv-art-trk");
      var head = el("div", "lv-art-trk-head");
      var img = el("img");
      img.alt = "";
      img.src = p.info.image;
      head.appendChild(img);
      var t = el("div");
      t.appendChild(el("small", null, shortTitle(p.info.title)));
      t.appendChild(el("b", null, sh.fmt(p.price)));
      head.appendChild(t);
      card.appendChild(head);
      card.insertAdjacentHTML(
        "beforeend",
        '<svg viewBox="0 0 240 80" preserveAspectRatio="none"><path d="M0 58H240" class="lv-trk-target"/><path d="' +
          sparkPath(hist, 240, 80) +
          '" class="lv-trk-line"/></svg>',
      );
      wrap.appendChild(card);
      var note = el("div", "lv-art-note");
      note.innerHTML =
        svg(ICON.bell) +
        "<span><b>Price dropped " +
        (p.drop || 18) +
        "%</b><small>Now " +
        sh.fmt(p.price) +
        " at " +
        sh.storeName(p.store) +
        "</small></span>";
      wrap.appendChild(note);
    },
    budget: function (wrap) {
      var sh = S();
      var picks = budgetPicks("Home & kitchen", 100, "value").under.slice(0, 3);
      var card = el("div", "lv-art-bdg");
      card.innerHTML =
        '<div class="lv-art-bdg-top"><small>Your budget</small><b>$100</b></div><div class="lv-art-bdg-bar"><i></i></div>';
      picks.forEach(function (p) {
        var row = el("div", "lv-art-bdg-row");
        var img = el("img");
        img.alt = "";
        img.src = p.info.image;
        row.appendChild(img);
        row.appendChild(el("span", null, shortTitle(p.info.title)));
        row.appendChild(el("b", null, sh.fmt(p.price)));
        card.appendChild(row);
      });
      wrap.appendChild(card);
    },
    ideas: function (wrap) {
      var sh = S();
      var tags = ["For him", "For her", "For the home"];
      [
        ideaPicks({ who: "him", occasion: "birthday", budget: 0 })[0],
        ideaPicks({ who: "her", occasion: "birthday", budget: 0 })[0],
        ideaPicks({ who: "home", occasion: "birthday", budget: 0 })[0],
      ].forEach(function (p, i) {
        if (!p) return;
        wrap.appendChild(
          artCard(
            p,
            "lv-cmp-art-" + ["l", "c", "r"][i],
            function (f) {
              f.appendChild(el("span", "lv-cmp-art-store", tags[i]));
              f.appendChild(el("b", null, sh.fmt(p.price)));
            },
            i === 1 ? "Gift idea" : "",
          ),
        );
      });
    },
  };

  /* ---------- 选项 chips + 下拉 ---------- */
  function closeMenus() {
    if (!modal) return;
    [].forEach.call(modal.querySelectorAll(".lv-cmp-menu"), function (m) {
      m.remove();
    });
    [].forEach.call(
      modal.querySelectorAll(".lv-cmp-opt.is-open"),
      function (b) {
        b.classList.remove("is-open");
      },
    );
  }
  function optChip(icon, label, build) {
    var b = el("button", "lv-cmp-opt");
    b.type = "button";
    b.innerHTML = svg(icon) + "<span></span>" + svg(ICON.chevron);
    b._label = b.querySelector("span");
    b._label.textContent = label();
    b.onclick = function (e) {
      e.stopPropagation();
      var open = b.classList.contains("is-open");
      closeMenus();
      if (open) return;
      b.classList.add("is-open");
      var menu = el("div", "lv-cmp-menu");
      build(menu, function () {
        b._label.textContent = label();
      });
      menu.onclick = function (ev) {
        ev.stopPropagation();
      };
      b.parentNode.appendChild(menu);
      menu.style.left = b.offsetLeft + "px";
    };
    return b;
  }
  function menuItem(menu, text, checked, onPick) {
    var it = el("button", "lv-cmp-menu-item" + (checked ? " is-on" : ""));
    it.type = "button";
    it.innerHTML =
      '<span class="lv-cmp-menu-check">' + svg(ICON.check) + "</span>";
    it.appendChild(el("span", null, text));
    it.onclick = onPick;
    menu.appendChild(it);
    return it;
  }
  // 单选下拉：choices = [[值, 文案], …]
  function radioChip(icon, key, choices) {
    function label() {
      return choices.filter(function (c) {
        return c[0] === state.opts[key];
      })[0][1];
    }
    return optChip(icon, label, function (menu, refresh) {
      choices.forEach(function (c) {
        menuItem(menu, c[1], state.opts[key] === c[0], function () {
          state.opts[key] = c[0];
          refresh();
          closeMenus();
          refreshGo();
        });
      });
    });
  }
  /* ---------- 公共：商品投放区（Compare / Track） ---------- */
  function productSection(body) {
    body.appendChild(el("div", "lv-cmp-label", "Which product?"));
    var zone = el("div", "lv-cmp-product");
    body.appendChild(zone);
    var sug = el("div", "lv-cmp-suggest");
    sug.appendChild(el("span", null, "Or pick one you viewed"));
    var row = el("div", "lv-cmp-suggest-row");
    suggestions().forEach(function (p) {
      var b = el("button", "lv-cmp-tile");
      b.type = "button";
      b._pid = p.id;
      var img = el("img");
      img.alt = "";
      img.src = p.info.image;
      b.appendChild(img);
      b.appendChild(el("span", "lv-cmp-tile-name", shortTitle(p.info.title)));
      b.appendChild(el("b", null, S().fmt(p.price)));
      b.onclick = function () {
        setProduct(p, null);
      };
      row.appendChild(b);
    });
    sug.appendChild(row);
    body.appendChild(sug);
    // 照片可以直接拖进投放区
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("is-over");
    });
    zone.addEventListener("dragleave", function () {
      zone.classList.remove("is-over");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("is-over");
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /^image\//.test(f.type)) readPhoto(f);
    });
  }
  function setProduct(p, photo) {
    state.product = p;
    state.photo = photo;
    if (state.kind.onProduct) state.kind.onProduct();
    renderProduct();
  }
  // 空态是一块大的投放区（贴链接 / 拖入或选择照片），选中后变成商品预览卡
  function renderProduct() {
    var box = modal.querySelector(".lv-cmp-product:not(.lv-try-main)");
    if (!box) return refreshGo();
    box.innerHTML = "";
    box.classList.toggle("is-picked", !!state.product);
    var sh = S();
    if (state.product) {
      var p = state.product;
      var row = el("div", "lv-cmp-picked");
      var img = el("img");
      img.alt = "";
      img.src = state.photo || p.info.image;
      row.appendChild(img);
      var text = el("div", "lv-cmp-picked-text");
      text.appendChild(
        el(
          "small",
          "lv-cmp-picked-eyebrow",
          state.photo ? "Your photo" : "Found on " + sh.storeName(p.store),
        ),
      );
      text.appendChild(
        el(
          "b",
          null,
          state.photo
            ? "Migoo will identify the product and find it in every store"
            : p.info.title,
        ),
      );
      if (!state.photo)
        text.appendChild(el("span", "lv-cmp-picked-price", sh.fmt(p.price)));
      row.appendChild(text);
      var x = el("button", "lv-cmp-picked-x");
      x.type = "button";
      x.setAttribute("aria-label", "Remove");
      x.innerHTML = svg(ICON.close);
      x.onclick = function () {
        setProduct(null, null);
      };
      row.appendChild(x);
      box.appendChild(row);
    } else {
      var field = el("div", "lv-cmp-field");
      field.insertAdjacentHTML("beforeend", svg(ICON.link));
      var input = el("input", "lv-cmp-link");
      input.type = "url";
      input.placeholder = "Paste a product link from any store";
      var take = function () {
        var v = input.value.trim();
        if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/i.test(v)) return false;
        setProduct(productForLink(v), null);
        return true;
      };
      input.addEventListener("paste", function () {
        setTimeout(take, 0);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!take()) field.classList.add("is-bad");
        }
      });
      input.addEventListener("input", function () {
        field.classList.remove("is-bad");
      });
      input.addEventListener("blur", take);
      field.appendChild(input);
      box.appendChild(field);
      box.appendChild(el("div", "lv-cmp-or", "or"));
      var up = el("label", "lv-cmp-drop");
      up.innerHTML =
        svg(ICON.upload) + "<span>Drop a photo here, or <u>browse</u></span>";
      var file = el("input");
      file.type = "file";
      file.accept = "image/*";
      file.hidden = true;
      file.onchange = function () {
        var f = file.files && file.files[0];
        if (f) readPhoto(f);
      };
      up.appendChild(file);
      box.appendChild(up);
    }
    [].forEach.call(modal.querySelectorAll(".lv-cmp-tile"), function (t) {
      t.classList.toggle(
        "is-on",
        !state.photo && !!state.product && t._pid === state.product.id,
      );
    });
    refreshGo();
  }
  // 上传的照片缩成小图（会作为附件随消息存进本地会话记录），识别结果按文件播种取一件（mock）
  function readPhoto(f) {
    var sh = S();
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 240 / Math.max(img.width, img.height, 1));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k));
        c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var P = sh.products();
        setProduct(
          P[sh.seeded(f.name + f.size, P.length)],
          c.toDataURL("image/jpeg", 0.82),
        );
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  }
  // 一行可选补充 + 选项 chips
  function extraSection(body, placeholder, chips) {
    var box = el("div", "lv-cmp-extra");
    var note = el("input", "lv-cmp-note");
    note.type = "text";
    note.placeholder = placeholder;
    note.oninput = function () {
      state.note = note.value;
    };
    box.appendChild(note);
    if (chips.length) {
      var opts = el("div", "lv-cmp-opts");
      chips.forEach(function (c) {
        opts.appendChild(c);
      });
      box.appendChild(opts);
    }
    body.appendChild(box);
  }
  function pills(list, isOn, onPick) {
    var row = el("div", "lv-try-pills");
    list.forEach(function (it) {
      var b = el("button", "lv-try-pill");
      b.type = "button";
      b.textContent = it[1];
      b._val = it[0];
      b.onclick = function () {
        onPick(it[0]);
        [].forEach.call(row.children, function (x) {
          x.classList.toggle("is-on", isOn(x._val));
        });
        refreshGo();
      };
      b.classList.toggle("is-on", isOn(it[0]));
      row.appendChild(b);
    });
    return row;
  }

  /* ---------- 各弹窗右侧主体 ---------- */
  COMPARE.ui = {
    theme: "compare",
    title: "Compare prices",
    leftTitle: "Compare prices in one click",
    leftCopy:
      "Drop a product link and Migoo checks every store — price, coupons and shipping — to find the lowest total.",
    go: "Compare prices",
    opts: function () {
      return { stores: [], mode: "total", coupons: true };
    },
    body: function (body) {
      productSection(body);
      // 不给门店 / 运费 / 券的选项 chips，一律按全部门店、含运费、含券比价
      extraSection(body, "Anything to consider? e.g. Prime shipping only (optional)", []);
    },
    ready: function () {
      return !!state.product;
    },
  };

  TRACK.ui = {
    theme: "track",
    title: "Track price drops",
    leftTitle: "Never miss a price drop",
    leftCopy:
      "Pick a product and a target price. Migoo watches it every day and tells you the moment it gets there.",
    go: "Start tracking",
    opts: function () {
      return { scope: "any", freq: "daily", notify: "app" };
    },
    body: function (body) {
      productSection(body);
      var wrap = el("div", "lv-trk-target-row");
      var label = el("div", "lv-cmp-label", "Alert me when it drops below");
      wrap.appendChild(label);
      var line = el("div", "lv-trk-input-line");
      var field = el("label", "lv-trk-input");
      field.appendChild(el("span", null, "$"));
      var input = el("input");
      input.type = "number";
      input.min = "1";
      input.step = "0.01";
      input.placeholder = "Target price";
      input.oninput = function () {
        state.target = Math.max(0, Number(input.value) || 0);
        state.targetTouched = true;
        markPreset();
        refreshGo();
      };
      field.appendChild(input);
      line.appendChild(field);
      var presets = el("div", "lv-try-pills lv-trk-presets");
      [
        ["10", "−10%"],
        ["20", "−20%"],
        ["low", "30-day low"],
      ].forEach(function (pr) {
        var b = el("button", "lv-try-pill");
        b.type = "button";
        b.textContent = pr[1];
        b._val = pr[0];
        b.onclick = function () {
          if (!state.product) return;
          state.target = presetValue(pr[0]);
          state.targetTouched = true;
          input.value = state.target;
          markPreset();
          refreshGo();
        };
        presets.appendChild(b);
      });
      line.appendChild(presets);
      wrap.appendChild(line);
      body.appendChild(wrap);
      function markPreset() {
        [].forEach.call(presets.children, function (b) {
          b.classList.toggle(
            "is-on",
            !!state.product && presetValue(b._val) === state.target,
          );
          // 现价就是 30 天最低时「30-day low」没有意义
          b.disabled = !state.product || (b._val === "low" ? lowOf(state.product) : presetValue(b._val)) >= state.product.price;
        });
      }
      // 选了商品就默认填「现价 −10%」，用户改过就不再覆盖
      TRACK.onProduct = function () {
        if (state.product && !state.targetTouched) {
          state.target = presetValue("10");
          input.value = state.target;
        }
        if (!state.product && !state.targetTouched) {
          state.target = 0;
          input.value = "";
        }
        markPreset();
      };
      markPreset();
      extraSection(
        body,
        "Anything to consider? e.g. only the black one (optional)",
        [
          radioChip(ICON.store, "scope", [
            ["any", "Any store"],
            ["store", "This store only"],
          ]),
          radioChip(ICON.clock, "freq", [
            ["daily", "Check daily"],
            ["hourly", "Check hourly"],
          ]),
          radioChip(ICON.bell, "notify", [
            ["app", "Notify in Migoo"],
            ["email", "Migoo + email"],
          ]),
        ],
      );
    },
    ready: function () {
      return !!state.product && state.target > 0;
    },
  };
  function presetValue(k) {
    var p = state.product;
    if (!p) return 0;
    var v = k === "low" ? lowOf(p) : p.price * (1 - Number(k) / 100);
    // 便宜货保留到分，避免 $5.64 的东西目标价被抹成 $5
    return p.price >= 20 ? Math.max(1, Math.floor(v)) : Math.max(0.01, Math.floor(v * 100) / 100);
  }

  var BUDGET_STEPS = [
    10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500,
    750, 1000,
  ];
  BUDGET.ui = {
    theme: "budget",
    title: "Shop within your budget",
    leftTitle: "Get more for every dollar",
    leftCopy:
      "Tell Migoo what you need and how much you want to spend. Every pick fits the budget — best value first.",
    go: "Find picks",
    opts: function () {
      return { sort: "value" };
    },
    init: function () {
      state.what = "";
      state.budget = 100;
    },
    body: function (body) {
      body.appendChild(el("div", "lv-cmp-label", "What are you shopping for?"));
      var main = el("div", "lv-cmp-product lv-try-main");
      var field = el("div", "lv-cmp-field");
      field.insertAdjacentHTML("beforeend", svg(ICON.search));
      var input = el("input", "lv-cmp-link lv-try-what");
      input.type = "text";
      input.placeholder = "e.g. running shoes, a desk lamp, cat food";
      field.appendChild(input);
      main.appendChild(field);
      var tiles = el("div", "lv-try-cats");
      CATS.forEach(function (c) {
        var b = el("button", "lv-try-cat");
        b.type = "button";
        b.innerHTML = '<span class="lv-try-emoji">' + c.emoji + "</span>";
        // 方块上用短名，选中后输入框 / query 用完整名
        b.appendChild(el("span", null, c.short));
        b.onclick = function () {
          state.what = c.name;
          input.value = c.name;
          mark();
          refreshGo();
        };
        b._name = c.name;
        tiles.appendChild(b);
      });
      main.appendChild(tiles);
      body.appendChild(main);
      function mark() {
        [].forEach.call(tiles.children, function (b) {
          b.classList.toggle("is-on", b._name === state.what);
        });
      }
      input.oninput = function () {
        state.what = input.value;
        mark();
        refreshGo();
      };

      // 预算：大号金额 + 滑杆 + 常用档位
      var bd = el("div", "lv-bdg");
      var top = el("div", "lv-bdg-top");
      top.appendChild(el("div", "lv-cmp-label", "Your budget"));
      var amt = el("div", "lv-bdg-amt");
      top.appendChild(amt);
      bd.appendChild(top);
      var range = el("input", "lv-bdg-range");
      range.type = "range";
      range.min = "0";
      range.max = String(BUDGET_STEPS.length - 1);
      range.step = "1";
      bd.appendChild(range);
      var pre = pills(
        [25, 50, 100, 200, 500].map(function (v) {
          return [v, "$" + v];
        }),
        function (v) {
          return v === state.budget;
        },
        function (v) {
          setBudget(v);
        },
      );
      bd.appendChild(pre);
      body.appendChild(bd);
      function setBudget(v) {
        state.budget = v;
        amt.innerHTML = "<small>up to</small> $" + v;
        range.value = String(BUDGET_STEPS.indexOf(v));
        range.style.setProperty(
          "--p",
          (BUDGET_STEPS.indexOf(v) / (BUDGET_STEPS.length - 1)) * 100 + "%",
        );
        [].forEach.call(pre.children, function (x) {
          x.classList.toggle("is-on", x._val === v);
        });
      }
      range.oninput = function () {
        setBudget(BUDGET_STEPS[Number(range.value)]);
      };
      setBudget(state.budget);
      extraSection(
        body,
        "Anything to consider? e.g. must be waterproof (optional)",
        [
          radioChip(ICON.sort, "sort", [
            ["value", "Best value first"],
            ["low", "Cheapest first"],
          ]),
        ],
      );
    },
    ready: function () {
      return !!state.what.trim() && state.budget > 0;
    },
  };

  IDEAS.ui = {
    theme: "ideas",
    title: "Find shopping ideas",
    leftTitle: "Ideas worth giving",
    leftCopy:
      "Say who it's for and the occasion. Migoo mixes practical picks with fun surprises — all at good prices.",
    go: "Get ideas",
    opts: function () {
      return { budget: 0 };
    },
    init: function () {
      state.who = "";
      state.occasion = "birthday";
    },
    body: function (body) {
      body.appendChild(el("div", "lv-cmp-label", "Who's it for?"));
      var main = el("div", "lv-cmp-product lv-try-main");
      var grid = el("div", "lv-try-cats lv-try-who");
      WHO.forEach(function (w) {
        var b = el("button", "lv-try-cat");
        b.type = "button";
        b._val = w.key;
        b.innerHTML = '<span class="lv-try-emoji">' + w.emoji + "</span>";
        b.appendChild(el("span", null, w.short));
        b.onclick = function () {
          state.who = w.key;
          [].forEach.call(grid.children, function (x) {
            x.classList.toggle("is-on", x._val === state.who);
          });
          refreshGo();
        };
        grid.appendChild(b);
      });
      main.appendChild(grid);
      var occ = el("div", "lv-try-occ");
      occ.appendChild(el("span", "lv-try-occ-label", "Occasion"));
      occ.appendChild(
        pills(
          OCCASIONS,
          function (v) {
            return v === state.occasion;
          },
          function (v) {
            state.occasion = v;
          },
        ),
      );
      main.appendChild(occ);
      body.appendChild(main);
      extraSection(
        body,
        "Tell Migoo more, e.g. loves golf and coffee (optional)",
        [
          radioChip(ICON.wallet, "budget", [
            [0, "Any budget"],
            [25, "Under $25"],
            [50, "Under $50"],
            [100, "Under $100"],
            [200, "Under $200"],
          ]),
        ],
      );
    },
    ready: function () {
      return !!state.who;
    },
  };

  /* ---------- 弹窗外壳 ---------- */
  function refreshGo() {
    if (!modal) return;
    modal.querySelector(".lv-cmp-go").disabled = !state.kind.ui.ready();
  }
  function build(kind) {
    var ui = kind.ui;
    modal = el("div", "lv-cmp lv-try-" + ui.theme);
    modal.innerHTML =
      '<div class="lv-cmp-dialog" role="dialog" aria-modal="true">' +
      '<div class="lv-cmp-left"><div class="lv-cmp-art"></div><div class="lv-cmp-left-copy"><h3></h3><p></p></div></div>' +
      '<div class="lv-cmp-right"><button type="button" class="lv-cmp-close" aria-label="Close">' +
      svg(ICON.close) +
      '</button><h2></h2><div class="lv-try-body"></div><div class="lv-cmp-foot"><button type="button" class="lv-cmp-go" disabled>' +
      svg(ICON.spark) +
      "<span></span></button></div></div></div>";
    modal.querySelector(".lv-cmp-dialog").setAttribute("aria-label", ui.title);
    modal.querySelector(".lv-cmp-left-copy h3").textContent = ui.leftTitle;
    modal.querySelector(".lv-cmp-left-copy p").textContent = ui.leftCopy;
    modal.querySelector(".lv-cmp-right h2").textContent = ui.title;
    modal.querySelector(".lv-cmp-go span").textContent = ui.go;
    ART[ui.theme](modal.querySelector(".lv-cmp-art"));
    ui.body(modal.querySelector(".lv-try-body"));
    modal.querySelector(".lv-cmp-close").onclick = close;
    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
      else closeMenus();
    });
    modal.querySelector(".lv-cmp-go").onclick = submit;
    document.body.appendChild(modal);
  }
  function onKey(e) {
    if (e.key !== "Escape" || !modal) return;
    if (modal.querySelector(".lv-cmp-menu")) closeMenus();
    else close();
  }
  window.lvOpenTry = function (k) {
    var kind = KINDS[k];
    if (!kind || !S() || !S().products().length) return;
    if (modal) modal.remove();
    state = {
      kind: kind,
      product: null,
      photo: null,
      note: "",
      target: 0,
      targetTouched: false,
      opts: kind.ui.opts(),
    };
    if (kind.ui.init) kind.ui.init();
    build(kind);
    renderProduct();
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(function () {
      modal.classList.add("is-in");
      var input = modal.querySelector(".lv-cmp-link");
      if (input) input.focus();
    });
  };
  window.lvOpenCompare = function () {
    window.lvOpenTry("compare");
  };
  function close() {
    if (!modal) return;
    var m = modal;
    modal = null;
    document.removeEventListener("keydown", onKey);
    m.classList.remove("is-in");
    setTimeout(function () {
      m.remove();
    }, 220);
  }

  // 提交：要商品的项先把商品作为引用附件放进输入坞，再发 query（Daily Picks 输入坞 Enter 即发送并进会话页）
  function submit() {
    var kind = state.kind;
    if (!kind.ui.ready()) return;
    var text = kind.query(state);
    var p = state.product;
    var photo = state.photo;
    close();
    if (window.__lvClearQuotes) window.__lvClearQuotes();
    if (p && window.__lvAddQuote)
      window.__lvAddQuote({
        quoteSource: "try_this_" + kind.ui.theme,
        display: {
          title: photo ? "Product photo" : shortTitle(p.info.title),
          imageUrl: photo || p.info.image,
        },
        pdp: {
          locator: {
            source: p.store,
            region: "US",
            offerId: "cmp-" + (photo ? "photo-" : "") + p.id,
          },
        },
        status: "active",
      });
    setTimeout(function () {
      S().sendQuery(text);
    }, 80);
  }
})();
