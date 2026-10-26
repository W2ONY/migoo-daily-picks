/*
 * 方案四：信息流上方的低价主题合集卡（版式参考 daydream.ing 首页的「What are you shopping for?」），
 * 下方原信息流加「Browse」标题。
 * - 合集商品全部取自录制数据：recommend 分页里的商品 + pdp/info 的近 30 天价格曲线（算降幅）、门店、评分。
 *   Walmart 优惠券是按商品 id 确定性生成的 mock（原数据没有券信息），每次打开都一样。
 * - 点合集卡：往输入坞写入该合集的 query 并回车发送，走原页面发送流程跳到 Chat。
 * - 本地回复（window.mockReplyFor，mock-api 的假 socket 调用）：
 *     合集 query → 一句引导语；local/chat-cards.js 按引导语（window.lvCollectionForText）在下方渲染商品卡 + 追问
 *     追问「Only show … under $50」→ 同合集筛选后的商品卡；「Set price alerts …」→ 文字确认；
 *     卡片下方 Compare → Markdown 对比表。
 */
(function () {
  var root = document.documentElement;
  var section = null;
  var cache = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function on() {
    return root.hasAttribute("data-lv-cats");
  }
  function money(v) {
    return Math.round(v * 100) / 100;
  }
  function fmt(v) {
    return "$" + v.toFixed(2);
  }
  // 由商品 id 得到稳定的伪随机数（mock 券面额 / 券码用，保证每次一样）
  function seeded(id, n) {
    var h = 0;
    String(id)
      .split("")
      .forEach(function (c) {
        h = (h * 31 + c.charCodeAt(0)) >>> 0;
      });
    return h % n;
  }

  /* ---------- 商品池：recommend 商品 + pdp/info ---------- */
  function products() {
    if (cache) return cache;
    if (!window.mockAll) return [];
    var pdp = {};
    window.mockAll("POST /beeai/api/v1/pdp/info").forEach(function (r) {
      if (r && r.cspu_id) pdp[String(r.cspu_id)] = r;
    });
    var seen = {};
    var list = [];
    window
      .mockAll("POST /beeai/api/v1/ecommerce/recommend")
      .forEach(function (res) {
        ((res && res.cards) || []).forEach(function (card) {
          (card.cspu_infos || []).forEach(function (cs) {
            var info = cs.offer_info;
            var id = String(cs.cspu_id);
            if (!info || !info.image || seen[id]) return;
            seen[id] = true;
            var p = pdp[id] || {};
            var chart =
              (p.cheapest_info &&
                p.cheapest_info.chart &&
                p.cheapest_info.chart.price_list) ||
              [];
            var price = money(info.price / 100000);
            var max = money(
              Math.max.apply(null, [0].concat(chart.map(Number))) / 100000,
            );
            var drop =
              max > price * 1.03 ? Math.round(((max - price) / max) * 100) : 0;
            var reason =
              (info.rcmd_reason_rich && info.rcmd_reason_rich.content) || "";
            list.push({
              cs: cs,
              id: id,
              info: info,
              store: info.source,
              price: price,
              max: drop ? max : 0,
              drop: drop,
              lowest30:
                /cheapest in 30 days/i.test(reason) ||
                !!(
                  p.cheapest_info &&
                  /cheapest in 30 days/i.test(p.cheapest_info.content || "")
                ),
              buybox: info.buybox_id,
              chart: chart.map(function (v) {
                return Number(v) / 100000;
              }),
            });
          });
        });
      });
    cache = list;
    return list;
  }
  function byDrop(a, b) {
    return b.drop - a.drop || b.price - a.price;
  }
  function likedIds() {
    try {
      return Object.keys(
        JSON.parse(localStorage.getItem("mock:likes") || "{}"),
      );
    } catch (e) {
      return [];
    }
  }

  /* ---------- 低价主题合集 ---------- */
  var COLLECTIONS = [
    {
      key: "amazon-drops",
      thinking: ["Scanning Amazon price history…", "Comparing against 30-day highs…", "Ranking the biggest drops…"],
      title: "Amazon's Top 10 Price Drops",
      c1: "#2f3a4f",
      c2: "#1c2433",
      query: "Show me Amazon's top 10 biggest price drops",
      pick: function (P) {
        return P.filter(function (p) {
          return p.store === "amazon" && p.drop;
        })
          .sort(byDrop)
          .slice(0, 10);
      },
      eyebrow: function (items) {
        return "Amazon · up to " + (items[0] ? items[0].drop : 0) + "% off";
      },
      intro: function (items) {
        return (
          "Here are Amazon's " +
          items.length +
          " biggest price drops right now, up to " +
          (items[0] ? items[0].drop : 0) +
          "% below their 30-day high"
        );
      },
      badge: function (p, i) {
        return (i === 0 ? "#1 Biggest Drop · " : "") + "−" + p.drop + "%";
      },
    },
    {
      key: "watched",
      thinking: ["Checking your watchlist…", "Comparing today's prices with when you saved…", "Picking the biggest drops…"],
      title: "5 Price Drops You're Watching",
      c1: "#4f6b58",
      c2: "#33493b",
      query: "Which of the items I'm watching dropped in price?",
      // 「最近关注」= Favorites 里有降价的商品，不足 5 件用全站降幅最大的补齐（mock 关注列表）
      pick: function (P) {
        var liked = likedIds();
        var drops = P.filter(function (p) {
          return p.drop && p.store !== "amazon";
        }).sort(byDrop);
        var mine = drops.filter(function (p) {
          return liked.indexOf(p.buybox) >= 0;
        });
        return mine
          .concat(
            drops.filter(function (p) {
              return mine.indexOf(p) < 0;
            }),
          )
          .slice(0, 5);
      },
      eyebrow: function () {
        return "Your watchlist";
      },
      intro: function (items) {
        return (
          "Good news — " +
          items.length +
          " items you're watching just dropped in price"
        );
      },
      badge: function (p) {
        return "↓ " + fmt(p.max - p.price) + " since you saved";
      },
    },
    {
      key: "walmart-coupons",
      thinking: ["Searching Walmart for clip coupons…", "Checking promo codes and Walmart Cash…", "Stacking the best savings…"],
      title: "Hidden Walmart Coupons",
      c1: "#3a6ea8",
      c2: "#24507f",
      query: "Find hidden coupons on Walmart for me",
      pick: function (P) {
        return P.filter(function (p) {
          return p.store === "walmart" && p.price >= 8;
        })
          .sort(function (a, b) {
            return b.price - a.price;
          })
          .slice(0, 8)
          .map(function (p) {
            var kinds = ["clip", "code", "cash"];
            var kind = kinds[seeded(p.id, 3)];
            var rate = [0.08, 0.1, 0.12, 0.15, 0.2][seeded(p.id + "r", 5)];
            var off = Math.max(1, Math.round(p.price * rate));
            return Object.assign({}, p, {
              coupon: {
                kind: kind,
                off: off,
                code: kind === "code" ? "SAVE" + off + "NOW" : "",
                label:
                  kind === "clip"
                    ? "Clip coupon: $" + off + " off"
                    : kind === "code"
                      ? "Promo code: $" + off + " off"
                      : "$" + off + " Walmart Cash back",
              },
            });
          });
      },
      eyebrow: function (items) {
        var total = items.reduce(function (s, p) {
          return s + p.coupon.off;
        }, 0);
        return "Walmart · $" + total + " in coupons";
      },
      intro: function (items) {
        return (
          "I found " +
          items.length +
          " hidden coupons on Walmart that most shoppers miss"
        );
      },
      badge: function (p) {
        return p.coupon.kind === "cash"
          ? "Walmart Cash"
          : p.coupon.kind === "code"
            ? "Promo Code"
            : "Clip Coupon";
      },
    },
    {
      key: "month-drops",
      thinking: ["Scanning prices across all stores…", "Measuring drops vs. 30-day highs…", "Ranking this month's biggest drops…"],
      title: "Biggest Drops This Month",
      c1: "#b5603f",
      c2: "#8f3f27",
      query: "What are the biggest price drops this month?",
      pick: function (P) {
        return P.filter(function (p) {
          return p.drop;
        })
          .sort(byDrop)
          .slice(0, 8);
      },
      eyebrow: function (items) {
        return "All stores · up to " + (items[0] ? items[0].drop : 0) + "% off";
      },
      intro: function (items) {
        return (
          "These " +
          items.length +
          " products had the biggest price drops across all stores this month"
        );
      },
      badge: function (p) {
        return "−" + p.drop + "% this month";
      },
    },
    {
      key: "lowest30",
      thinking: ["Pulling 30-day price history…", "Finding products at their lowest price…", "Sorting by savings…"],
      title: "Lowest Price in 30 Days",
      c1: "#a8873f",
      c2: "#7d6226",
      query: "Show me products at their lowest price in 30 days",
      pick: function (P) {
        return P.filter(function (p) {
          return p.lowest30;
        })
          .sort(byDrop)
          .slice(0, 8);
      },
      eyebrow: function () {
        return "Price tracker";
      },
      intro: function (items) {
        return (
          "Right now these " +
          items.length +
          " products are at their lowest price in 30 days"
        );
      },
      badge: function () {
        return "Lowest in 30 Days";
      },
    },
    {
      key: "under20",
      thinking: ["Searching products under $20…", "Filtering out low-rated picks…", "Ranking the best steals…"],
      title: "Best Steals Under $20",
      c1: "#c8a593",
      c2: "#a87f6b",
      query: "Find me the best steals under $20",
      pick: function (P) {
        return P.filter(function (p) {
          return p.price < 20;
        })
          .sort(byDrop)
          .slice(0, 8);
      },
      eyebrow: function () {
        return "Steals";
      },
      intro: function (items) {
        return (
          "Here are " + items.length + " of the best steals under $20 today"
        );
      },
      badge: function (p) {
        return p.drop ? "Under $20 · −" + p.drop + "%" : "Under $20";
      },
    },
    {
      key: "bestbuy",
      thinking: ["Scanning Best Buy tech deals…", "Comparing with other stores…", "Picking the best deals…"],
      title: "Tech Deals at Best Buy",
      c1: "#4a6d96",
      c2: "#2f4d73",
      query: "Show me the best tech deals at Best Buy",
      pick: function (P) {
        return P.filter(function (p) {
          return p.store === "bestbuy";
        })
          .sort(byDrop)
          .slice(0, 8);
      },
      eyebrow: function (items) {
        return "Best Buy · " + items.length + " deals";
      },
      intro: function (items) {
        return (
          "Here are the " +
          items.length +
          " best tech deals at Best Buy right now"
        );
      },
      badge: function (p, i) {
        return p.drop
          ? "−" + p.drop + "% at Best Buy"
          : i === 0
            ? "Best Buy Pick"
            : "";
      },
    },
    {
      key: "costco",
      thinking: ["Checking Costco member prices…", "Comparing per-unit cost with other stores…", "Picking the best bulk buys…"],
      title: "Costco Bulk Buys",
      c1: "#6b3b4b",
      c2: "#4a2432",
      query: "What are the best bulk-buy deals at Costco?",
      pick: function (P) {
        return P.filter(function (p) {
          return p.store === "costco";
        })
          .sort(byDrop)
          .slice(0, 8);
      },
      eyebrow: function (items) {
        return "Costco · " + items.length + " member picks";
      },
      intro: function (items) {
        return "Here are " + items.length + " Costco bulk buys worth stocking up on";
      },
      badge: function (p, i) {
        return p.drop ? "−" + p.drop + "% at Costco" : i === 0 ? "Member Favorite" : "Bulk Value";
      },
    },
  ];
  var FOLLOW_UNDER = 50;

  function itemsOf(c) {
    return c.pick(products()).map(function (p, i) {
      return Object.assign({}, p, { badge: c.badge(p, i) });
    });
  }
  // 追问：「只看 $50 以下」仅在合集里确实有 $50 以下商品时才给
  function followUps(c, items) {
    var hasUnder = items.some(function (p) {
      return p.price < FOLLOW_UNDER;
    });
    return (hasUnder ? [underQuery(c)] : []).concat([alertQuery(c)]);
  }
  function underQuery(c) {
    return "Only show " + c.title + " under $" + FOLLOW_UNDER;
  }
  function alertQuery(c) {
    return "Set price alerts for " + c.title;
  }
  var STORE_NAMES = {
    amazon: "Amazon",
    walmart: "Walmart",
    bestbuy: "Best Buy",
    ebay: "eBay",
    target: "Target",
    costco: "Costco",
    homedepot: "The Home Depot",
    nordstrom: "Nordstrom",
    quince: "Quince",
    dickssportinggoods: "Dick's",
    kroger: "Kroger",
    rei: "REI",
    llbean: "L.L.Bean",
    wayfair: "Wayfair",
    chewy: "Chewy",
  };
  function storeName(s) {
    return STORE_NAMES[s] || s || "";
  }

  // 给 chat-cards.js：一句回复 → 要渲染的合集商品（引导语或「under $50」筛选后的引导语）
  window.lvCollectionForText = function (text) {
    text = (text || "").trim();
    if (text === moreDealsIntro(moreDeals())) return { title: "More good prices", items: [], followUps: [], render: dealsBlock };
    if (text === moreCouponsIntro()) return { title: "More good savings", items: [], followUps: [], render: couponsBlock };
    var coupons = allCoupons();
    for (var k = 0; k < coupons.length; k++) {
      if (text === couponIntro(coupons[k])) {
        var cp = coupons[k];
        return {
          title: storeName(cp.store) + " coupon deals",
          items: couponItems(cp),
          followUps: [],
          // 商品卡上方先亮出领到的券（完整券码）
          lead: function () {
            var card = couponCard(cp, true);
            var t = card.querySelector(".lv-coupon-timer");
            var tick = setInterval(function () {
              if (!card.isConnected) return clearInterval(tick);
              t._label.textContent = countdown(t._hours);
            }, 1000);
            return card;
          },
        };
      }
    }
    for (var i = 0; i < COLLECTIONS.length; i++) {
      var c = COLLECTIONS[i];
      var items = itemsOf(c);
      if (text === c.intro(items))
        return { title: c.title, items: items, followUps: followUps(c, items) };
      var under = items.filter(function (p) {
        return p.price < FOLLOW_UNDER;
      });
      if (under.length && text === underIntro(c, under))
        return { title: c.title, items: under, followUps: [alertQuery(c)] };
    }
    return null;
  };
  function underIntro(c, under) {
    return (
      "Here are the " +
      under.length +
      " picks from " +
      c.title +
      " under $" +
      FOLLOW_UNDER
    );
  }

  /* ---------- 「思考」动画的步骤文案与回复延迟（chat-cards.js / mock-api 调用） ---------- */
  window.lvThinkingFor = function (text) {
    text = (text || "").trim();
    if (text === CLAIM_TEXT || couponByClaimText(text)) return ["Claiming your coupon…", "Checking which items it works on…", "Applying it at checkout…"];
    if (text === MORE_DEALS_TEXT) return ["Scanning price history across stores…", "Picking the biggest drops…"];
    if (text === MORE_COUPONS_TEXT) return ["Checking stores for live coupons…", "Keeping the ones you can use…"];
    for (var i = 0; i < COLLECTIONS.length; i++) {
      var c = COLLECTIONS[i];
      if (text === c.query) return c.thinking;
      if (text === underQuery(c)) return ["Filtering " + c.title + " under $" + FOLLOW_UNDER + "…", "Re-ranking by savings…"];
      if (text === alertQuery(c)) return ["Setting up price alerts…", "Saving them to Auto-task…"];
    }
    if (/^Compare these \d+ /.test(text)) return ["Lining up prices and deals…", "Building a side-by-side comparison…"];
    return ["Thinking…"];
  };
  window.mockReplyDelay = function (text) {
    var steps = window.lvThinkingFor(text);
    // 进 Chat 页、用户气泡渲染出来大约要 1.6s，之后思考气泡每步停 0.9s
    return steps.length > 1 ? 1700 + steps.length * 900 : 1800;
  };

  /* ---------- 输入框 placeholder 轮播文案（variants.js 调用） ----------
   * 五类短句交替出现：降幅（−63%）、券（Coupon）、30 天最低（30-day low）、提问引导（Try）、降价（Price drop）。
   * 商品名统一截短：取逗号 / 破折号前的部分，再按整词截到 26 个字符以内。 */
  var TRY_PROMPTS = [
    "Find a carry-on under $50",
    "Is now a good time to buy a TV mount?",
    "Compare air filter prices across stores",
    "Track price drops on PS5 games",
    "Cheapest place to buy LG monitors?",
  ];
  // 截短：逗号 / 破折号前的部分，再按整词截到 26 个字符以内（不在单词中间断开）
  function phName(title) {
    var s = shortTitle(title || "").trim();
    if (s.length <= 26) return s;
    var out = "";
    s.split(/\s+/).some(function (w) {
      if ((out + " " + w).trim().length > 26) return true;
      out = (out + " " + w).trim();
      return false;
    });
    return out || s.slice(0, 26);
  }

  window.lvPlaceholderLines = function () {
    var P = products();
    if (!P.length) return [];
    var drops = P.filter(function (p) {
      return p.drop;
    }).sort(byDrop);
    var used = {};
    function take(list, n) {
      var out = [];
      list.forEach(function (p) {
        if (out.length < n && !used[p.id]) {
          used[p.id] = true;
          out.push(p);
        }
      });
      return out;
    }
    var pct = take(drops, 4).map(function (p) {
      return { kind: "pct", tag: "−" + p.drop + "%", text: phName(p.info.title), price: fmt(p.price) };
    });
    var low = take(
      P.filter(function (p) {
        return p.lowest30;
      }),
      3,
    ).map(function (p) {
      return { kind: "low", tag: "30-day low", text: phName(p.info.title), price: fmt(p.price) };
    });
    var drop = take(drops, 3).map(function (p) {
      return { kind: "drop", tag: "Price drop", text: phName(p.info.title), price: fmt(p.price) };
    });
    var coupon = COUPONS.slice(0, 4).map(function (c) {
      return { kind: "coupon", tag: "Coupon", text: c.big + " off at " + storeName(c.store), price: c.code };
    });
    var ask = TRY_PROMPTS.map(function (q) {
      return { kind: "try", tag: "Try", text: q, price: "" };
    });
    var groups = [pct, coupon, low, ask, drop];
    var lines = [];
    for (var i = 0; lines.length < 16 && i < 8; i++)
      groups.forEach(function (g) {
        if (g[i]) lines.push(g[i]);
      });
    return lines;
  };

  /* ---------- 本地回复 ---------- */
  function textBlock(s) {
    return { type: "text", payload: { content: s } };
  }
  window.mockReplyFor = function (text, frame) {
    text = (text || "").trim();
    var c, items, m;
    if (text === MORE_DEALS_TEXT)
      return [
        textBlock(moreDealsIntro(moreDeals())),
        textBlock("Each price is compared with the item's 30-day high. Tap a card to see its full price history."),
      ];
    if (text === MORE_COUPONS_TEXT)
      return [textBlock(moreCouponsIntro()), textBlock("Tap **Claim now** on any of them and I'll apply it at checkout.")];
    if (text === CLAIM_TEXT || couponByClaimText(text)) {
      var cp = couponByClaimText(text) || (frame && couponFromFrame(frame));
      if (!cp) return [textBlock("Which coupon would you like to claim? Tap Claim now on a coupon in Big Savings.")];
      return [
        textBlock(couponIntro(cp)),
        textBlock("Saved to your account: " + cp.desc + ". It applies automatically at checkout, no need to copy the code."),
      ];
    }
    for (var i = 0; i < COLLECTIONS.length; i++) {
      c = COLLECTIONS[i];
      items = itemsOf(c);
      if (text === c.query) return [textBlock(c.intro(items))];
      if (text === underQuery(c)) {
        var under = items.filter(function (p) {
          return p.price < FOLLOW_UNDER;
        });
        if (!under.length)
          return [
            textBlock(
              "None of the " +
                c.title +
                " are under $" +
                FOLLOW_UNDER +
                " right now — the cheapest is " +
                fmt(
                  Math.min.apply(
                    null,
                    items.map(function (p) {
                      return p.price;
                    }),
                  ),
                ) +
                ".",
            ),
          ];
        return [textBlock(underIntro(c, under))];
      }
      if (text === alertQuery(c))
        return [
          textBlock(
            "Done! I'm now tracking all " +
              items.length +
              " items from **" +
              c.title +
              "**. I'll message you here the moment any of them drops below today's price.\n\nYou can see and edit these alerts anytime under **Auto-task**.",
          ),
        ];
    }
    // 卡片下方的 Compare：Markdown 对比表
    m = /^Compare these (\d+) (.+) picks side by side$/.exec(text);
    if (m) {
      c = COLLECTIONS.filter(function (x) {
        return x.title === m[2];
      })[0];
      if (!c) return null;
      items = itemsOf(c).slice(0, Number(m[1]));
      var rows = items.map(function (p) {
        var name =
          p.info.title.length > 48
            ? p.info.title.slice(0, 46) + "…"
            : p.info.title;
        var deal = p.coupon
          ? p.coupon.label
          : p.drop
            ? "−" + p.drop + "% vs 30-day high"
            : "—";
        return (
          "| " +
          name.replace(/\|/g, "/") +
          " | " +
          fmt(p.price) +
          " | " +
          (p.max ? fmt(p.max) : "—") +
          " | " +
          deal +
          " | " +
          storeName(p.store) +
          " |"
        );
      });
      var best = items.slice().sort(byDrop)[0];
      return [
        textBlock(
          "Here's how the " +
            c.title +
            " compare:\n\n| Product | Now | 30-day high | Deal | Store |\n|---|---|---|---|---|\n" +
            rows.join("\n") +
            (best && best.drop
              ? "\n\n**Best value:** " +
                best.info.title.split(",")[0] +
                " — " +
                best.drop +
                "% below its 30-day high."
              : ""),
        ),
      ];
    }
    return null;
  };

  /* ---------- 合集卡 ---------- */
  function sendQuery(text) {
    var layer = document.querySelector('[class*="_dockLayer_"]');
    var editor = layer && layer.querySelector(".ProseMirror");
    // 会话页（如在回复里的券卡上点 Claim now）没有 Daily Picks 输入坞，用会话输入框
    if (!editor) {
      var all = document.querySelectorAll(".ProseMirror");
      editor = all[all.length - 1];
      layer = null;
    }
    if (!editor) return;
    // 代发 query 时把 Daily Picks 输入坞整个藏起来：展开 / 填字 / 回车的过程不让用户看到，直接切到会话页
    if (layer) {
      root.setAttribute("data-lv-sending", "");
      clearTimeout(sendQuery._t);
      sendQuery._t = setTimeout(function () {
        root.removeAttribute("data-lv-sending");
      }, 2500);
    }
    // 输入坞收成胶囊时编辑器是隐藏的、聚焦不了：先展开再输入
    var wait = 0;
    if (layer && layer.hasAttribute("data-lv-compact")) {
      layer.removeAttribute("data-lv-compact");
      wait = 120;
    }
    setTimeout(function () {
      editor.focus();
      document.execCommand("selectAll", false);
      document.execCommand("insertText", false, text);
      // 等编辑器把输入同步进状态后再回车发送（原页面 Enter 即发送）
      setTimeout(function () {
        editor.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }),
        );
      }, 60);
    }, wait);
  }


  function collectionCard(c) {
    var items = itemsOf(c);
    if (items.length < 3) return null;
    var b = el("button", "lv-cat");
    b.type = "button";
    b.style.setProperty("--c1", c.c1);
    b.style.setProperty("--c2", c.c2);
    b.appendChild(el("span", "lv-cat-eyebrow", c.eyebrow(items)));
    b.appendChild(el("span", "lv-cat-title", c.title));
    var stack = el("span", "lv-cat-stack");
    [1, 2, 0].forEach(function (idx, pos) {
      var p = items[idx] || items[0];
      var frame = el(
        "span",
        "lv-cat-img lv-cat-img-" + ["left", "right", "front"][pos],
      );
      var img = el("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = p.info.image;
      frame.appendChild(img);
      if (pos === 2 && (p.drop || p.coupon))
        frame.appendChild(
          el(
            "span",
            "lv-cat-tag",
            p.coupon ? "−$" + p.coupon.off : "−" + p.drop + "%",
          ),
        );
      stack.appendChild(frame);
    });
    b.appendChild(stack);
    b.onclick = function () {
      sendQuery(c.query);
    };
    return b;
  }

  /* ---------- Price drop tracker（卡片版式参考 dupe.com/steals） ---------- */
  var TRACKER_SIZE = 12;
  // 30 天价格曲线 → 迷你折线（末端打点）
  function sparkline(values) {
    var w = 96;
    var h = 26;
    var pts = values.length > 1 ? values : [values[0] || 0, values[0] || 0];
    var min = Math.min.apply(null, pts);
    var max = Math.max.apply(null, pts);
    var span = max - min || 1;
    var xy = pts.map(function (v, i) {
      return [(i / (pts.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / span) * (h - 6)];
    });
    var d = xy
      .map(function (p, i) {
        return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
      })
      .join(" ");
    var last = xy[xy.length - 1];
    return (
      '<svg class="lv-steal-spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMinYMid meet" aria-hidden="true">' +
      '<path d="' + d + '"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3"/></svg>'
    );
  }
  function shortTitle(t) {
    var cut = t.search(/,| - | \| /);
    return cut > 12 ? t.slice(0, cut) : t;
  }
  function openPdpFor(p) {
    markViewed(p.id);
    // 直接进会话页时 Daily Picks 模块（暴露 openPdp 的 local-patch）还没加载，按需 import 一次
    var ready = window.__lvOpenPdp ? Promise.resolve() : import((window.LV_BASE || "") + "/migoo-daily-picks/assets/js/index-B8tGR6gk.js");
    ready.then(function () {
      if (window.__lvOpenPdp) window.__lvOpenPdp({ offerId: p.info.offer_id, cspuId: p.id, region: p.info.region || "US", productId: p.id });
    });
  }
  // 卡片与用户的关系：Saved = 真实收藏（mock:likes）；Viewed = 在这里点开过详情（local:viewed，本地记录）；
  // 没有历史时按商品 id 确定性地 mock 一部分 Watching / Viewed，保证多数卡片都有标签；都不是就不显示
  var REL_ICONS = {
    liked: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.5 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" fill="currentColor"/></svg>',
    tracking:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    viewed:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  };
  function viewedIds() {
    try {
      return JSON.parse(localStorage.getItem("local:viewed") || "[]");
    } catch (e) {
      return [];
    }
  }
  function markViewed(id) {
    var list = viewedIds().filter(function (x) {
      return x !== id;
    });
    list.unshift(id);
    try {
      localStorage.setItem("local:viewed", JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
  }
  // 每张卡都有关系标签：前 4 张固定 Tracking（蓝色实底，最显眼）；其余按真实收藏 / 浏览，没有就按 id 播种三选一
  function relationOf(p, i) {
    var tracking = { kind: "tracking", label: "Tracking" };
    if (i < 4) return tracking;
    if (likedIds().indexOf(p.buybox) >= 0) return { kind: "liked", label: "Liked" };
    if (viewedIds().indexOf(p.id) >= 0) return { kind: "viewed", label: "Viewed" };
    return [tracking, { kind: "liked", label: "Liked" }, { kind: "viewed", label: "Viewed" }][seeded(p.id + "rel", 3)];
  }

  // Price Drops 卡：电商大卡样式（整幅商品图 + 关系标签 / 一行标题 / 卖点 / 价格），保留 30 天价格走势线
  function stealCard(p, i, total) {
    var b = el("div", "lv-steal");
    b.setAttribute("role", "button");
    b.tabIndex = 0;
    var media = el("span", "lv-steal-img");
    var img = el("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = p.info.image;
    media.appendChild(img);
    b.appendChild(media);
    var body = el("span", "lv-steal-body");
    // 关系标签（Tracking / Liked / Viewed）放在图下、标题上方
    var rel = relationOf(p, i);
    var tag = el("span", "lv-steal-rel lv-steal-rel-" + rel.kind);
    tag.innerHTML = REL_ICONS[rel.kind];
    tag.appendChild(el("span", null, rel.label));
    body.appendChild(tag);
    body.appendChild(el("span", "lv-steal-title", shortTitle(p.info.title)));
    body.appendChild(el("span", "lv-steal-sub", storeName(p.store) + " · save " + fmt(p.max - p.price)));
    var prices = el("span", "lv-steal-prices");
    prices.appendChild(el("b", null, fmt(p.price)));
    prices.appendChild(el("s", null, fmt(p.max)));
    prices.appendChild(el("span", "lv-steal-pill", "−" + p.drop + "%"));
    body.appendChild(prices);
    var chart = el("span", "lv-steal-chart");
    chart.insertAdjacentHTML("beforeend", sparkline(p.chart));
    chart.appendChild(el("span", "lv-steal-chart-label", "30 days"));
    body.appendChild(chart);
    b.appendChild(body);
    b.onclick = function () {
      openPdpFor(p);
    };
    b.onkeydown = function (e) {
      if (e.key === "Enter") openPdpFor(p);
    };
    return b;
  }

  function buildTracker() {
    var list = products()
      .filter(function (p) {
        return p.drop && p.chart.length;
      })
      .sort(byDrop)
      .slice(0, TRACKER_SIZE);
    if (list.length < 3) return null;
    var box = el("div", "lv-tracker");
    var head = el("div", "lv-tracker-head");
    head.appendChild(el("h2", "lv-cats-heading lv-tracker-heading", "Price Drops"));
    box.appendChild(head);
    var row = el("div", "lv-tracker-row");
    list.forEach(function (p, i) {
      row.appendChild(stealCard(p, i, list.length));
    });
    box.appendChild(scrollWrap(row, { label: "More good prices", query: MORE_DEALS_TEXT }));
    return box;
  }
  // 横向滚动行 + 左右箭头（样式复用分类卡那一套）
  // chat：「对话」样式下底部按钮的文案与要发的 query（不传就仍是 See more 展开）
  function scrollWrap(row, chat) {
    var wrap = el("div", "lv-cats-rowwrap");
    wrap.appendChild(row);
    registerGrid(wrap, row, chat);
    ["prev", "next"].forEach(function (dir) {
      var a = el("button", "lv-cats-arrow lv-cats-arrow-" + dir);
      a.type = "button";
      a.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' +
        (dir === "prev" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6") +
        '"/></svg>';
      a.onclick = function () {
        row.scrollBy({ left: (dir === "prev" ? -1 : 1) * row.clientWidth * 0.8, behavior: "smooth" });
      };
      wrap.appendChild(a);
    });
    function arrows() {
      wrap.classList.toggle("can-prev", row.scrollLeft > 4);
      wrap.classList.toggle("can-next", row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
    }
    row.addEventListener("scroll", arrows);
    setTimeout(arrows, 50);
    window.addEventListener("resize", arrows);
    return wrap;
  }

  /* ---------- Wonder coupon（版式参考 dupe.com/steals 的 Stackable coupon codes，横滑单行） ----------
   * 券是 mock 数据（录制数据里没有券）；门店 logo 取自录制商品里该门店的 website_logo_url。
   * 倒计时以页面打开时刻为起点实时走秒；COPY 复制券码到剪贴板。 */
  var COUPONS = [
    { store: "walmart", big: "$10", unit: "off", desc: "$10 off household essentials on orders $50+", code: "SAVE10NOW", hours: 19.73 },
    { store: "amazon", big: "15%", unit: "off", desc: "Extra 15% off select home & kitchen picks", code: "HOME15", hours: 14.7 },
    { store: "bestbuy", big: "$25", unit: "off", desc: "Laptops and monitors $499+, stacks with open-box", code: "TECH25", hours: 43.7 },
    { store: "target", big: "20%", unit: "off", desc: "Target Circle deal on home décor and bedding", code: "CIRCLE20", hours: 6.2 },
    { store: "ebay", big: "15%", unit: "off", desc: "Certified refurbished tech, up to $100 off", code: "REFURB15", hours: 43.7 },
    { store: "nordstrom", big: "25%", unit: "off", desc: "Select backpacks and travel bags", code: "NORDY25", hours: 19.7 },
    { store: "homedepot", big: "$20", unit: "off", desc: "Appliance and air-filter orders $200+", code: "HD20HOME", hours: 67.5 },
    { store: "quince", big: "10%", unit: "off", desc: "First order on organic bedding", code: "QUINCE10", hours: 30.1 },
    { store: "dickssportinggoods", big: "20%", unit: "off", desc: "One full-price item, sporting & outdoor", code: "DSG20", hours: 11.4 },
    { store: "costco", big: "$30", unit: "off", desc: "Online-only savings on electronics $300+", code: "CSTCO30", hours: 52.9 },
  ];
  // 「More good savings」进对话后推荐的更多券（外面 Big Savings 里没有的）
  var MORE_COUPONS = [
    { store: "adidas", big: "30%", unit: "off", desc: "Running shoes and apparel, members only", code: "RUN30AD", hours: 26.4 },
    { store: "llbean", big: "$20", unit: "off", desc: "Outerwear and bags on orders $100+", code: "LLB20OFF", hours: 61.2 },
    { store: "wayfair", big: "15%", unit: "off", desc: "Storage and organization, first order", code: "WF15ORG", hours: 8.9 },
    { store: "chewy", big: "$15", unit: "off", desc: "Pet food and treats on orders $49+", code: "CHEWY15", hours: 33.6 },
    { store: "kroger", big: "$5", unit: "off", desc: "Pantry and snacks, digital coupon", code: "KR5SNACK", hours: 5.4 },
    { store: "target", big: "$10", unit: "off", desc: "Target Circle: home & kitchen $50+", code: "TGT10HOME", hours: 40.1 },
  ];
  function allCoupons() {
    return COUPONS.concat(MORE_COUPONS);
  }
  // 方案三「对话」样式：分区底部按钮发的 query
  var MORE_DEALS_TEXT = "Find me more good prices like these";
  var MORE_COUPONS_TEXT = "Find me more coupons I can use";
  var MORE_DEALS_SIZE = 8;
  // Price Drops 外面展示的是降幅前 TRACKER_SIZE 件，对话里接着往后给
  function moreDeals() {
    var drops = products()
      .filter(function (p) {
        return p.drop && p.chart.length;
      })
      .sort(byDrop);
    var rest = drops.slice(TRACKER_SIZE, TRACKER_SIZE + MORE_DEALS_SIZE);
    return rest.length >= 4 ? rest : drops.slice(0, MORE_DEALS_SIZE);
  }
  function moreDealsIntro(items) {
    return "Here are " + items.length + " more good prices — up to " + items[0].drop + "% below their recent high";
  }
  function moreCouponsIntro() {
    return "Found " + MORE_COUPONS.length + " more coupons you can claim right now";
  }
  // 会话里的券卡点 Claim now：会话输入框挂不了附件，直接用文字说明是哪张券
  function claimText(cp) {
    return "Claim the " + storeName(cp.store) + " " + cp.big + " off coupon and apply it";
  }
  function couponByClaimText(text) {
    return allCoupons().filter(function (cp) {
      return claimText(cp) === text;
    })[0];
  }
  // 会话里以「外面一样的卡」展示：降价卡网格 / 券卡网格
  function dealsBlock() {
    var box = el("div", "lv-chat-grid lv-chat-steals");
    moreDeals().forEach(function (p, i) {
      // 序号从 4 起：前 4 个固定 Tracking 的规则只给 Explore 首行
      box.appendChild(stealCard(p, i + 4, MORE_DEALS_SIZE));
    });
    return box;
  }
  function couponsBlock() {
    var box = el("div", "lv-chat-grid lv-chat-coupons");
    MORE_COUPONS.forEach(function (cp) {
      box.appendChild(couponCard(cp));
    });
    var tick = setInterval(function () {
      if (!box.isConnected) return clearInterval(tick);
      [].forEach.call(box.querySelectorAll(".lv-coupon-timer"), function (t) {
        t._label.textContent = countdown(t._hours);
      });
    }, 1000);
    return box;
  }
  var couponStart = Date.now();
  function storeLogo(store) {
    var hit = products().filter(function (p) {
      return p.store === store && p.info.website_logo_url;
    })[0];
    return hit ? hit.info.website_logo_url : "";
  }
  function countdown(hours) {
    var left = Math.max(0, Math.round(hours * 3600 - (Date.now() - couponStart) / 1000));
    var d = Math.floor(left / 86400);
    var h = Math.floor((left % 86400) / 3600);
    var m = Math.floor((left % 3600) / 60);
    var s = left % 60;
    return "Ends in " + (d ? d + "d " : "") + h + "h " + m + "m " + s + "s";
  }
  function miniToast(text) {
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
    }, 1500);
  }
  // Claim now：把券作为引用附件放进输入坞（原页面的商品引用卡样式），再发「领取并使用」的 query，跳到会话页
  var CLAIM_TEXT = "Claim this coupon and apply it";
  function couponTitle(cp) {
    return storeName(cp.store) + " · " + cp.big + " off coupon";
  }
  function claimCoupon(cp) {
    if (!window.__lvAddQuote) return;
    if (window.__lvClearQuotes) window.__lvClearQuotes();
    window.__lvAddQuote({
      quoteSource: "big_savings_coupon",
      display: { title: couponTitle(cp), imageUrl: storeLogo(cp.store) },
      pdp: { locator: { source: cp.store, region: "US", offerId: "coupon-" + cp.code } },
      status: "active",
    });
    setTimeout(function () {
      sendQuery(CLAIM_TEXT);
    }, 80);
  }
  // 从发出的消息里认出是哪张券（附件 locator.offer_id = coupon-{券码}）
  function couponFromFrame(frame) {
    var blocks = [];
    try {
      blocks = JSON.parse(frame.message.customized_data).blocks || [];
    } catch (e) {}
    var code = null;
    blocks.forEach(function (b) {
      var loc = b.payload && b.payload.pdp && b.payload.pdp.locator;
      var id = loc && (loc.offer_id || loc.offerId);
      if (id && /^coupon-/.test(id)) code = id.slice(7);
    });
    return allCoupons().filter(function (c) {
      return c.code === code;
    })[0];
  }
  function couponIntro(cp) {
    return "Coupon " + cp.code + " claimed — " + cp.big + " off at " + storeName(cp.store) + ". Here are " + storeName(cp.store) + " deals it works on";
  }
  function couponItems(cp) {
    return products()
      .filter(function (p) {
        return p.store === cp.store;
      })
      .sort(byDrop)
      .slice(0, 6)
      .map(function (p) {
        return Object.assign({}, p, { badge: "Coupon applies · " + cp.big + " off" });
      });
  }

  // claimed：会话页里领取成功后的券卡，券码完整显示、按钮为复制
  function couponCard(cp, claimed) {
    var c = el("div", "lv-coupon" + (claimed ? " lv-coupon-claimed" : ""));
    var left = el("div", "lv-coupon-main");
    var brand = el("div", "lv-coupon-brand");
    var logo = storeLogo(cp.store);
    if (logo) {
      var img = el("img");
      img.alt = "";
      img.src = logo;
      brand.appendChild(img);
    } else brand.appendChild(el("span", "lv-coupon-letter", storeName(cp.store).charAt(0)));
    brand.appendChild(el("span", "lv-coupon-store", storeName(cp.store)));
    brand.insertAdjacentHTML(
      "beforeend",
      '<svg class="lv-coupon-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.2 1.6 2.7-.2.9 2.6 2.3 1.4-.6 2.6 1 2.5-2 1.8-.4 2.7-2.6.6-1.6 2.2-2.6-.8-2.5 1-1.8-2-2.7-.4-.6-2.6-2.2-1.6.8-2.6-1-2.5 2-1.8.4-2.7 2.6-.6L9.4 2.5z" fill="#2f6bff"/><path d="m8.2 12.2 2.6 2.5 5-5.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    );
    left.appendChild(brand);
    var big = el("div", "lv-coupon-big");
    big.appendChild(document.createTextNode(cp.big));
    big.appendChild(el("span", null, cp.unit));
    left.appendChild(big);
    left.appendChild(el("div", "lv-coupon-desc", cp.desc));
    var timer = el("div", "lv-coupon-timer");
    timer.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><span></span>';
    timer._label = timer.querySelector("span");
    timer._hours = cp.hours;
    timer._label.textContent = countdown(cp.hours);
    left.appendChild(timer);
    c.appendChild(left);
    var right = el("div", "lv-coupon-side");
    // Explore 上的券卡不露券码，只给 Claim now；领取后会话里的券卡才显示完整券码
    if (claimed) {
      right.appendChild(el("div", "lv-coupon-codelabel", "Code"));
      right.appendChild(el("div", "lv-coupon-code", cp.code));
    }
    if (claimed) {
      var copy = el("button", "lv-coupon-copy");
      copy.type = "button";
      copy.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg><span>Copy code</span>';
      copy.onclick = function () {
        (navigator.clipboard ? navigator.clipboard.writeText(cp.code) : Promise.reject()).then(
          function () {
            miniToast("Code " + cp.code + " copied");
          },
          function () {
            miniToast("Code: " + cp.code);
          },
        );
        copy.classList.add("is-done");
        copy.querySelector("span").textContent = "Copied";
      };
      right.appendChild(copy);
      c.appendChild(right);
      return c;
    }
    var claim = el("button", "lv-coupon-copy lv-coupon-claim");
    claim.type = "button";
    claim.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5V6a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 6v2.5a2.5 2.5 0 0 0 0 5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-4.5a2.5 2.5 0 0 0 0-5Z"/><path d="M10 9.5h4M10 14.5h4"/></svg><span>Claim now</span>';
    claim.onclick = function (e) {
      e.stopPropagation();
      // 会话里（More good savings 的回复）直接在会话输入框发领取；Explore 上走带附件的 Claim 流程
      if (/^\/(home|chat)/.test(window.lvPath())) sendQuery(claimText(cp));
      else claimCoupon(cp);
    };
    right.appendChild(claim);
    c.appendChild(right);
    return c;
  }
  function buildCoupons() {
    var box = el("div", "lv-tracker lv-coupons");
    var head = el("div", "lv-tracker-head");
    head.appendChild(el("h2", "lv-cats-heading lv-tracker-heading", "Big Savings"));
    box.appendChild(head);
    var row = el("div", "lv-tracker-row lv-coupon-row");
    COUPONS.forEach(function (cp) {
      row.appendChild(couponCard(cp));
    });
    box.appendChild(scrollWrap(row, { label: "More good savings", query: MORE_COUPONS_TEXT }));
    // 倒计时走秒
    setInterval(function () {
      [].forEach.call(row.querySelectorAll(".lv-coupon-timer"), function (t) {
        t._label.textContent = countdown(t._hours);
      });
    }, 1000);
    return box;
  }

  /* ---------- 方案四样式分支「多行 · See more」 ----------
   * <html data-lv-layout="grid"> 时，三个分区的卡片改为多行网格（CSS），这里按「已展开行数 + 下一行露 56px」裁高，
   * 露出的那一截盖半透明渐隐蒙层 + See more，点一次多展开一行；全部展开后蒙层消失。横滑模式下不做任何事。 */
  var PEEK = 56;
  var grids = [];
  function gridMode() {
    return root.getAttribute("data-lv-layout") === "grid";
  }
  // 方案三「对话」样式（<html data-lv-more="chat">）：只露一行，按钮换成 chat.label，点击发 chat.query 进对话
  function chatMode() {
    return root.getAttribute("data-lv-more") === "chat";
  }
  var ICON_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var ICON_GO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h12M13 7l5 5-5 5"/></svg>';
  function registerGrid(wrap, row, chat) {
    var more = el("div", "lv-more");
    var btn = el("button", "lv-more-btn");
    btn.type = "button";
    more.appendChild(btn);
    wrap.appendChild(more);
    var g = { wrap: wrap, row: row, more: more, btn: btn, chat: chat, shown: 1 };
    btn.onclick = function () {
      if (chatMode() && chat) {
        sendQuery(chat.query);
        return;
      }
      g.shown += 1;
      layoutGrid(g);
    };
    grids.push(g);
  }
  function moreLabel(g) {
    var toChat = chatMode() && g.chat;
    var key = toChat ? "chat" : "more";
    if (g.btn._key === key) return;
    g.btn._key = key;
    g.btn.innerHTML = "<span></span>" + (toChat ? ICON_GO : ICON_DOWN);
    g.btn.querySelector("span").textContent = toChat ? g.chat.label : "See more";
  }
  function layoutGrid(g) {
    moreLabel(g);
    if (!gridMode()) {
      g.row.style.maxHeight = "";
      g.wrap.classList.remove("has-more");
      return;
    }
    var cards = [].slice.call(g.row.children);
    if (!cards.length) return;
    // 按卡片 offsetTop 分行
    var tops = [];
    cards.forEach(function (c) {
      if (tops.indexOf(c.offsetTop) < 0) tops.push(c.offsetTop);
    });
    tops.sort(function (a, b) {
      return a - b;
    });
    var cs = getComputedStyle(g.row);
    var padTop = parseFloat(cs.paddingTop) || 0;
    if (g.shown >= tops.length) {
      g.row.style.maxHeight = "";
      g.wrap.classList.remove("has-more");
      return;
    }
    // 下一行起点前一行全部可见，再露 PEEK 像素
    var nextTop = tops[g.shown] - tops[0];
    g.row.style.maxHeight = padTop + nextTop + PEEK + "px";
    g.wrap.classList.add("has-more");
  }
  function layoutGrids() {
    grids.forEach(layoutGrid);
  }
  window.addEventListener("local:layout", function () {
    grids.forEach(function (g) {
      g.shown = 1;
    });
    requestAnimationFrame(layoutGrids);
  });
  window.addEventListener("resize", function () {
    requestAnimationFrame(layoutGrids);
  });

  function buildSection() {
    section = el("section", "lv-cats");
        section.appendChild(
      el("h2", "lv-cats-heading", "What are you shopping for?"),
    );
    var wrap = el("div", "lv-cats-rowwrap");
    var row = el("div", "lv-cats-row");
    COLLECTIONS.forEach(function (c) {
      var card = collectionCard(c);
      if (card) row.appendChild(card);
    });
    wrap.appendChild(row);
    registerGrid(wrap, row);
    ["prev", "next"].forEach(function (dir) {
      var a = el("button", "lv-cats-arrow lv-cats-arrow-" + dir);
      a.type = "button";
      a.setAttribute("aria-label", dir === "prev" ? "Previous" : "Next");
      a.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' +
        (dir === "prev" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6") +
        '"/></svg>';
      a.onclick = function () {
        row.scrollBy({
          left: (dir === "prev" ? -1 : 1) * row.clientWidth * 0.8,
          behavior: "smooth",
        });
      };
      wrap.appendChild(a);
    });
    function arrows() {
      wrap.classList.toggle("can-prev", row.scrollLeft > 4);
      wrap.classList.toggle(
        "can-next",
        row.scrollLeft + row.clientWidth < row.scrollWidth - 4,
      );
    }
    row.addEventListener("scroll", arrows);
    setTimeout(arrows, 50);
    window.addEventListener("resize", arrows);
    section.appendChild(wrap);
    var tracker = buildTracker();
    if (tracker) section.appendChild(tracker);
    var coupons = buildCoupons();
    if (coupons) section.appendChild(coupons);
    // 下方原信息流的标题（同「What are you shopping for?」样式）
    section.appendChild(
      el("h2", "lv-cats-heading lv-browse-heading", "Deals for You"),
    );
  }

  // 给 compare.js 用的商品池与工具函数
  window.lvShop = { products: products, storeName: storeName, storeLogo: storeLogo, sendQuery: sendQuery, fmt: fmt, money: money, seeded: seeded, byDrop: byDrop };

  function mount() {
    var header = document.querySelector('[class*="_feedHeader_"]');
    if (!on() || !header) {
      if (section && section.parentNode) section.remove();
      return;
    }
    if (!products().length) return;
    if (!section) buildSection();
    if (section.parentNode !== header) {
      header.appendChild(section);
      requestAnimationFrame(layoutGrids);
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      mount();
    }, 200);
  }
  function boot() {
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
    });
    window.addEventListener("local:variant", schedule);
    schedule();
  }
  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
