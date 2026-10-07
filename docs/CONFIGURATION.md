# Configuration

安装 bundle 时自动激活 `tool-12306`。以下配置覆盖放在所选 Harness profile 的 `cordis.patch.yml`；不创建第二条同名插件。格式依据 [官方 bundle 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)，并由本项目真实 Loader/patch 测试覆盖。

```yaml
- id: tool-12306
  config:
    timeoutMs: 15000
    maxResults: 20
    requestIntervalMs: 1000
    maxRetries: 1
    maxTransferPages: 3
    rateLimitCooldownMs: 60000
    maxResponseBytes: 4194304
    maxPendingRequests: 32
```

| Config | 默认 | 整数范围和含义 |
| --- | --- | --- |
| timeoutMs | 15000 | 100–120000，单次请求超时毫秒，包含读取响应体 |
| maxResults | 20 | 1–100，工具省略结果上限时使用 |
| requestIntervalMs | 1000 | 100–60000，同一 Client 串行请求启动间隔毫秒 |
| maxRetries | 1 | 0–2，仅临时网络/服务器故障有限重试 |
| maxTransferPages | 3 | 1–10，中转分页上限；0.1.4 起按首程乘车日期分别计算 |
| rateLimitCooldownMs | 60000 | 1000–3600000，429 后跨调用最短冷却毫秒 |
| maxResponseBytes | 4194304 | 1024–16777216，实际响应流字节数上限，默认 4 MiB |
| maxPendingRequests | 32 | 1–128，不同在途 HTTP 请求上限 |

未指定配置由 schema 填入默认值；非整数或超出范围会拒绝加载。默认保持保守频率，请勿为了批量查询降低请求间隔。

安装后也可用仓库的 [示例 overlay](../examples/local.patch.yml)：

```sh
dsh --profile rail web --patch ./examples/local.patch.yml
```

上述命令在源码根目录运行，且 profile 已安装 bundle；overlay 只覆盖配置，不安装插件。

429 不自动重试；冷却期间后续及排队请求直接报错而不发送 HTTP。支持 Retry-After 秒数或 HTTP 日期，取配置最短冷却与有效提示的较大值，极端提示最多按一天处理。冷却结束需用户重新发起查询。

仅合并相同完整 URL 的同时在途请求，不缓存已完成余票结果；取消一个调用不会中断其他调用，全部取消后终止底层请求。限速、队列和冷却属于同一 Client，不跨进程或出口 IP 汇总。

跨午夜窗口最多查乘车日和次日，保持串行限速；时间窗口迁移见 [TIME_WINDOWS.md](TIME_WINDOWS.md)。插件卸载时取消请求并清空内存 Cookie，完整边界见 [SECURITY.md](../SECURITY.md)。

0.1.4 起中转查询在结果数达到 `maxResults` 后仍继续扫描配置允许的页面，以选取已读取方案中总历时最短的结果。默认每个日期最多 3 页；跨午夜首程出发窗口两个日期最多 6 页。因此部分查询会比 0.1.3 多读取页面，耗时可能增加，默认请求间隔保持 1000ms。只指定末程到达窗口不会增加首程查询日期。分页到达上限或舍弃超出数量上限的方案时标记 `truncated`，不承诺所有上游方案中的全局最优。

0.1.5 起可通过工具参数 `sortBy: "price"` 改为按最低已知有票组合总价保留路线，分页预算与请求频率相同。每条路线的 `maxSeatCombinations` 是工具参数（1–20，默认 5），并非插件 config；保留路线仍受 `maxResults` 限制。组合最多临时枚举 12×12 个席别对，返回列表限长，不发送额外补价请求。规则见 [TRANSFER_PRICING.md](TRANSFER_PRICING.md)。
