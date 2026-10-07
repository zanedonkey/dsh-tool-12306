# GitHub v0.1.5 release verification

2026-10-07，经维护者明确授权，使用一次性 GitHub Actions 工作流发布 [v0.1.5 Release](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.5)。Release 已公开，非 prerelease，GitHub latest 指向 v0.1.5。

## Source and validation

标签 v0.1.5 指向 [25409dc](https://github.com/zanedonkey/dsh-tool-12306/commit/25409dccf62be35b295d21a0707fed3cca381f46)，与 npm 发布的功能源码一致。[该源码的 CI](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37625718958) 共 8 个任务通过，涵盖 Windows/Ubuntu、Node 22/24、两套 Harness SDK 的 npm ci、build、lint、154 项离线测试和 pack 检查。

发行包已通过两套 Harness SDK 的真实 Loader、各 17 次原生工具调用、卸载及重载验证；使用人工 fixture，不访问真实 12306。公开 npm 包安装验收见 [NPM_0.1.5_ACCEPTANCE.md](NPM_0.1.5_ACCEPTANCE.md)。

## Assets

- [dsh-tool-12306-0.1.5.tgz](https://github.com/zanedonkey/dsh-tool-12306/releases/download/v0.1.5/dsh-tool-12306-0.1.5.tgz)：58,875 bytes，90 个 npm 文件。
- [dsh-tool-12306-0.1.5.tgz.sha256](https://github.com/zanedonkey/dsh-tool-12306/releases/download/v0.1.5/dsh-tool-12306-0.1.5.tgz.sha256)：91 bytes。
- SHA-256：`4cbae16254c7b3723723d676ed15ab6da256ecd7a0bd420dba508cb7439facbf`。

工作流从公开 npm 下载已验收 tarball，核对固定 SHA-256、文件大小和必需 package 内容。先创建 draft，上传两项附件，再重新下载并逐字节比对，验证通过后公开 Release。发布后又匿名下载两个公开附件，确认与本地验收包及校验文件一致；GitHub 与 npm 0.1.5 安装包完全相同。

## Publication method and cleanup

[一次性发布任务](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37628054401) 成功。使用 GitHub 为任务提供的临时 GITHUB_TOKEN，仅发布 job 具有 contents:write；没有创建个人 token、保存凭据或修改仓库权限设置。

发布完成后移除 `.github/workflows/release-0.1.5.yml`，普通 CI 继续使用 contents:read。已有 v0.1.3 Release、标签和附件保持原样。未来发布仍需维护者授权，不配置自动 npm 发布。

## Installation

下载本 Release 安装包并核对对应 SHA-256。桌面端“插件 → 添加插件”输入下载包本地完整路径，安装后启用。CLI：

```sh
dsh plugin --profile rail add ./dsh-tool-12306-0.1.5.tgz
```

也可以从 npm 安装 `dsh-tool-12306@0.1.5`。旧版用户先卸载再安装。支持 Harness 0.2.0-rc.2 / 0.2.1-alpha.1；不使用版本豁免。
