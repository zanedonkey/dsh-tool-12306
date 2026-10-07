# v0.1.5 — Transfer seat combinations and pricing

Native China Railway 12306 query tools for DeepSeek Harness.

## Highlights

- 中转支持两程分别指定席别：`firstSeatType` / `secondSeatType`，例如二等座＋硬卧、一等座＋软卧。两程独立覆盖共同 `seatType`，保持已有筛选兼容。
- 每条路线展示当前明确有票的席别组合、各程已知票价和人民币合计；任一程价格缺失时合计为 `null`，并标记 `incomplete`。
- `sortBy: "price"` 按最低完整已知组合总价选择路线，未知价格排后，同价按总历时。默认仍按总历时。
- `maxSeatCombinations` 默认 5、范围 1–20；列表截断与路线分页截断分别标记，无额外补价请求。
- 包含 0.1.4 的中转首末程时间窗口、跨午夜出发、换乘时长和仅同站筛选改进。

## Installation

在 DeepSeek Harness 桌面端“插件 → 添加插件”输入 `dsh-tool-12306@0.1.5`，安装后立即启用。已安装旧版时先卸载旧版。

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.5
```

也可下载本 Release 的 `dsh-tool-12306-0.1.5.tgz` 与对应 `.sha256` 文件，核对 SHA-256 后在桌面端输入安装包本地完整路径。CLI：

```sh
dsh plugin --profile rail add ./dsh-tool-12306-0.1.5.tgz
```

需要 Node.js 22.19+ 或 24+；已验证 DeepSeek Harness `0.2.0-rc.2` / `0.2.1-alpha.1`。

## Available tools

- `12306_query_tickets`：直达车次、余票、时间窗口和席别筛选。
- `12306_query_transfer`：两程中转、换乘筛选、席别组合和已知总价排序。
- `12306_train_route`：指定列车经停站及沿途区间。

自然语言示例：查深圳到拉萨的中转，第一程二等座、第二程硬卧，只看两程有票的，按已知总价从低到高列出。

## Validation

两套支持的 SDK 均通过 build、lint、154 项离线测试。候选安装包分别通过真实 Harness Loader 加载、17 次原生 ToolRuntime 调用、三个工具、跨午夜筛选、混合席别、总价、缺价排序、卸载和重载验证。测试使用人工 fixture，不访问真实 12306。

## Known limitations

票价只来自现有查询响应中可解析的字段，缺失或冲突价格保留 `null`；最低已知价格不代表所有路线或未知票价中的全局最低。中转只读取配置允许的分页，余票为查询时快照。

不支持同一列车分段换席、不购票、不抢票、不登录、不绕过验证码、不支付。本项目与中国铁路及 12306 官方无隶属或合作关系；上游接口行为可能变化。详见 [席别与价格规则](https://github.com/zanedonkey/dsh-tool-12306/blob/v0.1.5/docs/TRANSFER_PRICING.md)。

## Acknowledgements and license

基于 [Joooook/12306-mcp](https://github.com/Joooook/12306-mcp) 的查询实现进行优化并迁移为 Harness 原生插件，无 MCP Server 或 MCP 依赖。感谢作者 Joooook（许可证署名 Jok）与 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)。MIT License，保留上游版权和许可证声明。
