# dsh-tool-12306 验收记录

验证日期：2026-10-06，中国时区。以下为开发阶段的历史验收记录；本次发布前审查见 [OPEN_SOURCE_READINESS.md](OPEN_SOURCE_READINESS.md)。

最新 `0.1.3` 修复跨午夜出发窗口和日期感知的到达筛选。rc.2 和 alpha 两套独立 SDK 的 strict build、lint、113 项离线测试均通过（13 个文件，较 0.1.2 新增 24 项）；真实 ToolRuntime/AgentLoop 覆盖一次工具调用跨两天，以及用户提供的 23:16 出发、次日 00:29 到达的 synthetic G9271 场景。到达 HH:mm 语义已调整，迁移规则见 README；不是 G9271 实时运行图验证。6 项官方匿名 HTTP 集成测试通过，其中新增跨午夜窗口实际发送 2026-10-07、2026-10-08 两个日期的查询，断言请求日期与返回边界，不假设此窗口一定有车。发行文件为 `dsh-tool-12306-0.1.3.tgz`。

最新 `0.1.2` 安全与稳定性加固：rc.2 与 alpha 两套独立 SDK 下的 strict build、lint、89 项离线测试全部通过。新增 22 项回归测试覆盖冷却、流大小、取消隔离、在途请求合并、有界队列及 Cookie 限制；5 项匿名官方 HTTP 集成测试再次通过，查询日期为 2026-10-07。发行文件为 `dsh-tool-12306-0.1.2.tgz`，安全边界见 [SECURITY.md](../SECURITY.md)。历史验收记录保留如下。

后续 `0.1.1` 修复桌面端 DSH `0.2.0-rc.2` 安装兼容性，并在 rc.2 与 alpha 两套独立 SDK 下分别通过完整构建、lint 和 67 项测试。使用新包 `dsh-tool-12306-0.1.1.tgz`，详见 [COMPATIBILITY.md](COMPATIBILITY.md)。以下初始验收记录同时保留 `0.1.0` 的开发依据。

## 实现结果

| 要求 | 结果与证据 |
| --- | --- |
| 先研究最新源码，先输出设计 | 源码提交与文件清单记录在 TECHNICAL_DESIGN.md；设计完成后创建骨架 |
| 原生 Harness 插件 | 命名导出 name/inject/Config/apply；defineTool + ctx.tools.register |
| 三个模型工具 | 12306_query_tickets、12306_query_transfer、12306_train_route |
| 不使用 MCP 套壳 | src、package.json、package-lock.json 无 MCP SDK/Transport/Server 依赖；参考仓库不进入发行包 |
| 分层和结构化输出 | client/stations/parser/tools 独立；明确 raw/domain 类型和 canonical output schemas |
| City/Station Resolver | 官方动态数据、四种索引、代表站/具体站区分、模糊匹配明确错误 |
| HTTP/匿名 Cookie | 官方域名、内存 Cookie、串行限速、有限重试、超时、429 错误、执行取消 |
| 日期 | 上海时区、严格 YYYY-MM-DD 和过去日期校验；乘客上车日期与列车始发日期区分 |
| 筛选与价格 | G/D/C/Z/T/K、时间窗口、指定席别有票；未知数量/价格 null |
| 中转 | 两程、跨日与跨站换乘、官方分页、去重、循环保护、部分结果标记 |
| 经停 | 精确车次搜索、完整线路、区间截取、首末站 null 与跨午夜停站时长 |
| 生命周期 | ToolRuntime 自动解绑，effect 清理 Client 并取消请求；卸载测试通过 |
| 开源材料 | README、MIT LICENSE、原作者 attribution、bundle patch、CI 配置、锁文件 |

## 已完成验证

- npm install：通过，使用官方已发布的 `0.2.1-alpha.1` 系列并记录 package-lock.json。
- npm run build：通过，严格检查 src 和 tests 类型。
- npm run lint：通过，无 explicit any。
- npm test：67 项测试、11 个文件通过；默认 setup 禁止未模拟的公网 fetch。
- 真实 Harness Loader：通过。加载编译后的 ESM 入口，无模块导入 mock；YAML 配置、bundle patch composition 和卸载通过。
- 真实 Harness ToolRuntime：模型提示能看到三个工具，输入 schema 校验、canonical 输出和 JSON 渲染通过。
- npm pack：通过，生成 dsh-tool-12306-0.1.0.tgz。使用 files 白名单，包含构建入口、声明文件、bundle patch、文档和许可证。
- 独立安装包检查：通过。将 tarball 安装进 `.reference/package-smoke/` 的独立 node_modules，用真实 Harness Loader 按 `dsh-tool-12306` 包名加载，验证三个工具、错误校验和卸载。测试未使用源项目的模块导入 mock。
- 真实 AgentLoop：四条验收自然语言请求进入真实调度链路，每条只调用一个核心工具，成功记录 tool/call 和 tool/result。此测试的 LLM 为固定脚本，HTTP 使用 synthetic fixture。
- npm run test:integration：5 项公网测试通过。最后一次运行使用中国明天 2026-10-07；真实数据覆盖六个指定车站、北京到上海高铁、上海虹桥到杭州东下午列车、非空深圳到拉萨中转和 G1 经停。

初始验证使用临时 Node 24.21.0 运行时；使用项目时应选择 Node 22.19 以上或 24 系列。

## 仍需区分的验收边界

真实 LLM 的自然语言理解和自动参数选择尚未在线验收：工作区没有为本任务提供已配置的 Harness 模型凭证。固定脚本 Agent 测试仅证明原生调度链路；真实官方 HTTP 集成测试单独证明数据查询。不要将二者合称为“真实模型端到端已通过”。配置可用模型的 Harness profile 后，用 README 中四条自然语言示例完成该项。

城市查询使用官方代表站语义，不做全部车站组合穷举。中转仅两程，分页达到上限时明确返回 truncated。官网未来运行图、维护或接口变更仍可能影响结果。

上述 0.1.0 验证是开发历史。当前源码为 0.1.3，已公开上传到 [GitHub](https://github.com/zanedonkey/dsh-tool-12306)，[main 的云端 CI](https://github.com/zanedonkey/dsh-tool-12306/actions/runs/37433469955) 共 8 个任务通过，每个环境通过 113 项离线测试。GitHub Release 和 npm 发布尚未执行。当前候选安装包的独立安装验收见 [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md)。
