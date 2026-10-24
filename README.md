# Daily Picks 本地镜像

2026-10-24 从 `https://migoo.test.shopee.io/daily-picks`（PFB 环境 `pfb-pdp-us`，版本 `1f6cd92_20261024111137`）整包拉下来的本地可交互版本。

- **页面代码是线上构建产物原样**（`assets/`，643 个 JS/CSS/字体/图片），只把 CDN 前缀改成了本地 `/`、去掉了 SRI。
- **接口全部本地回放**：`mock/mock-api.js` 在应用脚本前注入，拦截 `/beeai/api/*`、埋点和 WebSocket，用 `mock/data.json`（录下的真实返回：12 页信息流、236 个商品详情、chips、Likes、选择器等）作答。

## 运行

```bash
node server.mjs 8941
```

打开 http://localhost:8941/daily-picks （或 Claude 预览里的 `migoo-daily-picks` 配置）。

## 已验证可用的交互

| 区域            | 交互                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| 顶部 4 个能力卡 | 点击 → 输入坞挂上能力标签 + 建议问句；点问句填入输入框；× 移除                                         |
| 信息流          | 商品卡 → 右侧 PDP；问句卡 → 问句和商品带入输入坞；滚动分页直到末尾；「Ask migoo」悬浮按钮展开输入坞    |
| PDP             | 点赞/取消（toast「Added to Likes」）、价格图、建议问句 chip、Buy at 外链、Ask Migoo、关闭              |
| Liked 页        | 列表（本地点赞实时同步）→ 商品 PDP → 返回                                                              |
| 输入坞          | 输入文字、`+` 菜单、商品选择器（勾选 / 滚动加载 / 关闭）、发送 → 跳到 Assistant 会话并收到一条固定回复 |
| 侧栏            | New Task / Assistant / Agents / Auto-task / Skills 均可进入（数据为录制或空），折叠按钮                |

## 和线上的差别

- 发消息不会生成真实 AI 回复，固定回一句「本地镜像」说明（见 `mock-api.js` 的 `LOCAL_REPLY`）。
- 能力卡的 `chip/query/generate` 线上录制时就是 502，本地照样回 502，建议问句走的是兜底配置（和线上表现一致）。
- 点赞状态存在本浏览器 localStorage 的 `mock:likes`，清掉即恢复录制时状态。
- 商品图、chip 图标仍从 Shopee 公网 CDN 加载，断网时不显示。
- 定位默认视为已授权（录制时浏览器已授权，所以线上没弹「访问位置」框）。
- 左下角「Internal Tools」气泡来自录制的 localStorage，可点 × 关掉。

## 已做的本地改版

改版不动 `assets/` 里的线上构建产物，统一放在 `local/overrides.css` 和 `index.html` 头部的内联脚本里。

- 2026-10-24：根路径 `/` 默认进入 `/daily-picks`；去掉左侧侧边栏（`aside[class*='_siteSider_']` 隐藏，内容区自动铺满）。侧边栏去掉后侧栏导航（New Task / Assistant 等）入口也随之消失，发消息后仍会跳到 `/home` 会话页。

## 修改说明

- 改样式 / 文案：直接改 `assets/css/*.css`、`assets/js/*.js`（压缩代码，类名带哈希，可用浏览器 DevTools 定位到文件）。
- 改数据（商品、价格、问句）：改 `mock/data.json` 里对应接口的 `t` 字段（字符串化的 JSON 返回）。
- 调试回放：控制台执行 `localStorage.setItem('mock:debug','1')` 后刷新，每个请求的回放会打印出来。
- 页面源码在 `../migoo-pc-repo/apps/web/src/pages/DailyPicks/`，如需大改可在那里改后重新构建。

> `mock/data.json` 含录制账号的姓名、邮箱、头像和会话标题，不要对外发布。

## 本地改版（`local/`）

线上构建产物不动，改版都在 `local/` 里（`index.html` 末尾引入），右下角悬浮球切换方案 1–5（1 = 线上原版带侧栏，5 = 当前主推：底部输入框 + Explore 首屏）。

| 文件 | 内容 |
| --- | --- |
| `variants.js` | 方案切换悬浮球、顶栏 / 左侧窄栏、输入坞位置与收起、placeholder 轮播、返回按钮 |
| `hero.js` | 方案 4/5 首屏标题、Start here 四张 TRY THIS 卡、页内锚点 |
| `categories.js` | 商品池、低价合集、Big Price Drops、Big Savings 优惠券（Claim now）、对应的 mock 回复 |
| `try-this.js` | Start here 四张卡的创作弹窗（Compare / Track / Budget / Ideas）及其 mock 回复 |
| `chat-cards.js` | 会话页商品卡轮播、单品电商大卡、思考动画、跟进问句 |
| `overrides.css` | 以上全部样式 |

另有一处构建产物补丁：`assets/js/index-B8tGR6gk.js` 里标了 `/*local-patch*/` 的几行（暴露 openPdp、引用附件的增删）。
