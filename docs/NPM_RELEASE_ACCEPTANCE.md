# npm 0.1.3 publication verification

2026-10-06，经维护者明确授权，账号 `zanedonkey` 使用官方 npm CLI 手工发布 `dsh-tool-12306@0.1.3`。npm 注册表已确认版本存在，发布当时 `latest` 指向 `0.1.3`。

- Package: https://www.npmjs.com/package/dsh-tool-12306
- Tarball: https://registry.npmjs.org/dsh-tool-12306/-/dsh-tool-12306-0.1.3.tgz
- Size: 50,386 bytes; 86 files; unpacked size: 281,894 bytes.
- SHA-256: `c6057cf83e4db6270c5736e6e67826e684f2bb23ce46d6421f2bb4375adf8f9e`
- Registry integrity: `sha512-blZWaav8YTXzyFrG3k5vu/yi8QZpUEYyKyg8ZUlfQyE13PfwFYHcM6ad8+jPzbyZJlhkfNCWGvJiDG1WjENpuQ==`

匿名下载注册表 tarball 后，SHA-256 与待发布文件一致。75 个 `dist/` 文件与已验证的 GitHub v0.1.3 Release 完全相同；npm 包补充了 README 的 npm 安装步骤和上游署名。因此不同渠道的归档校验值不同，GitHub 已发布附件和 tag 保持不变。包内 CHANGELOG 是发布前快照，完整发布记录以仓库当前 CHANGELOG 为准。

## Verification

发布前按锁文件执行 `npm ci`，依赖审计 0 个漏洞；构建、lint、113 项离线测试通过。包内容检查未发现 `.env`、`.npmrc`、测试 fixture、日志或 GitHub 内部配置，保留 MIT 和 Jok 的上游版权声明。

发布后从公共注册表安装精确版本，使用两个独立消费环境验证，未复用另一套 SDK：

| Harness SDK | Cordis | Result |
| --- | --- | --- |
| `0.2.0-rc.2` | `4.0.4` | 8 次原生工具调用、Loader 加载、卸载和重载通过 |
| `0.2.1-alpha.1` | `4.0.5-alpha.1` | 8 次原生工具调用、Loader 加载、卸载和重载通过 |

消费验证使用 Node.js `24.21.0` 和固定 HTTP fixture，覆盖三个工具、canonical 输出、非法输入、跨午夜两天查询、G9271 次日到达及日期感知的到达筛选。无版本豁免、无 MCP 层，不访问真实 12306。此次验证没有重新执行桌面界面安装；此前桌面安装记录见 [DESKTOP_ACCEPTANCE.md](DESKTOP_ACCEPTANCE.md)。

## Installation

桌面端“插件 → 添加插件”输入 `dsh-tool-12306@0.1.3`，安装后启用。CLI：

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.3
```
