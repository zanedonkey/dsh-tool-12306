# v0.1.6 — Runtime diagnostics, compact output and query deadlines

## Highlights

- 新增 `12306_plugin_info`：不联网显示当前已加载插件版本、Node.js 版本、四个工具、能力标识及超时配置。更新后可据此确认新版是否生效。
- 直达和中转新增 `outputMode: "compact"`：减少模型文本，保留有票/指定席别、实际出发和到达日期、中转间隔与完整已返回价格组合。默认 `full` 输出和原生结构化结果保持兼容。
- 新增 `queryTimeoutMs`，默认 60000 毫秒、范围 100–300000：一次查询共同预算覆盖初始化、排队、限速、重试、所有分页和响应体读取。超时明确报错并取消该调用，不返回看似完整的部分结果，也不取消其他订阅仍使用的共享 HTTP 请求。
- HTTP User-Agent 自动使用包版本，移除固定 0.1.3 标识。同步当前安装、安全、配置和兼容性说明。

## Installation and upgrade

DeepSeek Harness 桌面端“插件 → 添加插件”输入 `dsh-tool-12306@0.1.6`，安装后启用。旧版先卸载再安装；完全退出 Harness（包括托盘后台）后重新打开，避免仍使用旧进程。

```sh
dsh plugin --profile rail add dsh-tool-12306@0.1.6
dsh --profile rail web
```

调用 `12306_plugin_info`，应显示 `version: "0.1.6"`，`transferPricing`、`compactOutput`、`queryDeadline` 均为 `true`。诊断不比较磁盘版本，不显示本地路径或凭据。如果该工具不存在，请核对插件所在 profile、加载位置及旧进程是否退出。

也可安装 Release 的 `dsh-tool-12306-0.1.6.tgz`，先核对旁附 SHA-256 文件。它与本次 npm 发布使用同一 tarball。

## Available tools

- `12306_query_tickets`
- `12306_query_transfer`
- `12306_train_route`
- `12306_plugin_info`（新增，本地只读）

两个行程查询可传 `outputMode: "compact"`；经停输出保持原有格式。整次查询预算通过插件 config 设置 `queryTimeoutMs`，不是模型查询参数。

## Validation and compatibility

支持两套已验证的 Harness SDK：`0.2.0-rc.2` / Cordis `4.0.4`，`0.2.1-alpha.1` / Cordis `4.0.5-alpha.1`。本地两套环境均通过 build、lint 和 165 项离线测试，包括真实 Loader、ToolRuntime、卸载、精简文本、共享取消、排队/分页/重试/响应体超时。默认测试不访问真实 12306。

GitHub CI 配置覆盖 Ubuntu/Windows、Node 22/24 及两套 SDK；本次提交的实际状态见仓库 Actions。Node.js 要求 `^22.19.0 || >=24.0.0`。

## Known limitations

- 精简仅改变模型文本，canonical 结构化结果仍完整；未展示席别不表示无票，未知票价保持 `null`。
- 中转仍为两程、有限分页；最低已知票价不保证全局最低价，缺失或冲突票价不推测。
- 整次超时后不会返回部分路线；查询范围较大或上游较慢时可合理调整预算，保持保守请求频率。
- 不提供登录、购票、抢票、验证码绕过、支付或账号自动化。上游公开网站/API 行为变化可能影响查询。

## Acknowledgements and license

基于 [Joooook/12306-mcp](https://github.com/Joooook/12306-mcp) 的站点数据、查询和解析实现进行优化，并迁移为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 原生插件。MIT；保留上游 Jok 的必要版权与许可证声明。本项目非中国铁路或 12306 官方项目。
