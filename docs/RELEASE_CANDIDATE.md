# 0.1.3 release candidate acceptance

验证日期：2026-10-06。候选包从公开 GitHub main 的全新 clone 构建，源码提交为 `89b9806b8c17754fd690f466bb43de0c441c1fb3`。本轮只更新发布文档，未改变业务代码、依赖、版本号或 npm 包内文件。

## Source and package checks

- Node.js 24.21.0、npm 11.21.0；全新 clone 执行 `npm ci` 成功，依赖审计为 0 个已知漏洞。
- `npm run check` 成功，包含源码/测试类型构建、ESLint 和 13 个测试文件中的 113 项离线测试。
- `npm pack` 触发 `prepack` 重新构建；86 个文件，压缩后 49,917 bytes，解压后 280,097 bytes。
- 包含 ESM 入口、TypeScript 声明、原生 bundle patch、用户文档和必要许可证；未包含测试 fixture、GitHub 配置、锁文件、开发依赖目录、日志或本地配置。
- 安装和调用使用 tarball 中的入口，未直接加载源码入口；HTTP 数据为仓库的脱敏 synthetic fixture。

候选文件：`dsh-tool-12306-0.1.3.tgz`。

```text
SHA-256: f03315ddd046d6192ccbf4c53e679bb8958473e0b141de142c5e1a82a1fe0cc9
```

同版本的旧包不一定具有相同内容；仅此校验值对应本次验收文件。

## Official Harness installation acceptance

分别安装 npm 上正式提供的 `@deepseek-ai/dsh` CLI，使用独立的 Harness home/profile、Node.js 24.21.0 和 pnpm 11.7.0。没有修改既有桌面端配置，没有启用版本兼容豁免。

| 检查 | DSH 0.2.0-rc.2 | DSH 0.2.1-alpha.1 |
| --- | --- | --- |
| 官方 CLI 安装 tarball | 通过 | 通过 |
| 自动加入 profile bundle / dump-config | 通过 | 通过 |
| 官方 profile 加载，无 skipped bundle | 通过 | 通过 |
| 宿主 dsh-tools 版本 | 0.2.0-rc.2 | 0.2.1-alpha.1 |
| 宿主 Cordis 版本 | 4.0.4 | 4.0.5-alpha.1 |
| 原生 Loader 按包名加载 / 模型提示暴露三个工具 | 通过 | 通过 |
| 直达余票 / 两程中转 / 经停站调用 | 通过 | 通过 |
| canonical 输出与渲染 JSON 一致 | 通过 | 通过 |
| 缺少必填项 / 过去日期错误处理 | 通过 | 通过 |
| 跨午夜与日期感知到达筛选 | 通过 | 通过 |
| runtime 卸载解绑 / 再次加载 | 通过 | 通过 |
| 官方 CLI remove 清除依赖和 bundle | 通过 | 通过 |
| 卸载后 dump-config 无插件 | 通过 | 通过 |

每套运行时执行 8 次工具调用。安装命令和配置检查：

```sh
dsh plugin --profile candidate add ./dsh-tool-12306-0.1.3.tgz
dsh --profile candidate --dump-config
dsh plugin --profile candidate remove dsh-tool-12306
dsh --profile candidate --dump-config
```

验收时将 `DSH_HOME` 指向各自新建的隔离目录。普通用户可以使用 README 的 rail profile，也可以在桌面端选择本地包；CLI profile 和桌面端 profile 是不同环境。

pnpm 会提示 profile 项目没有独立安装 `@deepseek-ai/cordis` 和 `@deepseek-ai/dsh-tools` peer。这些包由 Harness 安装提供：本次使用官方 `createRuntimeResolution` / `PluginPackages` 解析，确认插件使用上表中的宿主 SDK 并正常注册执行。不要为消除这个提示自行安装另一版本的 SDK，也不要使用 allow-version 绕过兼容检查。

跨午夜 fixture 验证 `23:00 → 02:00` 的单次工具调用请求相邻两个乘车日期，并按完整日期时间排序。G9271 的 `23:16 → 次日 00:29` 返回正确 arrivalDate；明确次日 `00:00 → 02:00` 到达窗口会包含它，仅写当日 `arrivalBefore: "02:00"` 会排除它。这是合成时刻表测试，不代表真实 G9271 当日运行图。

## Verification boundaries

本轮安装验收没有请求真实 12306 接口，默认单元测试和 CI 同样使用 fixture。此前的公网 API 集成测试记录见 [ACCEPTANCE.md](ACCEPTANCE.md)；外部服务可变，过去成功不能保证未来请求。

上述隔离 CLI 验收没有操作用户现有桌面应用的安装按钮，也没有使用在线模型凭证。后续使用已配置模型的 rc.2 桌面端完成 5 项真实查询；随后通过桌面界面换装候选 tarball，全部 86 个安装文件与候选包一致，启用后再次通过一次真实跨午夜查询。完整记录及首次日期错误的纠正过程见 [DESKTOP_ACCEPTANCE.md](DESKTOP_ACCEPTANCE.md)。不能把 ToolRuntime/固定脚本测试称为在线模型端到端测试，也不能把本次单一模型的表现推广为所有模型的保证。

GitHub 源码已公开；历史整理后的 [main CI](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37433469955) 为 8/8 通过。此包尚未上传为 Release 附件，没有创建 tag，也没有发布 npm。
