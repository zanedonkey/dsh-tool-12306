# Open Source Readiness Report

审查日期：2026-10-06，Asia/Shanghai。源码版本：0.1.3。

以下记录上传前的本地审查快照，包括当时的 Git 状态和待办；源码上传后的实际提交及云端 CI 以 GitHub 仓库和 Actions 为准。本文件不表示 Release 或 npm 已发布。

## 1. Open-source readiness status

**本地整理和验证已完成，待授权上传源码及实际云端 CI 验证。** 本轮未 push、未创建仓库/Release、未发布 npm、未修改 GitHub 设置或分支保护。

既有公开仓库为 [zanedonkey/dsh-tool-12306](https://github.com/zanedonkey/dsh-tool-12306)，此前只初始化了 README；本地仓库仍没有提交、没有 remote，HEAD 为未产生提交的 master。未强制改名或覆盖远端 main。git log 因无提交而无历史可读，git diff/diff --check 为空不能证明 untracked 文件没有变化；本报告的修改清单基于本轮开始前的文件内容快照比较。

### Phase 1 — Audit findings and minimum plan

修改前读取了全部 src/tests/fixture、package.json、锁文件、README、许可证、Git 忽略、TypeScript/ESLint/Vitest 配置、已有 CI、SDK 切换脚本及 docs/examples，并执行 git status、diff、log、remote 检查。

| 初始阻塞项 | 处理 |
| --- | --- |
| README 误称已公开源码并有 Release 安装包 | 明确尚未发布源码/Release/npm；提供源码上传后真实可用的本地构建、打包和 bundle 安装流程 |
| README、示例 patch、验收记录含开发机绝对路径 | 移除真实机器路径；示例改为安装后配置 overlay |
| 缺少 repository/bugs/homepage/keywords | 使用已经确认存在的真实仓库地址，保持包名及版本 |
| CI 改 manifest 后 npm install，缺少只读权限 | 两套固定锁快照、npm ci、contents: read、默认离线检查 |
| 缺贡献、报告入口说明、Issue/PR 模板和维护文档 | 增加轻量 community 文件、标准 Contributor Covenant、每周 Dependabot 和人工发布流程 |
| npm audit 标记 Vitest 3.x 开发依赖漏洞 | 升级至最小已修复系列 Vitest 4.1.11，重新锁定并通过两套 SDK 检查 |

未发现真实 secret 或用户数据，不需要清除已提交历史。核心业务、工具名称/输入/输出和测试保持原样；没有执行独立 payload 优化提示词，也没有增加购票、登录、MCP 或其他新功能。

## 2. Files added

本轮增加 16 个文件：

- `.editorconfig`、`.gitattributes`。
- `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`。
- `.github/ISSUE_TEMPLATE/bug_report.yml`、`feature_request.yml`、`config.yml`。
- `.github/pull_request_template.md`、`.github/dependabot.yml`。
- `.github/locks/README.md`、`package-lock.alpha.json`、`package-lock.rc2.json`。
- `docs/CONFIGURATION.md`、`RELEASING.md`、`RELEASE_NOTES.md`、本报告。

没有新增第二套翻译 README：当前主要用户是中文社区，主 README 使用中文说明和简洁英文副标题，避免维护两份不一致内容。没有额外引入 Husky、commitlint、自动发布、coverage 服务或独立格式化器；既有 build 已检查源码和测试类型，不新增重复 typecheck 脚本。

## 3. Files modified

修改 12 个既有文件：

- `.gitignore`：凭据、日志、IDE、临时目录、安装包忽略；允许未来提交脱敏的 `.env.example`。
- `package.json`、`package-lock.json`：真实仓库 metadata、明确 files 白名单、Vitest 安全修复、官方 npm registry。
- `README.md`：用户优先的安装、配置、使用、三个工具参数、限制、隐私和来源说明。
- `SECURITY.md`：私密报告条件、泄露处置、依赖和隐私边界。
- `CHANGELOG.md`：Unreleased 分组与已有真实开发版本，不伪造公开发布历史。
- `.github/workflows/ci.yml`、`scripts/select-test-harness.mjs`：固定 SDK 锁、npm ci 和最小权限。
- `examples/local.patch.yml`：不含本机路径的安装后 overlay。
- `docs/ACCEPTANCE.md`、`COMPATIBILITY.md`、`TECHNICAL_DESIGN.md`：标明历史快照/版本，修正路径和过时推荐。

删除文件：0。src/tests 下共 45 个文件与审查前内容一致；没有核心代码或测试重写。MIT LICENSE 和第三方声明原有必要内容完整保留。

## 4. Security / secret scan result

候选源码全量扫描并人工复查 password/passwd/secret/token/apikey/api_key/authorization/cookie/session/私钥关键词：未发现真实 API Key、npm/GitHub token、登录 Cookie、账号、私人邮箱、用户行程、调试转储或开发机绝对路径。正常 Cookie 处理和 `anonymous=test`、`anon=a=b` 等人工测试值不是泄露凭据。

源码没有输出 Cookie/headers/Authorization/整段响应的 console 调试日志；错误消息只给出领域错误及 HTTP 状态，不拼入敏感请求头。默认 fetch 离线隔离及 fixture 已审查。Git 仓库没有历史提交，未发现历史 secret 残留；这不覆盖仓库外的私人文件，也不构成完整供应链或渗透测试。

根锁与两个 SDK 锁使用官方 npm registry、完整 integrity 字段，无本地依赖路径、带账号密码的 URL 或 MCP SDK 依赖。.gitignore 的 node_modules/dist/coverage/.env/.npmrc/log/IDE/安装包规则实测命中。

最终 npm audit 和 npm audit --omit=dev 均为 **0 个已知漏洞**；rc.2 安装审计同样为 0。初始告警来自开发依赖 Vitest/mocker/tinypool；修复依据 [Vitest 公告](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) 及 [tinypool 公告](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)，未执行 audit fix --force。

npm outdated 已检查。保留 Harness 精确版本、TypeScript 5、ESLint 9、js-yaml 4 和 Node 24 类型；latest 标签/新的 major 不等于兼容版本，未机械更新全部依赖。Vitest 5 是可选后续 major，本轮使用已修复 4.1.11。

## 5. License & attribution status

根 MIT License 使用当前项目 contributors 版权信息，同时保留 Copyright (c) 2025 Jok。与 [当前上游 MIT 文本](https://github.com/Joooook/12306-mcp/blob/main/LICENSE) 及开发研究快照核对一致；完整许可保存在 LICENSE/THIRD_PARTY_NOTICES.md，并进入安装包。

README 准确说明车站、字段映射、查询参数和解析行为来自对 Joooook/12306-mcp 的研究/改写；没有声称完全原创，也没有引入其 MCP runtime。感谢 DeepSeek Harness SDK。Contributor Covenant 2.1 采用官方标准正文、保留版本和 attribution，填写了先请求私密联系渠道的报告方式，没有虚构安全邮箱。

## 6. CI status

工作流语法与结构已检查：checkout、setup-node/npm cache、SDK/锁选择、npm ci、build、lint、离线 test、pack dry-run；权限仅 contents: read。矩阵保留两个已支持 SDK × Node 22/24 × Ubuntu/Windows，共 8 个轻量任务，带超时、并发取消和 fail-fast: false。

普通 push/PR 不运行 test:integration，不发真实 12306 请求，不配置发布 secret 或写权限。每周 Dependabot 分别检查 npm 与 GitHub Actions；不自动合并，依赖 PR 必须刷新两个 SDK 锁后通过检查。

SDK 锁选择在独立目录验证了 alpha、rc.2，以及陈旧依赖锁会在写入 manifest/根锁之前报错。根 alpha 锁快照与 package-lock.json 相同。**GitHub 云端 CI 尚未运行，不能声称云端通过**；README 暂不放虚假 CI、coverage 或 npm badge。

## 7. Build result

npm install 使用临时官方 npm 11.21.0 成功；随后 alpha、rc.2 都经过干净 npm ci。安装时本机 npm 10.9.3 对 Vitest major 变更产生 Arborist 内部错误；已用临时 npm 11 解决，不改系统 npm。rc.2 的固定锁 npm ci 也用 npm 10.9.3 实测成功。首次 pack dry-run 的默认缓存写权限错误通过指定工作区缓存解决，最终成功。

| OS / Node | Harness SDK | Build + src/tests 类型检查 | Lint | 默认离线测试 |
| --- | --- | --- | --- | --- |
| Windows / 24.21.0 | 0.2.1-alpha.1 | 通过 | 通过 | 113/113，13 个文件 |
| Windows / 24.21.0 | 0.2.0-rc.2 | 通过 | 通过 | 113/113，13 个文件 |
| Windows / 22.23.3 | 0.2.1-alpha.1 | 通过 | 通过 | 113/113，13 个文件 |
| Windows / 22.23.3 | 0.2.0-rc.2 | 通过 | 通过 | 113/113，13 个文件 |

未运行不存在的 typecheck 命令；build 已严格检查类型。Ubuntu 组合等待真实 GitHub Actions 验证，不以 Windows 结果冒充。

## 8. Test result

四个本地组合各 113 项离线测试通过，包括真实 Cordis Loader、ToolRuntime、脚本 AgentLoop、取消/卸载、HTTP/Cookie 加固和跨午夜回归。未为文档/忽略规则增加镜像式单元测试。公网集成测试仍单独运行，本轮没有发起真实铁路查询；历史在线验证与真实模型验收边界保持明确。

## 9. npm pack result

最终 npm pack --dry-run 成功，prepack 自动执行 build；候选包 **86 个文件，49,939 bytes 压缩、280,160 bytes 解包**。main/exports 的 dist/index.js 与 types/exports 的 dist/index.d.ts 都存在；所有源码生成声明，保留相对 sourcemap，无机器绝对路径。declarationMap 未启用，当前不需要额外声明映射。

发行白名单包含编译产物、bundle patch、README/安全/许可/变更记录、用户配置/时间/兼容文档和示例；不包含 tests、fixture、src 开发树、node_modules、.github、锁快照、.env、日志、截图或临时审查文件。dist 是安装所需产物，在 Git 中忽略，在 prepack 中构建，策略一致。

本轮只做 dry-run，不替换既有旧 tarball。旧 0.1.3 安装包仍是前次构建，其文档/校验值不代表本轮候选内容；正式发布前应重新 npm pack 并计算 SHA-256，不能直接上传旧文件。

npm 官方 registry 查询当前包名返回 E404，未发现占用；不保证未来仍可用，未自动换名或发布。

## 10. Remaining manual steps before GitHub publish

1. 审阅当前 82 个候选源文件，确认发布后更新 README 中“尚未上传/发布”的状态；建议本地提交说明 `chore: prepare repository for open source release`。
2. 得到明确上传授权后，同步已有远端 main，把已审查文件正常提交并推送；保留远端初始化历史，不 force push。仓库已存在，不需再次创建。
3. 等 GitHub Actions 八个组合真实运行通过；之后才添加 CI badge。云端失败需先修复，不能跳过验证。
4. 所有者手动启用并确认 private vulnerability reporting 可用；有条件时直接提供私密社区联系渠道。Issue/PR 和 SECURITY 链接需在源码上传后检查实际内容；当前相关页面 HTTP 200 不代表政策文件已上传或私密报告按钮已启用。
5. Description/Topics/Homepage 和 branch protection 仅作为 RELEASING 中的建议，按维护者意愿设置，非本轮自动变更。
6. 若另行授权创建 Release，再生成新 tarball/校验文件、完成安装包检查、创建 v0.1.3 tag/Release、使用草稿说明。npm 发布仍是独立可选操作，不是本项目 GitHub 开源的必要步骤。

所有本地 Markdown 相对链接均检查到实际文件；README 外部链接、仓库/Issues/Releases、安全政策页面、官方 bundle 文档、上游固定提交、规范来源和两个 badge 经只读 HTTP 检查返回 200。远端只有初始化 README，公开页面可访问不等于源码/Release 已发布。

## Final checklist

- [x] build passes
- [x] tests pass
- [x] lint passes
- [x] secret scan found no real credentials
- [x] no user credentials in reviewed source/fixtures
- [x] no login cookies in reviewed source/fixtures
- [x] license present
- [x] upstream attribution present
- [x] README complete and publication state explicit
- [x] SECURITY.md present
- [x] CONTRIBUTING.md present
- [x] CI configured with minimal permissions
- [x] Dependabot configured
- [x] issue templates present
- [x] PR template present
- [x] npm package contents reviewed
- [x] repository URLs verified and local relative links valid
- [x] no accidental large files in candidate source
- [x] normal CI does not query real 12306 endpoints
- [ ] source uploaded to GitHub — requires authorization
- [ ] GitHub Actions cloud matrix passes — requires source upload
- [ ] private vulnerability reporting verified enabled — owner action
- [ ] new release tarball/tag/Release published — separate authorization
