# Releasing

这是人工维护的轻量发布流程，没有自动发布凭据。当前源码版本为 0.1.5，已发布到 [npm](https://www.npmjs.com/package/dsh-tool-12306) 和 [GitHub v0.1.5 Release](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.5)。后续每次发布仍需明确授权；执行下面的本地检查不会发布包。

## Local preparation

1. 核对 [README](../README.md) 的真实安装状态、两个 SDK 的兼容范围和所有工具参数。检查 [SECURITY.md](../SECURITY.md)、[LICENSE](../LICENSE) 及上游 attribution。
2. 按 Semantic Versioning 判断是否需要新版本；不要为形式无故增号。实际发版时更新 package.json、根锁文件和两套 SDK 锁快照，整理 CHANGELOG 的 Unreleased 条目；0.1.0–0.1.2 是本地开发记录，不能伪装成公开发行历史。
3. 依赖更新按 CONTRIBUTING 的流程更新两套锁文件。普通 CI 使用固定锁和离线 fixture；默认不运行真实 12306 测试。

```sh
npm ci
npm run build
npm run lint
npm test
npm audit
npm pack --dry-run
```

在独立 checkout 中选择 rc.2 锁后重跑同样的 npm ci/build/lint/test；根工作区恢复 alpha。需要检查上游 API 时才手动运行 `npm run test:integration`，遵守频率限制，不作为每个 PR 的要求。

`build` 包含源码与测试类型检查；当前没有独立 typecheck 脚本。检查 exports 指向真实 `.js`/`.d.ts`，dry-run 不应包含 tests/fixture、CI 文件、.env、日志、用户数据或开发机路径。`dist/` 不提交 Git，由 `prepack` 构建进入 tarball；直接 Git 安装不会自动编译，不应作为普通用户安装方案。

4. 本地创建候选包（不会上传）：

```sh
npm pack
```

检查 tarball，并在独立消费环境验证真实 Harness Loader、三个工具和卸载。计算 SHA-256，生成与文件名匹配的校验文件。未发布候选包在文档/依赖调整后可以重新打包并更新校验值；已发布 npm 版本不可覆盖。需要把修订文档或代码分发给安装用户时，应使用新版本，不替换已发布 Release 附件。

5. 检查 git status、git diff 和提交历史。源码已上传到 origin/main；后续修改使用正常提交，保持现有历史。检查新增文件和提交邮箱，继续使用 GitHub noreply 邮箱。当前发行包验收见 [RELEASE_0.1.5_ACCEPTANCE.md](RELEASE_0.1.5_ACCEPTANCE.md)；0.1.3 历史候选验收见 [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md)。

## GitHub publication — authorization required

源码仓库：[zanedonkey/dsh-tool-12306](https://github.com/zanedonkey/dsh-tool-12306)，默认分支 main，已配置 origin 并上传源码。源码上传与创建 Release 是不同操作；后续源码更新正常提交并推送，创建 tag/Release 和 npm 发布仍需各自的明确授权。不要强推覆盖历史，除非维护者明确授权处理历史问题。

GitHub Actions 已实际运行；[历史整理后 main 的工作流](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37433469955) 的两套 SDK、Node 22/24 和两种 OS 共 8 个任务通过。每次更新源码后仍需检查该提交自己的 CI；不要把历史成功结果当成后续提交的保证。

建议由仓库所有者手动确认：Issues 可用、private vulnerability reporting 已启用，并检查 Security 页确实有 Report a vulnerability；可选开启 require PR/CI、禁止 force push 和分支删除。Description 建议 `Native China Railway 12306 query tools for DeepSeek Harness.`，Topics 建议 deepseek、deepseek-harness、12306、china-railway、typescript、ai-agent、tool-plugin。本轮只提出建议，不改远程设置。

## Tag and Release — authorization required

首次公开 Release 为 `v0.1.3`。当前最新为 [v0.1.5](https://github.com/zanedonkey/dsh-tool-12306/releases/tag/v0.1.5)，发行包、校验和及一次性发布任务的验收见 [RELEASE_0.1.5_ACCEPTANCE.md](RELEASE_0.1.5_ACCEPTANCE.md)。后续发版通过所有检查、得到发布授权后，创建与版本号对应的 tag 和 GitHub Release，上传预编译 `.tgz` 和 SHA-256 文件。发布说明格式参考 [0.1.5 发布说明](RELEASE_NOTES_0.1.5.md)；[RELEASE_NOTES.md](RELEASE_NOTES.md) 保留 0.1.3 历史说明。先以 draft 上传并核对附件，再公开发布；不要在安装包缺失时提前公开 Release。源码 tag、构建产物和校验文件必须对应同一次构建，同步 README 的安装状态和 CHANGELOG。

## npm publication — authorization required

0.1.5 已由维护者授权发布，公开注册表 latest 指向 0.1.5；两套 SDK 从公共 npm 全新安装后的验证见 [NPM_0.1.5_ACCEPTANCE.md](NPM_0.1.5_ACCEPTANCE.md)。GitHub v0.1.5 Release 也已发布，附件与 npm tarball 相同；见 [RELEASE_0.1.5_ACCEPTANCE.md](RELEASE_0.1.5_ACCEPTANCE.md)。

0.1.4 的历史发布由维护者授权手工完成，当时公开注册表 `latest` 指向 `0.1.4`；源码 CI 和两套 SDK 的发布后安装验证见 [NPM_0.1.4_ACCEPTANCE.md](NPM_0.1.4_ACCEPTANCE.md)。该次 0.1.4 发布未创建对应 GitHub Release。

0.1.3 已由维护者授权手工发布到 npm，历史验证记录见 [NPM_RELEASE_ACCEPTANCE.md](NPM_RELEASE_ACCEPTANCE.md)。该版本 npm 包的编译文件与 GitHub Release 相同，README 和上游署名更新后分别打包，因此两个渠道的归档校验值不同；不要用 GitHub 的 SHA-256 校验文件核对 npm tarball，也不要覆盖已有 Release 附件。0.1.4 包含新的中转查询能力，与旧版 Release 内容不同；以 npm 注册表实际版本及 `dist-tags` 为准。

后续发布前再次确认包名、当前账号、版本是否已占用及授权范围，完成干净构建、测试和 tarball 检查，并同步包内的安装说明。登录账号需满足 npm 的 2FA 发布要求；发布验证由维护者在 npm 官方页面完成，勿在 Issue、日志或仓库中记录验证码、恢复码和凭据。

```sh
npm whoami --registry=https://registry.npmjs.org
npm publish ./dsh-tool-12306-<version>.tgz --access public --tag latest --registry=https://registry.npmjs.org
npm view dsh-tool-12306 version dist-tags dist.integrity --json --registry=https://registry.npmjs.org
```

发布后从注册表重新安装验证真实 Harness Loader、三个工具和卸载。npm 版本不可重复发布；修复已发布内容时应使用新版本。不创建 npm token，不引入自动发布 workflow。
