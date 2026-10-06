# 插件安装兼容性修复

## 0.1.3

保留两个已验证 SDK 的 peer 范围。rc.2 和 alpha 的独立依赖环境分别通过 strict build、lint、113 项离线测试。工具名称、必填字段和 canonical 输出结构保持一致；arrivalAfter/arrivalBefore 新增明确日期时间字符串，HH:mm 按乘车 date 锚定，详见 README 的迁移说明。推荐安装 `dsh-tool-12306-0.1.3.tgz`。

## 0.1.2

保留原有两个 SDK 的 peer 范围。使用 Node 24.21.0，rc.2 的独立 node_modules（实际 dsh-tools 0.2.0-rc.2、Cordis 4.0.4）与主项目 alpha 依赖分别执行完整 strict build、lint、89 项离线测试，均通过。新增 HTTP/Cookie 加固未改变原生工具协议和输出 schema。

当时使用的安装文件为 `dsh-tool-12306-0.1.2.tgz`；旧版本记录保留如下，当前版本为 0.1.3。

0.1.2 发行包已离线安装到 rc.2 独立消费环境。官方 evaluatePluginCompatibility 无豁免通过；真实 Loader 按包名加载、三个工具注册、fixture 查询输出及卸载通过。

## 0.1.1

用户提供的安装失败截图显示宿主是 DeepSeek Harness `0.2.0-rc.2`，旧插件 `0.1.0` 的 peerDependencies 只接受 `0.2.1-alpha.1`。框架因而拒绝安装。更新全局 npm CLI 不会更新桌面端；CLI 的 rail profile 也不等于桌面端 profile。

从 npm 获取并阅读 `@deepseek-ai/dsh-tools@0.2.0-rc.2` 的已发布实现和类型声明，确认该版本支持目前插件使用的命名导出、defineTool、ValueSchemaSpec、nullable oneOf、canonical output、output.render、ctx.tools.register、exec.signal 与 Cordis effect 生命周期。

`0.1.1` 将 SDK peer 声明限定为两个实际测试的版本：

```json
{
  "@deepseek-ai/cordis": "4.0.4 || 4.0.5-alpha.1",
  "@deepseek-ai/dsh-tools": "0.2.0-rc.2 || 0.2.1-alpha.1"
}
```

Schemastery 改用两版都支持的 `3.18.4`。没有版本豁免、兼容检查绕过或 MCP 层。

| 宿主 SDK | 独立验证 |
| --- | --- |
| 0.2.0-rc.2 / Cordis 4.0.4 / Loader 1.0.5 / Include 1.0.9 | strict build、lint、67 项测试全部通过，含真实 Loader、ToolRuntime、AgentLoop 与卸载 |
| 0.2.1-alpha.1 / Cordis 4.0.5-alpha.1 | strict build、lint、67 项测试全部通过 |

rc.2 完整测试副本位于开发工作区 `.reference/compat-rc2/suite`，使用 rc.2 依赖的独立 node_modules，并没有复用 alpha SDK 替代验证。CI 新增两版 SDK 的版本矩阵；云端 CI 尚未运行。

最终发行包还安装进 rc.2 的独立消费环境：官方 `evaluatePluginCompatibility` 返回兼容（无豁免），旧 peer 声明作为对照仍被拒绝；真实 Loader 按包名加载、三个工具注册、canonical 余票查询执行与卸载均通过。此发行包执行测试使用固定 HTTP fixture，不额外访问官网。

在桌面端原来的插件安装页面重新选择 `dsh-tool-12306-0.1.1.tgz`。如果旧版本确已安装，先卸载旧版本，再装新包；如果之前只是安装失败，可以直接选择新包。
