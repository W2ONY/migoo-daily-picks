/*
 * 方案三 Daily Picks「清单合集」（版式参考 okiee-shopping-demo 的 Who are we shopping for? 卡片 + 清单 / 账单）：
 * - Explore：Price Drops 下方一组合集卡，每张卡 = 几件搭配好的商品（叠放的商品图）+ 主题 / 副标题 + 整单总价（划线 = 各件平时价之和）。
 * - 点卡片：发「Show me the {title} list」，右侧会话里回复一句引导语，下面：
 *     一个气泡：上面是清单（勾选框可以去掉某件，数量固定为 1、不能改），
 *     底部收着账单（件数小计 / 省下的钱 / 按门店估算的运费 / 预估总价 + Save my list）；
 *   气泡下方问一句推荐得对不对，再给三个追问（存清单 / 换便宜的 / 不太对）。
 * - 商品全部取自录制数据（window.lvShop.products()），「平时价」= 近 30 天最高价（没有降价的按现价）。
 * 依赖 categories.js 暴露的 window.lvShop；回复钩子包在 categories.js / try-this.js 的实现外面。
 */
(function () {
  function S() {
    return window.lvShop;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(v) {
    return "$" + v.toFixed(2);
  }
  function round(v) {
    return Math.round(v * 100) / 100;
  }

  var BUNDLES = [
    {
      key: "trip",
      tag: "For your next trip",
      title: "Weekend Getaway Kit",
      sub: "A carry-on, a pillow and a tote for lighter trips.",
      why: "you're tracking the Sweetcrispy luggage",
      tint: "#edf3f9",
      ids: [
        "100000021339696",
        "100000012074883",
        "100000024907809",
        "100000012515854",
      ],
    },
    {
      key: "snacks",
      tag: "Movie night",
      title: "Snack Night, Sorted",
      sub: "Chocolate, chewy candy and a pack of soda for a night in.",
      why: "you're tracking SNICKERS",
      tint: "#fbf0e8",
      ids: [
        "100000011542999",
        "100000020230786",
        "100000016414137",
        "100000012670902",
        "100000012409340",
      ],
    },
    {
      key: "home",
      tag: "Home refresh",
      title: "A Fresher Home",
      sub: "Fresh air filters, scent boosters and a laundry tote.",
      why: "you're tracking Filtrete air filters",
      tint: "#ecf5ef",
      ids: [
        "100000021417597",
        "100000021032564",
        "100000018452850",
        "100000021041660",
      ],
    },
    {
      key: "desk",
      tag: "Work from home",
      title: "Desk Day Upgrade",
      sub: "A sharper screen, a clear headset and a fast charger.",
      why: "you're tracking the BlueParrott headset",
      tint: "#f1eefa",
      ids: [
        "100000019554590",
        "100000022543333",
        "100000019552787",
        "100000024936210",
      ],
    },
  ];
  var FREE_SHIP = 35;
  var SHIP_FEE = 5.99;

  // 合集里的商品（录制数据里找不到的跳过）
  function itemsOf(b) {
    var byId = {};
    S()
      .products()
      .forEach(function (p) {
        byId[p.id] = p;
      });
    return b.ids
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);
  }
  // 便宜版：去掉最贵的那件
  function liteOf(items) {
    var top = items.slice().sort(function (a, b) {
      return b.price - a.price;
    })[0];
    return items.filter(function (p) {
      return p !== top;
    });
  }
  function usual(p) {
    return p.max || p.price;
  }
  // 账单：小计 / 平时价 / 按门店估运费（单店满 $35 免运费）
  function bill(items) {
    var total = 0;
    var was = 0;
    var stores = {};
    items.forEach(function (p) {
      total += p.price;
      was += usual(p);
      stores[p.store] = (stores[p.store] || 0) + p.price;
    });
    var ship = 0;
    Object.keys(stores).forEach(function (s) {
      if (stores[s] < FREE_SHIP) ship += SHIP_FEE;
    });
    total = round(total);
    return {
      count: items.length,
      total: total,
      was: round(was),
      save: round(was - total),
      stores: Object.keys(stores),
      ship: round(ship),
      grand: round(total + ship),
    };
  }
  function storesText(stores) {
    var n = stores.length;
    return n + (n === 1 ? " store" : " stores");
  }

  /* ---------- 文案（回复识别靠整句匹配，所以集中在这里） ---------- */
  function query(b) {
    return "Show me the " + b.title + " list";
  }
  function intro(b, items) {
    return (
      "Here's your " +
      b.title +
      " list: " +
      items.length +
      " items from " +
      storesText(bill(items).stores) +
      ", each at the best price I found today."
    );
  }
  function saveQuery(b) {
    return "Looks right, save my " + b.title + " list";
  }
  function cheaperQuery(b) {
    return "Swap in cheaper picks for " + b.title;
  }
  function cheaperIntro(b, lite, full) {
    return (
      "Here's a lighter " +
      b.title +
      " list: " +
      lite.length +
      " items, " +
      fmt(round(bill(full).grand - bill(lite).grand)) +
      " less in total, shipping included."
    );
  }
  var WRONG_TEXT = "Not quite right for me";
  function follows(b) {
    return [saveQuery(b), cheaperQuery(b), WRONG_TEXT];
  }

  /* ---------- Explore 上的合集卡 ---------- */
  var ICON_GO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var ICON_SPARK =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/></svg>';

  function bundleCard(b) {
    var items = itemsOf(b);
    if (items.length < 3) return null;
    var bl = bill(items);
    var c = el("div", "lv-bd-card");
    c.setAttribute("role", "button");
    c.tabIndex = 0;
    var media = el("div", "lv-bd-media");
    media.style.setProperty("--tint", b.tint);
    var tag = el("span", "lv-bd-tag");
    tag.innerHTML = ICON_SPARK;
    tag.appendChild(document.createTextNode(b.tag));
    media.appendChild(tag);
    items.slice(0, 3).forEach(function (p, i) {
      var f = el("span", "lv-bd-shot lv-bd-shot-" + i);
      var img = el("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = p.info.image;
      f.appendChild(img);
      media.appendChild(f);
    });
    if (items.length > 3)
      media.appendChild(el("span", "lv-bd-more", "+" + (items.length - 3)));
    c.appendChild(media);
    var body = el("div", "lv-bd-body");
    body.appendChild(el("h3", "lv-bd-title", b.title));
    body.appendChild(
      el("p", "lv-bd-sub", items.length + " useful things · " + b.sub),
    );
    var foot = el("div", "lv-bd-foot");
    var price = el("div", "lv-bd-price");
    var line = el("div", "lv-bd-price-line");
    line.appendChild(el("b", null, fmt(bl.total)));
    if (bl.save > 0.5) line.appendChild(el("s", null, fmt(bl.was)));
    price.appendChild(line);
    price.appendChild(
      el(
        "span",
        "lv-bd-note",
        (bl.save > 0.5 ? fmt(bl.save) + " below usual · " : "") +
          "Before shipping",
      ),
    );
    foot.appendChild(price);
    var go = el("span", "lv-bd-go");
    go.innerHTML = ICON_GO;
    foot.appendChild(go);
    body.appendChild(foot);
    c.appendChild(body);
    function open() {
      S().sendQuery(query(b));
    }
    c.onclick = open;
    c.onkeydown = function (e) {
      if (e.key === "Enter") open();
    };
    return c;
  }

  // categories.js 在 Price Drops 后面调用
  window.lvBuildBundles = function () {
    if (!S()) return null;
    var row = el("div", "lv-bd-row");
    BUNDLES.forEach(function (b) {
      var c = bundleCard(b);
      if (c) row.appendChild(c);
    });
    if (!row.children.length) return null;
    var box = el("section", "lv-bd");
    var head = el("div", "lv-ob-head lv-bd-head");
    var h = el("h2", "lv-ob-title lv-bd-heading");
    h.innerHTML = "Shop the <em>whole list</em>";
    head.appendChild(h);
    head.appendChild(
      el(
        "p",
        "lv-ob-sub",
        "A few things that work better together, priced as one order.",
      ),
    );
    box.appendChild(head);
    box.appendChild(row);
    return box;
  };

  /* ---------- 会话里的清单气泡：上面是商品清单，底部收着账单 ---------- */
  function listBubble(b, items, onChange) {
    var box = el("div", "lv-bd-bubble lv-bd-list");
    var head = el("div", "lv-bd-bubble-head");
    head.appendChild(el("b", null, b.title));
    head.appendChild(
      el("span", null, items.length + " items · qty fixed at 1 each"),
    );
    box.appendChild(head);
    items.forEach(function (p) {
      var row = el("label", "lv-bd-item");
      var cb = el("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.onchange = function () {
        row.classList.toggle("is-off", !cb.checked);
        onChange(p, cb.checked);
      };
      row.appendChild(cb);
      var thumb = el("span", "lv-bd-thumb");
      var img = el("img");
      img.alt = "";
      img.src = p.info.image;
      thumb.appendChild(img);
      row.appendChild(thumb);
      var main = el("span", "lv-bd-item-main");
      var name = el("span", "lv-bd-item-name", p.info.title);
      name.title = "See details";
      // 点商品名看详情；点行的其他地方是勾选
      name.onclick = function (e) {
        e.preventDefault();
        S().openPdp(p);
      };
      main.appendChild(name);
      main.appendChild(
        el(
          "span",
          "lv-bd-item-meta",
          S().storeName(p.store) + " · " + fmt(p.price) + " each",
        ),
      );
      row.appendChild(main);
      row.appendChild(el("span", "lv-bd-qty", "×1"));
      var pr = el("span", "lv-bd-item-price");
      pr.appendChild(el("b", null, fmt(p.price)));
      if (p.max) pr.appendChild(el("s", null, fmt(p.max)));
      row.appendChild(pr);
      box.appendChild(row);
    });
    return box;
  }
  // 账单收在同一个气泡底部，按小票排：左标签 / 右金额的明细行 → 分隔线 → 预估总价 → 说明小字 + Save my list
  function billFooter(b) {
    var box = el("div", "lv-bd-bill");
    var rows = el("div", "lv-bd-bill-rows");
    box.appendChild(rows);
    var total = el("div", "lv-bd-bill-total");
    box.appendChild(total);
    var foot = el("div", "lv-bd-bill-foot");
    var fine = el("p", "lv-bd-fine");
    foot.appendChild(fine);
    var save = el("button", "lv-bd-save", "Save my list");
    save.type = "button";
    save.onclick = function () {
      if (window.lvSendInChat) window.lvSendInChat(saveQuery(b));
    };
    foot.appendChild(save);
    box.appendChild(foot);
    function row(label, value, cls) {
      var r = el("div", "lv-bd-bill-row" + (cls ? " " + cls : ""));
      r.appendChild(el("span", null, label));
      r.appendChild(el("b", null, value));
      rows.appendChild(r);
    }
    box.update = function (items) {
      var bl = bill(items);
      rows.textContent = "";
      total.textContent = "";
      row("Subtotal (" + bl.count + (bl.count === 1 ? " item)" : " items)"), fmt(bl.total));
      if (bl.save > 0.5) row("You save vs usual", "−" + fmt(bl.save), "is-save");
      row("Shipping", bl.count ? (bl.ship ? fmt(bl.ship) : "Free") : "—");
      total.appendChild(el("span", null, "Estimated total"));
      total.appendChild(el("b", null, fmt(bl.grand)));
      fine.textContent = bl.count
        ? "From " +
          bl.stores.map(S().storeName).join(" · ") +
          " · Free shipping over $" +
          FREE_SHIP +
          " per store · Tax not included"
        : "Tick at least one item to see the total.";
      save.disabled = !bl.count;
    };
    return box;
  }
  function bundleBlock(b, items) {
    var wrap = el("div", "lv-bd-chat");
    var picked = items.slice();
    var billBox = billFooter(b);
    var bubble = listBubble(b, items, function (p, on) {
      picked = items.filter(function (x) {
        return x === p ? on : picked.indexOf(x) >= 0;
      });
      billBox.update(picked);
    });
    billBox.update(picked);
    bubble.appendChild(billBox);
    wrap.appendChild(bubble);
    wrap.appendChild(
      el(
        "p",
        "lv-bd-ask",
        "Does this look right? I put it together because " +
          b.why +
          ". Untick anything you already have, or tell me what to change.",
      ),
    );
    return wrap;
  }

  /* ---------- 回复钩子 ---------- */
  function textBlock(s) {
    return { type: "text", payload: { content: s } };
  }
  function byTitle(re, text) {
    var m = re.exec(text);
    if (!m) return null;
    return BUNDLES.filter(function (b) {
      return b.title === m[1];
    })[0];
  }

  var prevCards = window.lvCollectionForText;
  window.lvCollectionForText = function (text) {
    var t = (text || "").trim();
    if (S())
      for (var i = 0; i < BUNDLES.length; i++) {
        var b = BUNDLES[i];
        var items = itemsOf(b);
        if (items.length < 3) continue;
        if (t === intro(b, items))
          return {
            title: b.title,
            items: [],
            followUps: follows(b),
            render: bundleBlock.bind(null, b, items),
          };
        var lite = liteOf(items);
        if (t === cheaperIntro(b, lite, items))
          return {
            title: b.title,
            items: [],
            followUps: [saveQuery(b), WRONG_TEXT],
            render: bundleBlock.bind(null, b, lite),
          };
      }
    return prevCards ? prevCards(text) : null;
  };

  var prevReply = window.mockReplyFor;
  window.mockReplyFor = function (text, frame) {
    var t = (text || "").trim();
    if (S()) {
      for (var i = 0; i < BUNDLES.length; i++) {
        var b = BUNDLES[i];
        if (t === query(b)) return [textBlock(intro(b, itemsOf(b)))];
      }
      var b2 = byTitle(/^Looks right, save my (.+) list$/, t);
      if (b2) {
        var bl = bill(itemsOf(b2));
        return [
          textBlock(
            "Saved! Your **" +
              b2.title +
              "** list is in Favorites. I'll keep an eye on all " +
              bl.count +
              " prices and message you here if the total drops below " +
              fmt(bl.total) +
              ".",
          ),
        ];
      }
      var b3 = byTitle(/^Swap in cheaper picks for (.+)$/, t);
      if (b3) {
        var full = itemsOf(b3);
        return [textBlock(cheaperIntro(b3, liteOf(full), full))];
      }
      if (t === WRONG_TEXT)
        return [
          textBlock(
            "Thanks for telling me. What should I change?\n\n- **Who it's for** or the occasion\n- **A budget** to stay under\n- **Stores** you prefer, or things you already have\n\nTell me in a few words and I'll rebuild the list.",
          ),
        ];
    }
    return prevReply ? prevReply(text, frame) : null;
  };

  var prevThinking = window.lvThinkingFor;
  window.lvThinkingFor = function (text) {
    var t = (text || "").trim();
    for (var i = 0; i < BUNDLES.length; i++) {
      var b = BUNDLES[i];
      if (t === query(b))
        return [
          "Pulling together your " + b.title + " list…",
          "Checking each item's best price…",
          "Adding it all up…",
        ];
      if (t === cheaperQuery(b))
        return ["Looking for a lighter version…", "Re-adding the total…"];
      if (t === saveQuery(b))
        return ["Saving your list…", "Setting up price watch…"];
    }
    if (t === WRONG_TEXT) return ["Thinking…"];
    return prevThinking ? prevThinking(text) : ["Thinking…"];
  };
})();
