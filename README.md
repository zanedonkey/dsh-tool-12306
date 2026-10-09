# dsh-tool-12306

这是一个可以快速帮你查询车票的插件 最速铁路方案传说 黑色大肥鱼上的原生插件

DeepSeek Harness 原生 12306 查询插件，支持车次、余票、中转和经停站查询。基于 [Joooook/12306-mcp](https://github.com/Joooook/12306-mcp) 的查询实现优化，不需要额外启动 MCP Server。感谢大佬开源！

## 🚩Features

| 功能描述 | 状态 |
| --- | --- |
| 直达车次、时刻与余票查询 | ✅ 已完成 |
| 城市和车站解析，车次类型、时间与席别筛选 | ✅ 已完成 |
| 跨午夜出发窗口、按实际日期筛选到达时间 | ✅ 已完成 |
| 两程中转、同站/跨站换乘与等待时间筛选 | ✅ 已完成 |
| 分别指定两程席别，有票席别组合与最低已知票价排序 | ✅ 已完成 |
| 列车经停站与沿途区间查询 | ✅ 已完成 |
| 运行版本诊断、精简输出与整次查询超时 | ✅ 已完成 |

## ⚙️Installation

需要 Node.js **22.19+（22 系列）或 24+**，已验证 DeepSeek Harness **0.2.0-rc.2 / 0.2.1-alpha.1**。自然语言查询需要先在 Harness 中配置可用模型。

### 桌面端

打开 **插件 → 添加插件**，输入：

```text
dsh-tool-12306@0.1.6
```

安装后点击 **立即启用**。也可以从 [GitHub Release](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.6) 下载 `.tgz` 安装包，在添加插件时输入安装包的本地完整路径。

### CLI

在已安装兼容版本 Harness CLI 的环境中执行：

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.6
dsh --profile rail web
```

升级时先卸载旧版，再安装新版；完全退出 Harness（包括托盘后台）后重新打开。

## ▶️Quick Start

安装后会自动注册以下工具，无需填写 MCP 配置：

| Tool | 用途 |
| --- | --- |
| `12306_query_tickets` | 查询直达车次、时刻和余票 |
| `12306_query_transfer` | 查询两程中转、席别组合和已知票价 |
| `12306_train_route` | 查询列车经停站或沿途区间 |
| `12306_plugin_info` | 检查实际运行版本与已启用能力 |

在 Harness 中直接提问：

```text
查明天北京到上海的高铁，只看有二等座的，最多列出 5 趟。

查明天下午两点以后上海虹桥到杭州东的高铁。

查明天深圳到拉萨的中转，第一程二等座、第二程硬卧，
两程都要有票，按最低已知总价排序，列出 5 条路线和每条最多 5 个席别组合。

G1 次列车明天经过哪些车站？

调用 12306_plugin_info，告诉我当前插件实际运行的版本。
```

直达和中转查询可指定 `outputMode: "compact"` 精简模型文本；默认 `full`，完整结构化结果保持不变。

### 从源码构建

```sh
git clone https://github.com/zanedonkey/dsh-tool-12306.git
cd dsh-tool-12306
npm ci
npm run check
npm pack
```

生成的 `.tgz` 可按上述桌面端方式安装。默认测试使用 mock/fixture，不请求真实 12306。

## 📚Documentation

- [插件配置](docs/CONFIGURATION.md)
- [时间窗口与跨午夜查询](docs/TIME_WINDOWS.md)
- [中转席别组合与票价](docs/TRANSFER_PRICING.md)
- [Harness 兼容范围](docs/COMPATIBILITY.md)
- [更新记录](CHANGELOG.md)
- [贡献指南](CONTRIBUTING.md) · [安全报告](SECURITY.md)

## 👉️Reference

- [Joooook/12306-mcp](https://github.com/Joooook/12306-mcp)：站点数据、查询、解析与接口行为的实现参考。感谢作者 Joooook（许可证署名 Jok），保留其 MIT 版权与许可证声明，见 [第三方声明](THIRD_PARTY_NOTICES.md)。
- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)：原生插件运行环境。

## 💭Murmurs

本项目仅提供查询，不提供登录、购票、抢票、支付或验证码绕过，不读取浏览器 Cookie、不存储账号密码。与中国铁路及 12306 官方无隶属或合作关系。

请合理控制请求频率，遵守相关服务条款。12306 上游接口可能变化，余票与价格以官方实时信息为准。中转查询受搜索范围限制；缺失价格返回 `null`，“最低已知票价”不代表全网最低价，跨站换乘请自行核对交通时间。

欢迎提交 Issue 和 PR。项目采用 [MIT License](LICENSE)。

## 🎫Badges

[![CI](https://github.com/zanedonkey/dsh-tool-12306/actions/workflows/ci.yml/badge.svg)](https://github.com/zanedonkey/dsh-tool-12306/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-tool-12306)](https://www.npmjs.com/package/dsh-tool-12306)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
