/*
 * 品牌换成 Okiee：原页面构建产物里写死的「Migoo」文案（侧栏品牌、页脚、免责声明、下载入口、标签页标题、
 * 会话回复等）在渲染时统一替换；local/ 里自己的文案已直接改成 Okiee。
 * 只改文字节点和 placeholder / title / aria-label / alt，不碰链接、图片地址和输入框里用户正在编辑的内容。
 * Logo（窄栏、会话窗标题、PDP 的 Ask 按钮、favicon）换成 local/okiee-logo.png，见 overrides.css 与 index.html。
 */
(function () {
  var RE = /(^|[^A-Za-z_])(Migoo|migoo|MIGOO)(?![A-Za-z_])/g;
  // 品牌标准写法只有一种：Okiee（原文小写 / 全大写的也统一成 Okiee）
  var MAP = { Migoo: "Okiee", migoo: "Okiee", MIGOO: "Okiee" };
  var ATTRS = ["placeholder", "title", "aria-label", "alt", "data-placeholder"];

  function swap(s) {
    return s.replace(RE, function (_, pre, word) {
      return pre + MAP[word];
    });
  }
  function skip(el) {
    return (
      !el || el.closest("script, style, .ProseMirror, [contenteditable='true']")
    );
  }
  function fixText(node) {
    var v = node.nodeValue;
    if (v && RE.test(v) && !skip(node.parentElement)) node.nodeValue = swap(v);
    RE.lastIndex = 0;
  }
  function fixAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v && RE.test(v)) el.setAttribute(ATTRS[i], swap(v));
      RE.lastIndex = 0;
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1 || skip(root)) return;
    fixAttrs(root);
    var w = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) fixText(n);
      else fixAttrs(n);
    }
  }
  function fixTitle() {
    if (RE.test(document.title)) document.title = swap(document.title);
    RE.lastIndex = 0;
  }

  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === "characterData") fixText(m.target);
      else if (m.type === "attributes") fixAttrs(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
    fixTitle();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
  if (document.body) walk(document.body);
  fixTitle();
})();
