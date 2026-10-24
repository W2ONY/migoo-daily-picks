/*
 * 本地回放层：在应用脚本之前运行，拦截接口 / 埋点请求，用 mock/data.json 里
 * 从 migoo.test.shopee.io（PFB: pfb-pdp-us）录下的真实返回作答，页面代码本身不改。
 *
 * - 匹配：同一路径的录制里，先找「请求体（去掉 meta/metadata）+ query」完全一致的，
 *   找不到再退回该路径第一条录制；没录过的 /beeai 接口回通用成功。
 * - 有状态接口：点赞（like/set、status_batch、list）在本地维护，存 localStorage 的 mock:likes。
 * - recommend 超出录制页数时回空列表（= 信息流到底）。
 * - 想看每个请求怎么被回放：控制台执行 localStorage.setItem('mock:debug', '1') 后刷新。
 */
(function () {
  // 发布到 docs 站子路径时（如 /p/<owner>/daily-picks），构建脚本会先注入 window.LV_BASE；本地为空
  var BASE = window.LV_BASE || "";
  // 去掉站点前缀后的应用内路径，local/ 里判断当前页面都用它
  window.lvPath = function () {
    var p = location.pathname;
    return BASE && p.indexOf(BASE) === 0 ? p.slice(BASE.length) || "/" : p;
  };
  var DATA_URL = BASE + "/mock/data.json";
  // 同事经局域网 http 地址打开时不是安全上下文，浏览器不提供 crypto.randomUUID，原页面一调就报错白屏
  if (window.crypto && !window.crypto.randomUUID)
    window.crypto.randomUUID = function () {
      var b = window.crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64;
      b[8] = (b[8] & 63) | 128;
      var h = Array.from(b, function (x) {
        return (x + 256).toString(16).slice(1);
      }).join("");
      return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
    };
  var DELAY = 120;
  var TRACK_RE =
    /report\/batch|\/v4\/event_batch|\/v2\/shpsec\/|firelog|firebaseinstallations|google-analytics\.com|googletagmanager\.com|google\.com\/g\/collect|doubleclick\.net/;
  var debug = false;
  try {
    debug = localStorage.getItem("mock:debug") === "1";
  } catch (e) {}

  // 登录态：应用只读 LOGIN_STATE 里的过期时间判断是否已登录
  var now = Date.now();
  document.cookie =
    "LOGIN_STATE=" +
    encodeURIComponent(
      JSON.stringify({
        access_exp: now + 365 * 864e5,
        refresh_exp: now + 730 * 864e5,
      }),
    ) +
    "; path=/";

  var origFetch = window.fetch.bind(window);
  var byKey = {};
  var products = {}; // buybox_id -> 商品摘要，用于给本地新点赞的商品生成 Likes 列表项
  var likes = null;
  var turns = {}; // 同一请求的回放轮次

  function pathKey(u) {
    var url = new URL(u, location.href);
    var i = url.pathname.indexOf("/beeai/");
    return i >= 0 ? url.pathname.slice(i) : url.host + url.pathname;
  }
  function norm(body) {
    if (!body) return "";
    try {
      var j = JSON.parse(body);
      if (j && typeof j === "object" && !Array.isArray(j)) {
        delete j.meta;
        delete j.metadata;
        delete j.request_id;
      }
      return stable(j);
    } catch (e) {
      return String(body);
    }
  }
  function stable(v) {
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if (v && typeof v === "object")
      return (
        "{" +
        Object.keys(v)
          .sort()
          .map(function (k) {
            return JSON.stringify(k) + ":" + stable(v[k]);
          })
          .join(",") +
        "}"
      );
    return JSON.stringify(v);
  }
  function ok(results) {
    return {
      s: 200,
      ct: "application/json",
      t: JSON.stringify({ code: 0, message: "success", results: results }),
    };
  }

  function collect(o) {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(collect);
    var info = o.offer_info;
    if (o.cspu_id && info && info.buybox_id && !products[info.buybox_id]) {
      products[info.buybox_id] = {
        product: {
          region: info.region || "US",
          cspu_id: String(o.cspu_id),
          buybox_id: info.buybox_id,
          offer_id: info.offer_id,
        },
        title: info.title,
        main_image: info.image,
        price: {
          type: 1,
          price: info.price,
          currency: String(info.currency || "usd").toUpperCase(),
          source: "US_OFFER_SNAPSHOT",
          degraded: true,
        },
        product_status: 1,
        detail_locator: {
          region: info.region || "US",
          cspu_id: String(o.cspu_id),
          offer_id: info.offer_id,
          buybox_id: info.buybox_id,
          agg_level: o.agg_level || 3,
        },
        source: info.source,
        agg_level: o.agg_level || 3,
        region: info.region || "US",
      };
    }
    for (var k in o) collect(o[k]);
  }

  // docs 站单文件上限 1 MiB：发布版把 data.json 拆成 data.json.0…N（window.LV_DATA_PARTS 份）再拼回
  var parts = window.LV_DATA_PARTS || 0;
  var ready = (
    parts
      ? Promise.all(
          Array.from({ length: parts }, function (_, i) {
            return origFetch(DATA_URL + "." + i).then(function (r) {
              return r.text();
            });
          }),
        ).then(function (chunks) {
          return JSON.parse(chunks.join(""));
        })
      : origFetch(DATA_URL).then(function (r) {
          return r.json();
        })
  )
    .then(function (data) {
      try {
        Object.keys(data.ls || {}).forEach(function (k) {
          if (localStorage.getItem(k) === null)
            localStorage.setItem(k, data.ls[k]);
        });
      } catch (e) {}
      data.rec.forEach(function (r) {
        var key = r.m.toUpperCase() + " " + pathKey(r.u);
        (byKey[key] = byKey[key] || []).push(r);
        if (/ecommerce\/recommend/.test(r.u)) {
          try {
            collect(JSON.parse(r.t));
          } catch (e) {}
        }
      });
      // 给 local/ 下的改版脚本读录制数据用：mockLookup("GET /beeai/api/v1/user/info/me") → results
      window.mockLookup = function (key) {
        var r = (byKey[key] || [])[0];
        try {
          return r ? JSON.parse(r.t).results : null;
        } catch (e) {
          return null;
        }
      };
      window.mockAll = function (key) {
        return (byKey[key] || []).map(function (r) {
          try {
            return JSON.parse(r.t).results;
          } catch (e) {
            return null;
          }
        });
      };
      try {
        likes = JSON.parse(localStorage.getItem("mock:likes") || "null");
      } catch (e) {}
      if (!likes) {
        likes = {};
        var list = (byKey["POST /beeai/api/v1/ecommerce/like/list"] || [])[0];
        if (list)
          JSON.parse(list.t).results.items.forEach(function (it) {
            likes[it.product.buybox_id] = it;
          });
      }
    });

  function saveLikes() {
    try {
      localStorage.setItem("mock:likes", JSON.stringify(likes));
    } catch (e) {}
  }

  function handle(method, u, body) {
    var key = method + " " + pathKey(u);
    var path = key.split(" ")[1];
    var req = {};
    try {
      req = body ? JSON.parse(body) : {};
    } catch (e) {}

    var hist = /\/chat\/conversations\/([^/]+)\/messages$/.exec(path);
    if (hist && method === "GET") return historyMessages(decodeURIComponent(hist[1]), u);

    if (/ecommerce\/like\/set$/.test(path)) {
      var p = req.product || {};
      var liked = req.target_state === 1;
      if (liked) {
        var it = JSON.parse(
          JSON.stringify(
            products[p.buybox_id] || {
              product: p,
              detail_locator: p,
              title: "",
              price: {},
            },
          ),
        );
        it.like_time_ms = Date.now();
        likes[p.buybox_id] = it;
      } else delete likes[p.buybox_id];
      saveLikes();
      return ok({
        meta: {},
        is_liked: liked,
        like_time_ms: liked ? Date.now() : 0,
        state_version: Date.now(),
        result_code: 1,
      });
    }
    if (/ecommerce\/like\/status_batch$/.test(path)) {
      return ok({
        meta: {},
        results: (req.products || []).map(function (p) {
          var it = likes[p.buybox_id];
          return {
            product: p,
            is_liked: !!it,
            like_time_ms: it ? it.like_time_ms : 0,
            result_code: 1,
            state_version: 0,
          };
        }),
      });
    }
    if (/ecommerce\/like\/list$/.test(path)) {
      var items = Object.keys(likes).map(function (k) {
        return likes[k];
      });
      items.sort(function (a, b) {
        return b.like_time_ms - a.like_time_ms;
      });
      return ok({ meta: {}, items: items, has_more: false, partial: false });
    }

    var recs = byKey[key];
    if (recs) {
      var n = norm(body);
      var query = new URL(u, location.href).search;
      // 同一请求录到多次（如 recommend 首页先被信息流、后被商品选择器各请求一次，服务端每次返回不同），
      // 按录制顺序轮流回放
      var same = recs.filter(function (r) {
        return norm(r.b) === n && new URL(r.u).search === query;
      });
      if (!same.length)
        same = recs.filter(function (r) {
          return norm(r.b) === n;
        });
      var turnKey = key + "|" + n + "|" + query;
      var turn = turns[turnKey] || 0;
      turns[turnKey] = turn + 1;
      var hit = same[turn % same.length];
      if (!hit && /ecommerce\/recommend$/.test(path)) {
        var empty = JSON.parse(recs[0].t);
        empty.results.cards = [];
        empty.results.returned_count = 0;
        return { s: 200, ct: "application/json", t: JSON.stringify(empty) };
      }
      if (!hit && /pdp\/info$/.test(path))
        hit = recs.filter(function (r) {
          return JSON.parse(r.b).cspu_id === req.cspu_id;
        })[0];
      hit = hit || recs[0];
      var out = { s: hit.s, ct: hit.ct, t: hit.t };
      if (/\/chat\/(initial|conversations)/.test(path)) out = withLocalLatest(out);
      return out;
    }
    if (TRACK_RE.test(u)) return ok({});
    return ok({});
  }

  function shouldMock(u) {
    var url = new URL(u, location.href);
    if (url.origin === location.origin) return false;
    return (
      /\/beeai\/api\//.test(url.pathname) ||
      TRACK_RE.test(u) ||
      !!byKey["GET " + pathKey(u)] ||
      !!byKey["POST " + pathKey(u)]
    );
  }

  function reply(method, u, body) {
    return ready.then(function () {
      var res = handle(method, u, body);
      if (debug) console.log("[mock]", method, pathKey(u), res.s);
      return new Promise(function (r) {
        setTimeout(function () {
          r(res);
        }, DELAY);
      });
    });
  }

  window.fetch = function (input, init) {
    var u =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    // data.json 还没载完时，按路径特征判断；载完后再按录制表判断
    var mock = /\/beeai\/api\//.test(u) || TRACK_RE.test(u);
    var go = mock
      ? Promise.resolve(true)
      : ready.then(function () {
          return shouldMock(u);
        });
    return go.then(function (m) {
      if (!m) return origFetch(input, init);
      var method = (
        (init && init.method) ||
        (input && input.method) ||
        "GET"
      ).toUpperCase();
      var bodyP =
        init && init.body != null
          ? Promise.resolve(typeof init.body === "string" ? init.body : "")
          : input && typeof input === "object" && input.clone
            ? input.clone().text()
            : Promise.resolve("");
      return bodyP.then(function (b) {
        return reply(method, u, b).then(function (res) {
          var nobody = res.s === 204 || res.s === 304;
          return new Response(nobody ? null : res.t, {
            status: res.s,
            headers: { "content-type": res.ct || "application/json" },
          });
        });
      });
    });
  };

  var XP = XMLHttpRequest.prototype;
  var xOpen = XP.open;
  var xSend = XP.send;
  XP.open = function (m, u) {
    this.__mock = /\/beeai\/api\//.test(String(u)) || TRACK_RE.test(String(u));
    this.__m = String(m).toUpperCase();
    this.__u = String(u);
    return xOpen.apply(this, arguments);
  };
  XP.send = function (b) {
    if (!this.__mock) return xSend.apply(this, arguments);
    var x = this;
    reply(x.__m, x.__u, typeof b === "string" ? b : "").then(function (res) {
      var def = function (k, v) {
        Object.defineProperty(x, k, { value: v, configurable: true });
      };
      def("readyState", 4);
      def("status", res.s);
      def("statusText", "OK");
      def("responseText", res.t);
      def("response", x.responseType === "json" ? JSON.parse(res.t) : res.t);
      def("responseURL", x.__u);
      x.getResponseHeader = function (h) {
        return /content-type/i.test(h) ? res.ct : null;
      };
      x.getAllResponseHeaders = function () {
        return "content-type: " + res.ct + "\r\n";
      };
      ["readystatechange", "load", "loadend"].forEach(function (t) {
        x.dispatchEvent(new Event(t));
      });
    });
  };

  // 定位：录制时浏览器已授权定位，所以线上没有「访问位置」弹框；这里同样当作已授权（坐标取新加坡市中心）
  var FAKE_POS = {
    coords: {
      latitude: 1.2903,
      longitude: 103.8519,
      accuracy: 50,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = function (ok) {
      setTimeout(function () {
        ok(FAKE_POS);
      }, 30);
    };
    navigator.geolocation.watchPosition = function (ok) {
      setTimeout(function () {
        ok(FAKE_POS);
      }, 30);
      return 1;
    };
    navigator.geolocation.clearWatch = function () {};
  }
  if (navigator.permissions && navigator.permissions.query) {
    var origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = function (desc) {
      if (desc && desc.name === "geolocation") {
        var status = new EventTarget();
        status.state = "granted";
        status.name = "geolocation";
        status.onchange = null;
        return Promise.resolve(status);
      }
      return origQuery(desc);
    };
  }

  var beacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = function (u) {
    return TRACK_RE.test(String(u))
      ? true
      : beacon
        ? beacon.apply(null, arguments)
        : true;
  };

  // 长连接（聊天推送等）：本地没有服务端，给一个「已连上但不推消息」的假 socket，避免超时重连刷屏
  var RealWS = window.WebSocket;
  var LOCAL_REPLY =
    "This is a local mirror of Daily Picks, so Migoo does not generate real replies here.\n\n（本地镜像：消息已发出，但不会生成真实回复。）";
  // 本地会话记录：Explore / Chat 里发出的消息和本地回复（localStorage 的 mock:chat-log）
  var CHAT_LOG_KEY = "mock:chat-log";
  function readChatLog() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_LOG_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveChatLog(msgs) {
    try {
      localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(readChatLog().concat(msgs).slice(-200)));
    } catch (e) {}
  }
  // 会话历史接口：按 seq / order / limit 分页返回本地记录（order=old 取 seq 之前更早的，new 取之后的）
  function historyMessages(conv, url) {
    var q = new URL(url, location.href).searchParams;
    var limit = Number(q.get("limit") || 20);
    var seq = q.get("seq") == null ? null : Number(q.get("seq"));
    var order = q.get("order") || "old";
    var list = readChatLog()
      .filter(function (m) {
        return m.conversation_id === conv;
      })
      .sort(function (a, b) {
        return a.seq - b.seq;
      });
    // seq=-1 表示取最新一页；order=old 含 seq 本身（首屏用会话的 latest_msg_seq 来取）
    if (seq != null && seq >= 0)
      list = list.filter(function (m) {
        return order === "new" ? m.seq > seq : m.seq <= seq;
      });
    list = order === "new" ? list.slice(0, limit) : list.slice(-limit);
    return { s: 200, ct: "application/json", t: JSON.stringify({ code: 0, message: "success", results: { messages: list.length ? list : null } }) };
  }

  // 会话信息里的 latest_msg_seq / 最后一条消息改成本地记录的最新一条，页面才会按它去拉历史
  function withLocalLatest(res) {
    var log = readChatLog();
    if (!log.length) return res;
    var latest = {};
    log.forEach(function (m) {
      if (!latest[m.conversation_id] || m.seq > latest[m.conversation_id].seq) latest[m.conversation_id] = m;
    });
    var j;
    try {
      j = JSON.parse(res.t);
    } catch (e) {
      return res;
    }
    (function walk(o) {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) return o.forEach(walk);
      var m = o.id && latest[o.id];
      if (m && "latest_msg_seq" in o) {
        o.latest_msg_seq = m.seq;
        o.last_update_timestamp = m.timestamp;
        if (Array.isArray(o.messages)) o.messages = [m];
      }
      Object.keys(o).forEach(function (k) {
        walk(o[k]);
      });
    })(j);
    return { s: res.s, ct: res.ct, t: JSON.stringify(j) };
  }

  // 用户这条消息里的文本（local/ 改版脚本按它决定回复内容）
  function sentText(frame) {
    try {
      return JSON.parse(frame.message.customized_data)
        .blocks.filter(function (b) {
          return b.type === "text";
        })
        .map(function (b) {
          return b.payload.content;
        })
        .join("\n");
    } catch (e) {
      return "";
    }
  }
  class FakeWS extends EventTarget {
    constructor(url) {
      super();
      this.url = String(url);
      this.readyState = 0;
      this.bufferedAmount = 0;
      this.protocol = "";
      this.extensions = "";
      this.binaryType = "blob";
      this.onopen = this.onmessage = this.onerror = this.onclose = null;
      var ws = this;
      setTimeout(function () {
        if (ws.readyState !== 0) return;
        ws.readyState = 1;
        var e = new Event("open");
        ws.dispatchEvent(e);
        if (ws.onopen) ws.onopen(e);
      }, 50);
    }
    send(data) {
      if (debug) console.log("[mock] ws send", String(data).slice(0, 200));
      var frame;
      try {
        frame = JSON.parse(String(data));
      } catch (e) {
        return;
      }
      if (!frame || frame.type !== "send" || !frame.req_id) return;
      // 通知 local/ 改版脚本（方案三的 Recent chats 据此记录 Explore 发起的购物对话）
      window.dispatchEvent(new CustomEvent("mock:ws-send", { detail: frame }));
      // 发消息：先回 response 确认（页面收到才会跳去聊天页），再回一条固定的 Migoo 回复
      var ws = this;
      var now = Date.now();
      var msgId = "local-" + now;
      var conv = (frame.message && frame.message.conversation_id) || "";
      ws._push(300, {
        type: "response",
        req_id: frame.req_id,
        code: 0,
        results: { msg_id: msgId, seq: now },
      });
      ready.then(function () {
        var tpl = {};
        try {
          tpl = JSON.parse(byKey["POST /beeai/api/v1/chat/initial"][0].t)
            .results.messages[0];
        } catch (e) {}
        var reply = Object.assign({}, tpl, {
          id: "local-reply-" + now,
          conversation_id: conv || tpl.conversation_id,
          msg_type: 8,
          timestamp: now + 1,
          seq: now + 1,
          reply_to: msgId,
          customized_data: JSON.stringify({
            blocks: (window.mockReplyFor && window.mockReplyFor(sentText(frame), frame)) || [
              { type: "text", payload: { content: LOCAL_REPLY } },
            ],
          }),
        });
        // 回复延迟可由 local/ 改版脚本按问题决定（给「思考」动画留时间），默认 1.6s
        var text = sentText(frame);
        var delay = (window.mockReplyDelay && window.mockReplyDelay(text)) || 1600;
        // 有「思考」动画时由它决定何时放出回复（mockReplyGate 返回 Promise），否则按固定延迟
        if (window.mockReplyGate) {
          window.mockReplyGate(text).then(function () {
            ws._push(0, { type: "chat", reply_to: msgId, message: reply });
          });
        } else ws._push(delay, { type: "chat", reply_to: msgId, message: reply });
        // 存下这一问一答，会话历史接口会把它们拼进去，刷新 / 切页后不丢
        var me = (window.mockLookup && window.mockLookup("GET /beeai/api/v1/user/info/me")) || {};
        saveChatLog([
          Object.assign({}, tpl, {
            id: msgId,
            sender_id: String(me.id || ""),
            conversation_id: reply.conversation_id,
            msg_type: frame.message.msg_type,
            customized_data: frame.message.customized_data,
            timestamp: now,
            seq: now,
            reply_to: undefined,
          }),
          reply,
        ]);
      });
    }
    _push(delay, obj) {
      var ws = this;
      setTimeout(function () {
        if (ws.readyState !== 1) return;
        var e = new MessageEvent("message", { data: JSON.stringify(obj) });
        ws.dispatchEvent(e);
        if (ws.onmessage) ws.onmessage(e);
        // 回复到达：通知 local/ 改版脚本收起「思考」动画
        if (obj.type === "chat") window.dispatchEvent(new CustomEvent("mock:ws-reply", { detail: obj }));
      }, delay);
    }
    close() {
      this.readyState = 3;
      var e = new CloseEvent("close", { code: 1000, wasClean: true });
      this.dispatchEvent(e);
      if (this.onclose) this.onclose(e);
    }
  }
  window.WebSocket = function (url, protocols) {
    var u = new URL(url, location.href);
    if (u.host === location.host) return new RealWS(url, protocols);
    return new FakeWS(url);
  };
  window.WebSocket.prototype = RealWS.prototype;
  ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach(function (k) {
    window.WebSocket[k] = RealWS[k];
  });
})();
