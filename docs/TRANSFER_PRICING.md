# Transfer seats and pricing (0.1.5+)

本页参数和输出字段从 0.1.5 起提供；旧版 0.1.4 不包含这些能力。

## Seat preferences

`firstSeatType` 指定第一程，`secondSeatType` 指定第二程；各自覆盖对应程的共同 `seatType`。未指定该程时回退 `seatType`；三个参数都省略时，分别考虑各程当前有票席别，允许二等座＋硬卧等组合。

`onlyAvailable: true` 要求两程分别有符合偏好的明确余票。候补、无票、未开设和未知余票不会作为推荐组合。未设置 `onlyAvailable` 时仍可返回所选席别无票的路线，以保持已有行为；此时组合列表可能为空。原有各程余票字段保留。

## Pricing output

每条路线新增 `pricing`，原有出发/到达、换乘、席别余票字段不变：

| Field | Meaning |
| --- | --- |
| `currency` | 固定 `CNY`；金额单位为人民币元 |
| `combinations` | 当前有票席别对；含 `firstSeatType`、`secondSeatType`、`firstPrice`、`secondPrice`、`totalPrice` |
| `lowestKnownPrice` | 所有符合偏好的有票组合中，最低完整已知合计；无法得到时为 `null` |
| `incomplete` | 任意符合条件的组合缺少合计，或没有有票组合时为 `true` |
| `combinationCount` | 符合条件的组合总数，包含合计未知的有票组合 |
| `truncated` | 仅表示组合列表超过 `maxSeatCombinations`，与顶层路线截断独立 |

例如第一程二等座 42.5 元、第二程硬卧 87.5 元，合计 130 元。此示例为人工测试数据，不代表实际列车票价。任一程未知时合计为 `null`，不能把已知一程的价格当成总价。计算通过整数分完成，避免小数相加误差。

价格来源于已有查询响应的可解析票价，不发送额外补价请求。不同铺位或产品存在冲突价格时仍保留未知；不推测具体座号、铺位或服务费。合计仅包括两程铁路票价，不包括跨站交通等其他费用。

## Sorting and limits

`sortBy` 默认为 `duration`，保持总历时排序；`price` 按 `lowestKnownPrice` 升序，无已知合计的路线排后，同价按总历时。若 `incomplete` 为 `true`，未知价格组合可能比已知价格更便宜，因此只能称为“最低已知票价”。有票组合全部未知时仍返回路线与组合，不能因为无法比较价格就当作无票。

每次读取页面先按查询偏好生成组合、计算最低已知价格，再依据排序方式保留最多 `maxResults` 条去重路线；不会先按历时截断再按价格排序。沿用每个出发日期的 `maxTransferPages` 预算，默认每个日期最多 3 页。顶层 `truncated: true` 表示还有未读取页面或舍弃了超过路线数量上限的方案，不保证全局最优。

组合列表按已知合计升序、未知合计排后；`maxSeatCombinations` 为 1–20 的整数，默认 5。价格完整性、组合总数和最低已知价格在列表截断前计算，即使未知组合未展示，`incomplete` 也不会变成 `false`。每条路线最多临时生成 144 个席别对，候选路线和返回组合均限长。

## Example

以下参数须使用有效乘车日期：

```json
{
  "date": "2026-10-10",
  "from": "深圳",
  "to": "拉萨",
  "onlyAvailable": true,
  "firstSeatType": "secondClass",
  "secondSeatType": "hardSleeper",
  "sortBy": "price",
  "maxSeatCombinations": 5,
  "maxResults": 10
}
```

参数不涉及座号预订、购票、同车次分段换座或抢票；本次新增的是既有两程中转路线的席别组合与票价比较。
