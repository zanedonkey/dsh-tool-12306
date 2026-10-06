# dsh-tool-12306 技术设计与迁移方案

日期：2026-10-06。先完成源码研究和本方案，再开始实现。项目位于 `dsh-tool-12306/`，只提供匿名查询，不包含账户或购票功能。

后续兼容性修订：插件 0.1.1 增加已验证的 DSH 0.2.0-rc.2 支持，仍支持初始研究的 0.2.1-alpha.1；具体声明和两版测试结果见 COMPATIBILITY.md。下面保留最初的源码研究与迁移方案。

## 开发时阅读的上游快照

- DeepSeek Harness master：`5badb15009ae1756c3afe0ae0cef1faafc290ccc`，本地只读参考 `.reference/deepseek-harness/`。
- Joooook/12306-mcp HEAD：`ff6439da6f63d7d72181abea4568abd69878c600`，本地只读参考 `.reference/12306-mcp/`。
- Harness 依据：[tool-todo](https://github.com/deepseek-ai/deepseek-harness/tree/5badb15009ae1756c3afe0ae0cef1faafc290ccc/packages/todo/tool-todo)、`packages/core/tools/src/schema.ts`、`packages/core/tools/src/index.ts`、`tool-todo/tests/loader-composition.spec.ts`、`docs/cookbook/adding-a-tool.md`、`docs/user/develop/basic/{index,config,publish,tool}.md`。
- 12306 依据：[src/index.ts](https://github.com/Joooook/12306-mcp/blob/ff6439da6f63d7d72181abea4568abd69878c600/src/index.ts)、`src/types.ts`、`docs/principle.md`、MIT LICENSE。
- npm `latest` 是旧版；当前源码版本已发布在 alpha 标签。开发和 peer 使用精确 `@deepseek-ai/dsh-tools@0.2.1-alpha.1`、`@deepseek-ai/cordis@4.0.5-alpha.1`，Schemastery `3.18.5-alpha.1`。不假定不同 preview 版本兼容。

## 原生插件与 Loader

ESM 包命名 `dsh-tool-12306`；导出 `name = 'tool-12306'`、`inject = ['tools']`、Config 类型和 Schemastery schema、`apply(ctx, config): void`。导入 Context 自 `@deepseek-ai/cordis`，defineTool 自 `@deepseek-ai/dsh-tools`。遵循当前要求声明每个工具的 `output.schema` 与 `output.render`，execute 返回 canonical JSON 对象，不返回内容块。模型原生渲染输出 JSON，同时 PTC 可直接读取同一结构化值。

注册由 Cordis effect 自动解绑。每次 apply 创建独立 Client；`ctx.effect` 返回 disposer 清空 cookie/缓存并 abort 所有等待或执行中的请求。execute 传入 `exec.signal`。无全局 client、顶层网络请求或周期定时器。

按最新发布规范提供 `dsh.bundle.patch` 和 `cordis.patch.yml`，插入 `id: tool-12306, name: dsh-tool-12306`。Harness/Cordis 使用 peerDependencies 和 devDependencies，避免运行时实例分裂；Schemastery 是普通 dependency。提供本地绝对路径 overlay 和 `dsh plugin --profile rail add <项目路径>` 安装说明。发布检查包含 npm pack 和真实 Loader 导入编译后的入口。

## 模块与数据流

Agent → 原生工具 → 查询服务 → StationResolver / 12306Client → 12306 官方 HTTPS → 原始响应校验 → Parser → 明确 Domain Model → canonical output/render。

- `src/stations/`：从官网首页动态发现 station_name JS，提取字符串而不 eval；建立 telecode、站名、城市索引。城市选择同名代表站，无同名代表站时给出候选并要求明确；具体站名精确匹配。保留上游明确的成都东补充记录，重复信息不覆盖官方数据。缓存仅在 Client 生命周期内。
- `src/client/`：集中 fetch、headers、域名限制、anonymous cookies、timeout、signal、状态和 JSON 校验、串行限速、有限退避重试。默认请求间隔 1000ms，遇 429 明确报限流，不持续轰炸。查询路径从初始化 HTML 中解析并校验，不能任意跳转至非官方地址。
- `src/parser/`：脱离 Harness 和网络的纯函数。余票 pipe 字段按 types.ts 顺序映射；未知票数和价格均使用 null，候补不视为有票。价格仅解析完整且已知格式的价格片段，不猜测。计算跨日时间并保留日期。
- `src/tools/`：只暴露 `12306_query_tickets`、`12306_query_transfer`、`12306_train_route`。过滤 G/D/C/Z/T/K、出发与到达 HH:mm、onlyAvailable、maxResults；为“只看二等座有票”增加一个简单可选 `seatType`。不同于上游将 G/C 合并的旧 flags，G 与 C 明确区分。

## 三条查询路径

1. 直达：验证日期与筛选 → 解析站名/城市 → 初始化 anonymous cookie 和 CLeftTicketUrl → GET `/otn/<动态路径>` → pipe parser → 过滤/排序/截断。城市使用同名代表 telecode，具体站结果再按站代码严格过滤；README 解释代表站行为及查询覆盖限制。
2. 中转：初始化 `/otn/lcQuery/init`，读取 `lc_search_url` → 官方中转查询，middle_station 可为空 → 解析 middleList/fullList 两程、总历时与等待时间、同站/跨站标记 → 两程都满足席别与可用性筛选。分页按 can_query/result_index 继续；设有分页上限并防止相同游标循环，不把部分结果宣称为完整。
3. 经停：搜索 `/search/v1/train/search?keyword=G1&date=YYYYMMDD`，精确匹配车次，不拿搜索结果第一个冒充目标 → `/otn/queryTrainInfo/query` 查询完整线路。可选 from/to 在内部截取区间；默认 date 是中国当天。首站到达、终站出发和不可知停站时间返回 null。

## 重写与删除清单

保留原项目的字段映射、已知席位类型、路径发现模式、车站索引设计和查询参数；改为纯函数与实例封装，保留 `Copyright (c) 2025 Jok` 及 MIT attribution。修复原有 any、未校验 cast、空数组访问、cookie 值被等号截断、搜索误匹配、host 时区跨日计算以及无限分页风险。

不迁移 `McpServer`、`StdioServerTransport`、SSE/HTTP Server、mcp-http-server、commander、MCP resource/registerTool、get-current-date/telecode 辅助工具、文本/CSV 格式切换，也不依赖 `@modelcontextprotocol/*`。参考代码放在项目外，不被打包。

## 验证与验收

逐阶段 build + lint + 离线测试。使用固定 fixture 验证车站、票数/价格、跨午夜/跨日、各筛选器、中转分页和经停。HTTP 使用模拟 fetch 验证失败、429、timeout、取消、并发限速、cookie 作用域、释放。使用真实 Harness ToolRuntime 验证 input/output schema、模型可见工具、调用结果及卸载，并通过真实 Loader/YAML 加载编译包。

`npm install`、`npm run build`、`npm run lint`、`npm test` 全通过；`npm run test:integration` 单独访问官方接口；额外提供无凭证 Agent fixture 测试，检验模型工具调度。真实自然语言模型验收需要用户提供 Harness 模型配置/API 凭证，不能用 fixture 冒充在线 Agent 结果。公网故障和模型未配置必须如实记录，不当作已通过。

## 开发顺序

骨架可构建 → Station Resolver → HTTP/匿名 cookie/动态路径 → ticket parser/工具 → transfer → route → 完整单元与 Loader 测试 → README/许可证 → 安装、构建、lint、测试、打包及可用的在线验收。遇失败立即分析修复并复跑，不留未实现占位。
