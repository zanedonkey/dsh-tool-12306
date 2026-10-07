# dsh-tool-12306

Native China Railway 12306 query tools for DeepSeek Harness.

本项目基于 [Joooook/12306-mcp](https://github.com/Joooook/12306-mcp) 的 12306 查询实现进行优化，并迁移为 DeepSeek Harness 原生插件。感谢原项目作者 [Joooook](https://github.com/Joooook)（许可证署名 Jok），保留其 MIT 版权和许可证声明。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22.19%2B%20%7C%2024%2B-green.svg)](package.json)

## Overview

为 DeepSeek Harness 提供中国铁路 12306 的直达车次、余票、中转换乘和经停站查询。以原生 Cordis 插件注册三个模型工具，返回结构化结果，无需额外启动服务。

本项目不是 MCP Server，也不是自动购票或抢票工具。本项目为非官方开源项目，与中国铁路及 12306 官方无隶属或合作关系。

当前版本为 **0.1.4**，包含中转首末程时间窗口、换乘时长筛选、仅同站换乘及后页方案选择改进。[npm](https://www.npmjs.com/package/dsh-tool-12306) 安装与本地构建步骤见下文。现有 [GitHub v0.1.3 Release](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.3) 的安装包不包含这些改进。

## Features

- 直达车次、时刻、余票和已知格式的席位价格。
- 城市/车站解析；G/D/C/Z/T/K 车次类型及指定席别有票筛选。
- 跨午夜出发窗口和按真实日期、时间筛选到达。
- 两程中转、每程余票、等待时间及跨站换乘信息。
- 中转首末程时间窗口、最短/最长换乘间隔和仅同站方案（0.1.4 起）。
- 按车次编号查询完整经停线路，或截取沿途区间。
- DeepSeek Harness 原生结构化输出、取消和卸载清理。

不提供登录、购票、抢票、支付、验证码绕过或账号自动化；不读取浏览器 Cookie，不导入 12306 登录凭据。

## Requirements

| 项目 | 已验证范围 |
| --- | --- |
| Node.js | `^22.19.0 \|\| >=24.0.0`；CI 验证 Node 22、24 |
| DeepSeek Harness | `0.2.0-rc.2` 或 `0.2.1-alpha.1` |
| Cordis | rc.2 对应 `4.0.4`；alpha 对应 `4.0.5-alpha.1` |
| 网络 | 能够访问 `www.12306.cn`、`kyfw.12306.cn`、`search.12306.cn` |

自然语言使用需要宿主已配置可用模型。Harness preview 版本变化较快，插件只声明上述两套已验证 SDK 的兼容范围，升级宿主后需重新验证；见 [兼容性记录](docs/COMPATIBILITY.md)。

## Installation

### 从 npm 安装

桌面端打开“插件 → 添加插件”，输入 `dsh-tool-12306@0.1.4`，安装后点击“立即启用”。已安装旧版时，先卸载旧版再安装新版本。

CLI 使用已安装的兼容版本 `dsh`：

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.4
dsh --profile rail --dump-config
dsh --profile rail web
```

如果只需要把包作为 Node.js 项目依赖安装，可以执行 `npm install dsh-tool-12306@0.1.4`；在 Harness 中启用工具请使用上面的插件安装流程。

### 下载预编译安装包

现有 GitHub Release 提供旧版 0.1.3，不支持本文的中转新增筛选。需要 0.1.4 请使用 npm 或源码构建；本次不创建新 GitHub Release。

从 [v0.1.3 Release](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.3) 下载：

- [dsh-tool-12306-0.1.3.tgz](https://github.com/zanedonkey/dsh-tool-12306/releases/download/v0.1.3/dsh-tool-12306-0.1.3.tgz)
- [SHA-256 校验文件](https://github.com/zanedonkey/dsh-tool-12306/releases/download/v0.1.3/dsh-tool-12306-0.1.3.tgz.sha256)

对照校验文件核对安装包的 SHA-256。桌面端打开“插件 → 添加插件”，输入下载的 `.tgz` 文件的本地完整路径，安装后点击“立即启用”。已安装旧版时，先卸载旧版，再安装新包。CLI 安装命令见下文。

### 从源码生成安装包

使用已验证范围内的 Node.js：

```sh
git clone https://github.com/zanedonkey/dsh-tool-12306.git
cd dsh-tool-12306
npm ci
npm run build
npm test
npm pack
```

这会生成 `dsh-tool-12306-0.1.4.tgz`，包含编译后的 ESM 和 TypeScript 声明文件。桌面端按上面的本地路径方式安装；不要启用不兼容版本豁免。

CLI：在安装包所在目录，用已经安装的兼容版本 `dsh` 执行：

```sh
dsh plugin --profile rail add ./dsh-tool-12306-0.1.4.tgz
dsh --profile rail --dump-config
dsh --profile rail web
```

安装流程参考 [Harness 官方 bundle 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)，使用本项目真实的 `dsh.bundle.patch`。桌面端与 CLI 的安装和 profile 独立，更新全局 CLI 不会更新桌面端插件。

直接从 GitHub 安装源码没有自动编译的 `prepare` 脚本。请使用 npm 包或 Release 的预编译 `.tgz`，或者按上面的源码流程构建。

## DeepSeek Harness Configuration

安装 bundle 后会自动应用根目录的 [cordis.patch.yml](cordis.patch.yml)：

```yaml
- insert:
    - id: tool-12306
      name: dsh-tool-12306
```

无需重复添加激活行。可在所选 profile 的 `cordis.patch.yml` 中覆盖配置：

```yaml
- id: tool-12306
  config:
    timeoutMs: 15000
    requestIntervalMs: 1000
    maxResults: 20
```

配置 schema 会填入未指定的默认值。全部配置、请求限制和可选 overlay 见 [Configuration](docs/CONFIGURATION.md)。

## Usage

向已加载插件的 Harness Agent 提问；模型负责将相对日期转换为中国时区的 `YYYY-MM-DD`，并调用合适的工具。

- 查明天北京到上海的高铁，只看有二等座的。
- 查 10 月 10 日下午两点以后上海虹桥到杭州东的高铁。
- 深圳到拉萨有哪些中转方案？
- G1 次列车经过哪些车站？
- 查明晚 23 点到后天凌晨 2 点北京到上海的车。

省略日期的中转/余票自然语言请求需由模型补全日期；经停工具可默认中国当天。指定日期应处于官方可查询范围内。

## Available Tools

### `12306_query_tickets`

查询两个城市或车站之间的直达列车和余票。

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `date` | 是 | 乘车日期 `YYYY-MM-DD`，不得早于中国当天 |
| `from` / `to` | 是 | 城市或车站中文名，例如北京、北京南 |
| `trainTypes` | 否 | 数组，支持 `G`、`D`、`C`、`Z`、`T`、`K`；省略不筛类型 |
| `onlyAvailable` | 否 | 仅有票；候补和未知余票不算有票 |
| `seatType` | 否 | 配合 `onlyAvailable` 指定席别；二等座为 `secondClass` |
| `departureAfter` / `departureBefore` | 否 | 含边界的 `HH:mm`；下限晚于上限时跨到次日 |
| `arrivalAfter` / `arrivalBefore` | 否 | `HH:mm` 或中国当地 `YYYY-MM-DDTHH:mm`，按实际到达日期比较 |
| `maxResults` | 否 | 1–100，默认 20 或插件配置值 |

输出为 `{ query: { date, from, to }, trains: [...] }`。每辆车包含编号、站名和代码、实际出发/到达日期时间、历时分钟及各席别的 `available`、`count`、`price`、`status`。未知值保留 `null`；价格若可知以人民币元表示。

席别枚举：`business`、`specialClass`、`firstClass`、`secondClass`、`premiumSleeper`、`softSleeper`、`hardSleeper`、`softSeat`、`hardSeat`、`standing`、`movingSleeper`、`other`。状态枚举：`available`、`unavailable`、`waitlist`、`notOffered`、`unknown`。

### `12306_query_transfer`

查询官网提供的两程中转换乘方案。必填 `date`、`from`、`to`；可选 `transferStation`、`trainTypes`、`onlyAvailable`、`seatType`、`maxResults`，取值与上述定义一致。类型和有票条件要求**两程均满足**。

以下参数从 **0.1.4** 起支持，旧版 0.1.3 不支持：

| 参数 | 说明 |
| --- | --- |
| `departureAfter` / `departureBefore` | 仅筛选**首程**出发，含边界 `HH:mm`；下限晚于上限时内部查询乘车日和次日 |
| `arrivalAfter` / `arrivalBefore` | 仅筛选**末程**实际到达日期时间；`HH:mm` 锚定 `date`，也支持中国当地 `YYYY-MM-DDTHH:mm` |
| `minTransferMinutes` / `maxTransferMinutes` | 含边界的换乘间隔分钟数，非负安全整数；最短不能大于最长；省略时不额外限制 |
| `sameStationOnly` | `true` 仅返回前程到达站代码与后程出发站代码相同的方案；省略或 `false` 允许跨站 |

换乘间隔是两程时间差，不能保证实际赶得上车；同站也可能需要较长的出站、进站或安检时间。跨站交通耗时需自行核对。不会自动计算安全换乘时间。

输出为 `{ query, routes: [...], truncated }`。每个方案包含 `firstLeg`、`secondLeg`、`totalDurationMinutes`、`transferStation`、`transferToStation`、`sameStation`、`transferMinutes`。

0.1.4 会在 `maxTransferPages` 范围内继续扫描后页，保留符合条件且总历时最短的最多 `maxResults` 个去重方案，并按总历时排序。分页上限按首程乘车日期分别计算；默认每个日期最多 3 页，跨午夜两个日期最多 6 页，保持串行限速。`truncated: true` 表示丢弃了超过结果上限的方案或仍有未读取页面，不保证全局最优；仅重复方案或结果数恰好等于上限不会单独触发此标记。旧版 0.1.3 则可能在达到结果数后提前停止分页。

### `12306_train_route`

查询指定列车的经停站。必填 `trainCode`（例如 `G1`）；可选 `date`（默认中国当天）、`from`、`to`（截取沿途区间）。无需提供内部 `train_no` 或站代码。

输出为 `{ trainCode, date, stations: [...] }`。每站包含 `stationName`、`arrivalTime`、`departureTime`、`stopMinutes`、`arrivalDayOffset`；首站到达、终站出发和不可知值为 `null`。

工具错误通过 Harness 原生错误结果返回（`isError` 和文本内容），不以成功结果中的空数组掩盖网络、解析、日期或站名错误。完整字段定义见 [src/types.ts](src/types.ts) 和 [工具 schema](src/tools/schema.ts)。

## Examples

以下参数展示筛选规则，日期和车次不代表实时运行图；使用时请换成有效乘车日期。

```json
{
  "date": "2026-10-10",
  "from": "上海虹桥",
  "to": "杭州东",
  "trainTypes": ["G"],
  "onlyAvailable": true,
  "seatType": "secondClass",
  "departureAfter": "14:00",
  "maxResults": 10
}
```

跨午夜：`date = 2026-10-10`、`departureAfter = 23:00`、`departureBefore = 02:00` 表示 10 月 10 日晚间至 11 日凌晨。单次工具调用内部顺序查询两天，合并排序后限制结果数。次日请求失败会明确报错，不返回不完整结果。

到达 `HH:mm` 锚定乘车日；单独 `arrivalBefore: "02:00"` 指当天凌晨 2 点。要筛**次日**凌晨，应使用 `arrivalAfter: "2026-10-11T00:00"`、`arrivalBefore: "2026-10-11T02:00"`。这是 0.1.3 的语义变更，迁移及边界详见 [Time Windows](docs/TIME_WINDOWS.md)。

中转筛选示例（**0.1.4 起**）：

```json
{
  "date": "2026-10-10",
  "from": "深圳",
  "to": "拉萨",
  "departureAfter": "16:00",
  "arrivalBefore": "2026-10-12T22:00",
  "minTransferMinutes": 60,
  "maxTransferMinutes": 240,
  "sameStationOnly": true,
  "maxResults": 10
}
```

可以向模型说：“查 10 月 10 日深圳到拉萨的中转，首程下午四点以后出发，换乘间隔一到四小时，只看同站换乘，最晚 12 日晚上十点到。”条件过严可能返回空方案，这不表示存在满足条件的列车。出发条件只用于首程，到达条件只用于末程；到达窗口不会单独扩展乘车日期。

## Architecture

```text
DeepSeek Harness
      ↓
dsh-tool-12306 / Tool Layer
      ↓
12306 Client + Station Resolver
      ↓
China Railway 12306 HTTPS
      ↓
Response validation / Parser
      ↓
Structured result → Harness
```

No MCP server is involved.

```text
src/
├── index.ts       # Cordis 生命周期和工具注册
├── tools/         # 模型参数及结构化输出 schema
├── client/        # 匿名 HTTP、限速和查询编排
├── stations/      # 车站数据及名称解析
├── parser/        # 纯响应解析
└── types.ts       # 原始数据与输出类型
```

`execute` 返回 canonical value；`output.render` 将同一值渲染为 JSON。Client 和工具注册随插件卸载释放。设计依据见 [Technical Design](docs/TECHNICAL_DESIGN.md)。

## Development

```sh
npm ci
npm run build
npm run lint
npm test
```

`build` 同时检查源码和测试的 TypeScript 类型；不存在独立的 `typecheck` 脚本。`npm run check` 按序完成 build、lint、test。依赖更新建议使用 npm 11；普通安装使用锁文件。贡献步骤、两套 SDK 的锁文件和维护方法见 [CONTRIBUTING.md](CONTRIBUTING.md)；发布步骤见 [RELEASING.md](docs/RELEASING.md)。

## Testing

默认测试完全离线，未模拟的 `fetch` 会被拒绝。Fixture 均为人工构造，不能作为真实时刻或票价。测试覆盖解析、跨日筛选、HTTP/Cookie、限速/取消、分页、真实 Cordis Loader、ToolRuntime、AgentLoop 和卸载。

Loader 测试加载 `dist/index.js`，请先 build。AgentLoop 使用脚本模型和模拟 HTTP，验证调度链路，**不代表在线模型自然语言理解验收**。

仅以下命令访问真实 12306，普通 CI 和 PR 不执行它：

```sh
npm run test:integration
```

## Limitations

- 本项目依赖 12306 网站/API 的公开可访问行为；上游变化可能暂时导致查询不可用，不保证官方接口兼容。
- 数据仅反映请求时状态，可能受到维护、预售期、运行图及限流影响，以官方渠道为准。
- 城市使用官方同名代表站语义，不穷举所有城市车站组合；多个候选且无代表站时要求明确车站。“北京站”是具体站，“北京”是城市。
- 中转仅两程、有限分页；自行确认跨站交通及换乘时间。
- 未知票量/票价为 `null`，不推算库存；同一席别存在不同铺位价格时不强行合并。
- 早期 `0.x` 版本可能调整参数语义；不承诺永久稳定或生产可用性。

## Security & Privacy

默认请求间隔 1000ms，每次临时网络/服务器故障最多重试一次；遇 429 至少冷却 60 秒。请合理控制频率、遵守适用服务条款，不恶意自动化、高频访问或尝试绕过 12306 安全机制。

仅查询初始化产生的匿名 Cookie 保存在内存，不落盘、不读取浏览器 Cookie、不存储账号密码、不持久化登录态。自行修改代码导入登录 Cookie 不属于支持范围。

12306 会收到查询日期、站点/车次、出口 IP 和请求头；宿主及模型提供方可能保存或处理会话和工具结果。插件匿名查询不意味着行程完全匿名。安全报告、泄露处理及隐私边界见 [SECURITY.md](SECURITY.md)。

## Acknowledgements

- [Joooook/12306-mcp](https://github.com/Joooook/12306-mcp)，作者 [Joooook](https://github.com/Joooook)（许可证署名 Jok）：本项目基于其 12306 查询实现优化，改写了车站数据布局、票务字段映射、价格解析、响应类型和请求参数等部分。在此基础上增加 DeepSeek Harness 原生工具集成、请求节流与取消处理、跨午夜出发窗口和按实际到达日期筛选等改进。保留上游 MIT 版权和许可证声明；未引入其 MCP runtime。
- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 提供原生工具协议、Cordis 生命周期、SDK 和 bundle 加载规范。

代码来源、研究快照和必要许可文本见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。社区行为准则见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## License

[MIT](LICENSE)。本项目代码许可证不授予 12306 接口或数据的使用权限。
