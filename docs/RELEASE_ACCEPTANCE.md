# v0.1.3 release artifact verification

验证日期：2026-10-06。正式发行包在原已验收代码上更新 README 的 Release 下载说明及 CHANGELOG，版本仍为 0.1.3。源码、依赖、SDK 范围和工具协议没有变化。

## Package

- 文件：`dsh-tool-12306-0.1.3.tgz`，50,088 bytes，86 个发布文件。
- 解包后与旧候选包逐文件比较：仅 README.md、CHANGELOG.md 不同；全部 75 个 dist 编译文件、包信息、bundle patch 及其他文件一致。
- `npm run check` 通过：源码和测试类型构建、lint、13 个文件中的 113 项离线测试。
- 发布文件白名单检查通过；没有测试 fixture、凭据、日志、本地配置、开发依赖或本机验收证据。

```text
SHA-256: 28e39f3679d151479d2fa3917590eef7b59e4171828b889652f6a1f6155e3942
```

此值对应正式发行包，与 [旧候选包](RELEASE_CANDIDATE.md) 的校验值不同。安装时请使用 [v0.1.3 Release](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.3) 附件自己的 `.sha256` 文件。

## Installed runtime

将正式发行 tarball 分别通过官方 DSH 0.2.0-rc.2 和 0.2.1-alpha.1 CLI 安装到隔离 profile，使用各自宿主 Cordis / dsh-tools。两套环境均通过 8 次离线工具调用、canonical 输出核对、错误处理、单次调用跨午夜、按日期筛选到达、卸载解绑及重载；没有兼容豁免。HTTP 全部为脱敏合成 fixture，没有新增真实 12306 请求。

之前的真实 rc.2 桌面安装及在线模型查询见 [DESKTOP_ACCEPTANCE.md](DESKTOP_ACCEPTANCE.md)。本次正式发行包只改变两份用户文档，桌面端运行代码与此前安装验收完全一致；没有声称再次在桌面界面安装这份新 tarball。

## Publication procedure

源码提交到 main 后核对该提交自身的 8 项 GitHub CI，再创建对应 tag / Release。附件上传后核对文件名称、大小与 SHA-256，确认完整才公开发布。npm 发布不属于这次操作。
