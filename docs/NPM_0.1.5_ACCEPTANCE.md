# npm 0.1.5 publication verification

2026-10-07，经维护者明确授权，账号 `zanedonkey` 使用官方 npm CLI 手工发布 `dsh-tool-12306@0.1.5`。公开注册表已确认版本可下载，`latest` 指向 `0.1.5`。

- [npm package](https://www.npmjs.com/package/dsh-tool-12306)
- [Public tarball](https://registry.npmjs.org/dsh-tool-12306/-/dsh-tool-12306-0.1.5.tgz)
- Size: 58,875 bytes; 90 files; unpacked size: 316,876 bytes.
- SHA-256: `4cbae16254c7b3723723d676ed15ab6da256ecd7a0bd420dba508cb7439facbf`
- Registry integrity: `sha512-X7ZjGjribEtQIpZ5acjUXCxpxXkmaKOHPJNqEoNnCLIkP/tlzTnnuuHB8zUpo8L47B/RIvGaZ7p5yUvPMtV4+w==`

匿名下载的公开 tarball 与发布前审查的候选包逐字节一致；SHA-256、SHA-512 integrity 和 shasum 均匹配。包包含编译后的 ESM、TypeScript 声明、原生 bundle patch、席别价格文档和 MIT/上游许可证声明；不包含测试 fixture、凭据、日志或 GitHub 内部配置。

## Source and CI

功能和包内容对应源码提交 [25409dc](https://github.com/zanedonkey/dsh-tool-12306/commit/25409dccf62be35b295d21a0707fed3cca381f46)。使用 GitHub noreply 邮箱，正常推送到 main，未重写历史。

[GitHub Actions](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37625718958) 的 Windows/Ubuntu、Node 22/24、两套 SDK 共 8 个任务全部通过，包括 npm ci、build、lint、154 项离线测试和 npm pack --dry-run。本地两套 SDK 同样通过干净安装、build、lint 和 154 项测试，依赖审计未报告漏洞。

## Published package verification

两个独立消费环境改为公共注册表精确版本 `0.1.5`，锁文件 resolved URL 与公开 tarball、integrity 一致，再执行 npm ci 全新安装：

| Harness SDK | Cordis | Result |
| --- | --- | --- |
| `0.2.0-rc.2` | `4.0.4` | 17 次原生工具调用、Loader 加载、卸载和重载通过 |
| `0.2.1-alpha.1` | `4.0.5-alpha.1` | 17 次原生工具调用、Loader 加载、卸载和重载通过 |

使用 Node.js 24.21.0 和人工 HTTP fixture，覆盖三个工具、canonical 输出、非法输入、直达与中转跨午夜、实际到达日期、换乘筛选、逐程混合席别、130 元人工合计示例、完整已知价格优先、缺价返回 null 以及结果上限。没有版本豁免或 MCP 层，不访问真实 12306；没有重新执行桌面界面安装。

## Installation

桌面端“插件 → 添加插件”输入 `dsh-tool-12306@0.1.5`，安装后启用。旧版用户先卸载再安装。CLI：

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.5
```

## GitHub Release status

v0.1.5 的安装包、校验文件和 [发布说明](RELEASE_NOTES_0.1.5.md) 已准备，但尚未创建 GitHub tag / Release。Windows Computer Use 因无法可靠识别浏览器网址而停止；npm 发布不依赖电脑控制，已独立完成。

发布包中的 README 在准备阶段已填写计划的 v0.1.5 Release 下载链接；这些链接需要对应 Release 创建后才可用。目前安装请使用 npm。npm tarball 不可覆盖，GitHub README 已更新为实际发布状态；包的运行代码与已验证源码一致。
