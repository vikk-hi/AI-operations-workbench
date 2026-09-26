# 飞书多维表格字段映射（只读）

验证时间：2026-09-26 18:02（Asia/Shanghai）

本文件仅记录只读元数据，不包含业务记录内容、应用密钥或访问令牌。

## 连接状态

| 模块 | Base | 表 | 状态 |
| --- | --- | --- | --- |
| 核心经营数据 | `M1z2bWhVhahRlDsBUG1cDQUwnRg` | `tblxTrxDK5lGJxlo`（2026天猫日报） | 已授权 |
| 执行任务 | `O4XhbiUw2aa5yRsgR8fckrNpnXe` | `tbl1Hi7UvvXTzTiQ`（工作日报任务） | 已授权 |
| 活动时间线 | `KP2abpA8waP3Nbs3mptcXXMwn9d` | `tbl2bLwV4QSLDVYL`（大促 TIMELINE） | 已授权 |
| 公司目标 | `PNlTbnPPdaC4mKsWiulcuYzznHd` | `tbl74NgTMPJdwQXH`（QM目标） | 已授权 |

## 核心经营数据

已确认的主键/维度字段：

- `Date`（文本，type 1）
- `Year`、`Year1`、`SourceID`、`Phase`、`Week Day`（文本，type 1）
- `活动期`（type 19）

已确认的主要数值字段（type 2）：

- `全店整体数据-Target`
- `全店整体数据-GMV`
- `全店整体数据-Accumulated GMV`
- `全店整体数据-Accumulated   Target`
- `全店整体数据-Achieve%`
- `全店整体数据-Refund`、`全店整体数据-Refund rate`
- `全店整体数据-Book sales Net`
- `全店整体数据-PV`、`全店整体数据-Product View`、`全店整体数据-UV`
- `全店整体数据-AOV`、`全店整体数据-Conversion Rate`
- `全店整体数据-No. of Buyer`、`全店整体数据-Sold pcs`、`全店整体数据-Avg price`、`全店整体数据-No. of Orders`
- 新老客、加购、收藏、停留、会员、直播和 YOY 系列数值字段

日期当前以文本存储，Repository 必须显式解析，不把无法解析的日期填成零值。

## 公司目标

维度字段：

- `事业部`、`部门`、`月份`、`备注`（文本，type 1）
- `店铺`、`平台`、`店铺名+平台`（type 3）

主要数值字段（type 2）：

- `26年目标\n（含购物金）`
- `26年目标\n（不含购物金）`
- `2026年\n退款率目标\n（不含购物金，财务口径）`
- `2026年\n实收目标\n（不含购物金GMV X 不含购物金退款率）`
- 2025/2024 实际、目标、退款率及同比系列字段

## 执行任务

- `任务事项`、`子分组`、`备注`（文本，type 1）
- `负责人`（人员，type 11）
- `板块`、`事项分类`、`状态`（单选，type 3）
- 各成员同名关联字段（双向关联，type 21）

当前源表没有开始/结束日期字段，任务接口对此返回 `null`，不会猜测日期。任务模板来自另一 Base，尚未单独启用为模板来源。

## 活动时间线

- `活动名称`、`事项`（文本，type 1）
- `活动开始日期`、`活动结束日期`、`事项开始日期`、`事项结束日期`（日期，type 5）
- `负责人`、`端口`、`一级事项`（多选，type 19）
- `是否完成`（复选框，type 7）
- `测试人员`（人员，type 11）
