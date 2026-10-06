# Releasing

这是人工维护的轻量发布流程，没有自动发布凭据。当前源码版本 0.1.3，尚未创建 GitHub Release，也没有 npm 发布。发布 npm 是单独操作，需另行明确授权；执行下面的本地检查不会发布包。

## Local preparation

1. 核对 [README](../README.md) 的真实安装状态、两个 SDK 的兼容范围和所有工具参数。检查 [SECURITY.md](../SECURITY.md)、[LICENSE](../LICENSE) 及上游 attribution。
2. 按 Semantic Versioning 判断是否需要新版本。本轮整理保留 0.1.3；不要为形式无故增号。实际发版时更新 package.json、根锁文件和两套 SDK 锁快照，整理 CHANGELOG 的 Unreleased 条目；0.1.x 旧条目是开发记录，不能伪装成公开发行历史。
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

检查 tarball，并在独立消费环境验证真实 Harness Loader、三个工具和卸载。计算 SHA-256，生成与文件名匹配的校验文件。已有同版本旧安装包不可直接混用：文档/依赖调整后应重新打包并更新校验值。

5. 检查 git status、git diff；当前本地仓库没有提交历史且没有 remote，普通 git diff 无法展示 untracked 文件。提交前审查所有准备纳入的文件，使用 GitHub noreply 邮箱避免公开私人邮箱。建议提交说明 `chore: prepare repository for open source release`。

## GitHub publication — authorization required

仓库已存在：`zanedonkey/dsh-tool-12306`，远端默认分支 main，目前只有初始化 README。**不要把本地无父提交的 master 强推覆盖远端**；发布时先取回 main，在临时 checkout/分支上加入已审查的文件，正常提交并推送。设置本地 remote 与提交源码需由维护者在确认发布后执行，不在本轮自动操作。

上传源码后，等 GitHub Actions 的两套 SDK、Node 22/24 和两种 OS 检查完成。CI 的本地模拟通过不代表云端检查已经通过。只有工作流真正存在并运行后才添加真实 CI 状态 badge。

建议由仓库所有者手动确认：Issues 可用、private vulnerability reporting 已启用，并检查 Security 页确实有 Report a vulnerability；可选开启 require PR/CI、禁止 force push 和分支删除。Description 建议 `Native China Railway 12306 query tools for DeepSeek Harness.`，Topics 建议 deepseek、deepseek-harness、12306、china-railway、typescript、ai-agent、tool-plugin。本轮只提出建议，不改远程设置。

## Tag and Release — authorization required

首次公开 Release 可以采用源码当前版本 `v0.1.3`，无需回退到 0.1.0。通过所有检查、得到发布授权后，创建 tag 和 GitHub Release，上传预编译 `.tgz` 和 SHA-256 文件。发布说明草稿见 [RELEASE_NOTES.md](RELEASE_NOTES.md)；发布后同步 README 的安装状态和 CHANGELOG。

不自动执行 npm publish，不创建 npm token，不引入自动发布 workflow。如未来单独授权 npm 发布，发布前再次确认包名占用、账号和授权范围，并复核干净构建、测试及 tarball；不能仅依据本次包名检查结果。
