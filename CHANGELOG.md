# Changelog

采用 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的分组方式和 [Semantic Versioning](https://semver.org/)。0.1.3 是首次 GitHub Release 和 npm 发布；更早的版本为本地开发记录，未公开发行。

## [Unreleased]

## [0.1.6] - 2026-10-09

### Added

- 新增不联网的 `12306_plugin_info`，报告已加载版本、Node.js、工具能力和超时配置，便于排查安装版本与运行能力不一致。
- 直达和中转支持 `outputMode: "compact"`，精简模型文本，保留明确有票/指定席别、实际日期和中转价格组合；默认完整输出及原生结构化结果不变。
- 新增 `queryTimeoutMs`（默认 60 秒，100–300000 毫秒），整次查询共同预算覆盖排队、初始化、限速、重试、分页和响应体；超时返回明确错误并取消当前调用，不影响共享请求的其他订阅。

### Changed

- HTTP User-Agent 从包元数据读取版本，移除固定的 0.1.3 标识。

- 更新安全维护范围、中转分页限制和 0.1.5 兼容性验收入口。
- 明确旧版审查、候选包和 npm 发布记录属于历史快照，修正 latest 与已发布包不可覆盖的说明。
- 补齐 GitHub About、npm Website 和相关 Topics；开启私密漏洞报告并同步 SECURITY 指引。

## [0.1.5] - 2026-10-07

### Added

- 中转新增 `firstSeatType`、`secondSeatType`，独立覆盖对应程的共同 `seatType`，兼容原有有票筛选语义。
- 返回当前两程明确有票的席别组合、各程已知票价、人民币票价合计和最低已知合计；缺失价格保留 `null`，标记价格不完整。
- 新增 `sortBy: "price"`，在有限分页内按最低已知组合总价选取路线，未知合计排后，同价按历时；默认仍按总历时。
- 新增 `maxSeatCombinations`（1–20，默认 5），组合截断与路线分页截断分别标记；不新增外部补价请求。
- 增加混合席别、共同席别回退、未知/冲突价格、金额精度、限长、后页低价选择及原生 ToolRuntime 回归测试。

## [0.1.4] - 2026-10-07

### Added

- 中转查询增加首程出发和末程实际到达时间窗口，支持跨午夜首程出发及明确到达日期时间。
- 增加 `minTransferMinutes`、`maxTransferMinutes` 和 `sameStationOnly`，保持原有两程类型/余票筛选及输出结构。
- 离线回归测试覆盖时间边界、跨日、换乘间隔、仅同站、参数校验、分页选择和真实 Harness ToolRuntime。

### Changed

- 中转在配置分页范围内选择总历时最短的最多 `maxResults` 个去重方案，避免第一页填满后漏掉后页更快方案；保留候选数量受结果上限约束。
- `maxTransferPages` 按首程乘车日期分别计算，跨午夜最多查询两个日期；默认最多 6 页，保持串行限速，后一天失败时整个查询报错。
- `truncated` 表示舍弃了超过数量上限的方案或有未读取页面；恰好达到结果数上限或只有重复方案不会单独触发。

## [0.1.3] - 2026-10-06

### Added

- 首次 GitHub Release 的预编译 `.tgz` 安装包及 SHA-256 校验文件。
- 首次发布 [npm 包 dsh-tool-12306@0.1.3](https://www.npmjs.com/package/dsh-tool-12306)，支持按包名安装到 Harness profile。
- 贡献指南、安全报告流程、Contributor Covenant、Issue/PR 表单、Dependabot 和发布流程文档。
- 两套支持的 Harness SDK 锁文件及只读、默认离线的 CI 检查。

### Changed

- README 面向用户重排，提供 Release 下载与实际桌面安装步骤，移除开发机路径。
- 补全真实 GitHub package metadata，收紧发行文件白名单和忽略规则。
- 开发测试依赖 Vitest 升级到 4.1.11，修复 audit 中 mocker/tinypool 开发依赖告警；Harness 和运行协议保持原版本。

- 单次工具调用支持跨午夜出发窗口，内部顺序查询乘车日和次日，统一按出发日期/时间排序后限制结果数量。
- 到达筛选改为真实日期与时间比较，支持中国当地 YYYY-MM-DDTHH:mm；两个 HH:mm 的晚到早窗口自动跨到次日。
- 迁移提醒：单独到达 HH:mm 锚定乘车 date，不再按各车实际到达日重复匹配。筛次日凌晨时应明确传次日日期时间。
- 增加跨午夜、跨月/年、同钟点不同日、边界、非法日期、原生 ToolRuntime 和 AgentLoop 的回归测试。

## [0.1.2]

### Changed

- 429 后进入跨调用冷却，支持 Retry-After，冷却期间排队及后续请求直接失败。
- 合并相同 URL 的在途 HTTP 请求；取消隔离，不缓存已完成的余票数据。
- 流式响应大小和不同在途请求数量上限，响应体读取仍受超时/取消控制。
- 匿名 Cookie 增加路径、域、有效期、数量和长度约束。
- 保持默认 1000ms 请求间隔，SDK 兼容范围仍为两个已验证版本。
- 补充接口授权与行程隐私说明。

## [0.1.1]

### Changed

- 兼容 DSH 0.2.0-rc.2 和 0.2.1-alpha.1，包含独立 SDK 的构建与测试验证。

## [0.1.0]

### Added

- 三个 Harness 原生铁路查询工具和独立匿名 HTTP Client。
