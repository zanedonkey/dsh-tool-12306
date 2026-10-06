# Changelog

采用 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 的分组方式和 [Semantic Versioning](https://semver.org/)。0.1.3 是首次 GitHub Release；更早的版本为本地开发记录，未公开发行。尚未发布 npm 包。

## [Unreleased]

暂无待发布条目。

## [0.1.3] - 2026-10-06

### Added

- 首次 GitHub Release 的预编译 `.tgz` 安装包及 SHA-256 校验文件。
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
