# Contributing

感谢帮助维护这个轻量的 Harness 查询插件。讨论和贡献遵循 [行为准则](CODE_OF_CONDUCT.md)。项目范围是匿名铁路信息查询；自动购票/抢票、账号 Session 导入、验证码绕过和风控规避不属于默认目标。

## Development setup

需要 Node.js 22.19+ 或 24+ 及 npm；无需 MCP 服务、12306 账号或模型凭据。

```sh
git clone https://github.com/zanedonkey/dsh-tool-12306.git
cd dsh-tool-12306
npm ci
npm run build
npm run lint
npm test
```

根锁文件对应 Harness `0.2.1-alpha.1`。用 `npm install` 变更依赖时同时更新锁文件；普通验证使用 `npm ci`。

## Supported SDKs and locks

两套 SDK 分别固定锁文件。CI 按以下同一流程选择 rc.2 依赖（在临时 checkout 内运行；该命令会修改 package.json 和根锁文件）：

```sh
node scripts/select-test-harness.mjs 0.2.0-rc.2
npm ci
npm run build
npm run lint
npm test
```

alpha 可用 `node scripts/select-test-harness.mjs 0.2.1-alpha.1` 切回。切换脚本先验证锁文件是否与依赖、peer 和 engines 一致，防止将不同版本混在同一环境。不要提交切换后的根 manifest；仓库根依赖应保持 alpha。

依赖变更应先更新根 alpha 锁文件，再将 manifest 的 devDependencies 按脚本中的明确版本映射到 rc.2，在独立临时目录中运行 `npm install --package-lock-only --ignore-scripts --registry=https://registry.npmjs.org`，将生成的锁文件复制到 `.github/locks/package-lock.rc2.json`；将根锁文件同步到 `.github/locks/package-lock.alpha.json`。更新两套快照并重跑各自 `npm ci` 和全部离线检查；不要删锁文件以掩盖依赖冲突。Harness 包保持精确版本，不能用 npm latest 标签替代已验证版本。

## Coding style and branches

沿用 strict TypeScript、ESM、2 空格、LF。ESLint 配置见根目录；不要求额外格式化器、Husky 或 commitlint。保持三个工具的名称、输入和 canonical 输出兼容。业务变更先讨论必要性，避免无关重构。

分支可用 `fix/short-description`、`docs/short-description`、`feat/short-description`。推荐 `fix:`、`docs:`、`test:`、`chore:` 等简洁提交说明，不强制 Conventional Commits。请勿将私人邮箱、凭据或本地调试材料写入贡献；Git 提交邮箱可使用自己的 GitHub noreply 地址。

## Testing

`npm run build` 同时检查 src/tests 类型并生成 dist；Loader 测试依赖该产物，所以先 build 再 test。`npm run check` 汇总 build、lint、test。默认测试使用人工 fixture，拒绝未模拟 fetch。新增测试应覆盖实际行为或回归问题，不依赖公网、不添加真实 Cookie/账号数据。

公网测试仅由维护者在需要检查上游变化时手动运行 `npm run test:integration`，普通 PR/CI 不运行。遵守默认频率，失败时先确认维护/接口变化，不反复轰炸服务。AgentLoop 脚本测试不等于真实模型端到端验收。

## Pull requests

使用 PR 模板说明问题、修改理由、实际测试和兼容性影响；同步相关文档及 CHANGELOG 的 Unreleased 条目。保持修改范围小，保留上游版权和 [第三方声明](THIRD_PARTY_NOTICES.md)，不得加入凭据。提交前运行 `npm run check`、`npm pack --dry-run` 并检查 `git diff`。等待维护者 review 后合并；不要求发布 npm 或执行集成测试。

## Bug reports and feature requests

使用仓库 Issue 表单提供插件/Harness/Node 版本、OS、复现步骤及脱敏日志。功能请求说明要解决的问题、使用例子和替代方案；不要贴出完整私人行程或请求头。安全漏洞不要公开详细信息，按 [SECURITY.md](SECURITY.md) 处理。
