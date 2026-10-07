# npm 0.1.4 publication verification

2026-10-07，经维护者明确授权，账号 `zanedonkey` 使用官方 npm CLI 手工发布 `dsh-tool-12306@0.1.4`。公开注册表已确认版本可下载，`latest` 指向 `0.1.4`。

- Package: https://www.npmjs.com/package/dsh-tool-12306
- Tarball: https://registry.npmjs.org/dsh-tool-12306/-/dsh-tool-12306-0.1.4.tgz
- Size: 53,546 bytes; 86 files; unpacked size: 293,343 bytes.
- SHA-256: `98d899627a38f8ece5a645b232af187919f46f6e1746dc1a9329c1271fcce333`
- Registry integrity: `sha512-Kc8XE95lBp8jfq+quOIikjxXwkZi6OxyvYNSYbQmAhBxUC0NU3Kx+mBih7PFePkspe9da52DSlZjYLYIIcRlQg==`

匿名下载公开注册表 tarball 后，与发布前已审查的候选包逐字节一致，SHA-256、SHA-512 integrity 和 shasum 均匹配。包包含编译后的 ESM、TypeScript 声明、原生 bundle patch 和 MIT/上游许可证声明；不包含测试 fixture、凭据、日志或 GitHub 内部配置。

## Source and CI

本次功能与发布元数据对应源码提交 [e8f2138](https://github.com/zanedonkey/dsh-tool-12306/commit/e8f21384fac3403bfa0b8b3112b26785876a428a)。使用 GitHub noreply 邮箱，正常推送到 `main`，未重写历史。

[该提交的 GitHub Actions](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37567453951) 的 Windows/Ubuntu、Node 22/24、两套 SDK 共 8 个任务全部通过，包含 `npm ci`、build、lint、134 项离线测试和 `npm pack --dry-run`。本地两套 SDK 同样通过干净安装、build、lint 和 134 项测试，依赖审计未报告漏洞。

## Published package verification

发布后将两个独立消费环境的依赖改为公共注册表的精确版本，核对锁文件实际下载 URL 和 integrity，再执行 `npm ci` 全新安装：

| Harness SDK | Cordis | Result |
| --- | --- | --- |
| `0.2.0-rc.2` | `4.0.4` | 13 次原生工具调用、Loader 加载、卸载及重载通过 |
| `0.2.1-alpha.1` | `4.0.5-alpha.1` | 13 次原生工具调用、Loader 加载、卸载及重载通过 |

消费验证使用 Node.js `24.21.0` 和人工 HTTP fixture，覆盖三个工具、canonical 输出、非法输入、直达跨午夜与真实到达日期，以及中转首程/末程窗口、换乘间隔、仅同站筛选和跨午夜两天查询。没有版本豁免或 MCP 层，不访问真实 12306；没有重新执行桌面界面安装。

## Installation

桌面端“插件 → 添加插件”输入 `dsh-tool-12306@0.1.4`，安装后启用。旧版用户先卸载再安装。CLI：

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.4
```

本次只更新 GitHub 源码和 npm 包，没有创建 `v0.1.4` Git tag 或 GitHub Release，也没有改动现有 `v0.1.3` Release 及附件。该旧版 Release 不包含本次中转改进。0.1.3 的历史发布记录保留在 [NPM_RELEASE_ACCEPTANCE.md](NPM_RELEASE_ACCEPTANCE.md)。
