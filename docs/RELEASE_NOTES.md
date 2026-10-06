# v0.1.3

## Highlights

Native China Railway 12306 query tools for DeepSeek Harness. 首次公开发布提供直达车次/余票、两程中转和经停站查询；支持跨午夜出发及按真实日期筛选到达。无需 12306 登录，未使用 MCP Server。

## Installation

下载本 Release 的 `dsh-tool-12306-0.1.3.tgz` 和对应 `.sha256` 文件，核对安装包校验值。

- 在 DeepSeek Harness 桌面端“插件 → 添加插件”输入下载包的本地完整路径，安装后立即启用。升级时先卸载旧版再安装。
- CLI 在包所在目录执行 `dsh plugin --profile rail add ./dsh-tool-12306-0.1.3.tgz`。
- 也可从 npm 安装：桌面端输入 `dsh-tool-12306@0.1.3`，或执行 `dsh plugin --profile rail add dsh-tool-12306@0.1.3`。
- 需要 Node.js 22.19+ 或 24+；支持 DSH 0.2.0-rc.2 / 0.2.1-alpha.1。

## Available Tools

- `12306_query_tickets`：直达列车、时间窗口与席别余票筛选。
- `12306_query_transfer`：两程中转、等待时间、跨站换乘。
- `12306_train_route`：指定车次经停及沿途区间。

## Known limitations

本项目非官方查询插件；不提供登录、购票、抢票、验证码绕过或支付。依赖上游公开可访问接口行为，可能因维护、预售期、运行图变化和限流不可用。城市代表站查询不穷举全部站点组合，中转为有限分页，余票只是请求时快照。

0.1.3 的到达 HH:mm 以乘车 date 为锚点；次日凌晨筛选需明确日期时间，详见 [TIME_WINDOWS.md](TIME_WINDOWS.md)。模型可能选错日期或参数，输入校验无法替代用户核对行程。

## Candidate validation

全新 GitHub clone 通过构建、lint 和 113 项离线测试；候选 tarball 已分别通过官方 DSH 0.2.0-rc.2 / 0.2.1-alpha.1 CLI 安装、三个原生工具调用、跨午夜日期筛选及卸载验收。详情与 SHA-256 见 [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md)。没有版本豁免；rc.2 桌面端相同运行代码完成 5 项真实模型/API 查询，随后通过桌面界面重新安装本轮候选 tarball，86 个文件哈希一致，启用后再次通过跨午夜查询。首次日期错误及其他验收边界见 [DESKTOP_ACCEPTANCE.md](DESKTOP_ACCEPTANCE.md)。

发行包与此前候选包的 README 和 CHANGELOG 不同，运行代码不变；正式发行包再次通过两套官方 CLI 安装及各 8 次离线调用，见 [RELEASE_ACCEPTANCE.md](RELEASE_ACCEPTANCE.md)。发行包请使用 Release 附件自己的 `.sha256` 校验文件，不要使用旧候选包的校验值。

## Acknowledgements

感谢 Joooook/12306-mcp 的车站、字段映射与查询行为参考，以及 deepseek-ai/deepseek-harness 的原生插件 SDK。代码采用 MIT，保留 Copyright (c) 2025 Jok；见 LICENSE 与 THIRD_PARTY_NOTICES.md。
