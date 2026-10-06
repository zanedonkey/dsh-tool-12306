# Desktop and online model acceptance

验证日期：2026-10-06；宿主为已安装的 Windows DeepSeek Harness 0.2.0-rc.2，使用已有的 DeepSeek-V41-Flash / High 模型配置。测试在新建的空工作区和独立会话中进行，没有读取或修改模型凭据，也没有使用 HTTP fixture 或脚本模型。

## Desktop installation

初始桌面插件页显示 `dsh-tool-12306 v0.1.3`，组件运行中。对实际 desktop profile 的安装目录与 [候选包](RELEASE_CANDIDATE.md) 解包内容逐文件计算哈希：75 个 dist 编译文件以及 bundle patch、许可证和第三方声明一致。

初始同版本包不是本轮候选 tarball 的完整副本：package.json、README、CHANGELOG、SECURITY、兼容说明、配置说明和示例配置共 7 个文件不同。下表的 5 项查询先在该相同运行代码上完成。

尝试使用对应 rc.2 官方 CLI 更新 desktop profile 时，CLI 明确拒绝：`profile "desktop" is managed exclusively by the Electron application`。CLI 更新未执行，未绕过该限制。候选包的两套隔离官方 CLI 安装/卸载记录见 [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md)。

随后通过官方桌面插件界面卸载旧包、输入候选 tarball 的本地路径安装，并点击“立即启用”。界面显示已安装、版本 v0.1.3、组件运行中，没有兼容错误或版本豁免。再次核对全部 86 个发布文件，哈希均与候选包一致；desktop profile 的依赖来源也指向本轮候选 tarball。既有其他插件保留。

## Actual queries

| 自然语言请求 | 模型选择与实际结果 |
| --- | --- |
| 明天北京到上海高铁，最多 3 趟 | 正确工具为 `12306_query_tickets`；最初传入过期日期，插件拒绝后自动纠正到 2026-10-07，成功返回 3 趟 |
| 2026-10-10 下午两点以后上海虹桥到杭州东，仅有二等座，最多 3 趟 | 正确使用 G、departureAfter=14:00、onlyAvailable=true、seatType=secondClass、maxResults=3；返回 3 趟满足条件的车次 |
| 明天深圳到拉萨两程中转，最多 3 个 | 正确使用 `12306_query_transfer`，返回 3 个方案；输出 truncated=true，回答说明这些不是全部方案，并展示跨站换乘及每程日期 |
| 明天 G1 完整经停站 | 正确使用 `12306_train_route`，返回并完整展示 7 站，首站无到达时刻、末站无出发时刻 |
| 10 月 7 日 23:00 至次日 02:00 从徐州东到南京南，只保留次日 00:00–02:00 到达，最多 3 趟 | 单次工具调用正确使用跨午夜出发条件与明确次日到达日期，返回 3 趟；真实 G9271 为 10-07 23:16 出发、10-08 00:29 到达 |

跨午夜实际调用参数：

```json
{
  "date": "2026-10-07",
  "from": "徐州东",
  "to": "南京南",
  "trainTypes": ["G"],
  "departureAfter": "23:00",
  "departureBefore": "02:00",
  "arrivalAfter": "2026-10-08T00:00",
  "arrivalBefore": "2026-10-08T02:00",
  "maxResults": 3
}
```

换装后在同一会话重新实际调用一次跨午夜查询，参数与上面一致，返回 G4481、G9271、G4225 三趟及正确的次日到达日期。该次新增的 tool/call 和 tool/result 已核对，未仅依据模型声称“重新查询”判断成功。

只检查此次新建验收会话的持久化 tool/call 与 tool/result：换装前共 6 次工具调用，5 次成功、1 次过期日期错误；换装后新增 1 次成功调用。工具名称仅为本项目的三个铁路工具，没有终端、文件修改或其他服务调用。核对工具返回数据与回答中的日期、时间、数量和席别状态；空测试工作区未产生文件。

## Limitations

- 模型并非首次就正确计算“明天”：错误日期被插件的输入校验阻止，再依据错误信息纠正。其他模型、提示词或新会话的表现仍可能不同。
- 请求限制为少量结果，票数是查询时点快照；没有核对官网可视页面，也没有验证大结果输出、购票或账号功能。
- 中转截断标志只证明有限结果；不能由本次 3 个跨站方案推断不存在同站换乘。
- 此次仅验证 rc.2 桌面端；alpha 的安装与调用兼容性来自独立 Loader/CLI 验收，不包含 alpha 桌面在线模型测试。
- 换装后只重复一次跨午夜查询；其余 4 项的在线结果来自换装前相同的编译代码。没有创建 Release、tag 或发布 npm。

截图、原始会话日志、profile 备份和本机路径均不纳入公开仓库；这里只保留脱敏的测试方法与结论。
