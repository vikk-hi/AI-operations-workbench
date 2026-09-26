# 飞书多维表格字段映射（只读）

验证时间：2026-09-26 18:02（Asia/Shanghai）

本文件仅记录只读元数据，不包含业务记录内容、应用密钥或访问令牌。

## 连接状态

| 模块 | Base | 表 | 状态 |
| --- | --- | --- | --- |
| 核心经营数据 | `M1z2bWhVhahRlDsBUG1cDQUwnRg` | `tblxTrxDK5lGJxlo`（2026天猫日报） | 已授权 |
| 执行任务 | `O4XhbiUw2aa5yRsgR8fckrNpnXe` | `tbl1Hi7UvvXTzTiQ` | 未授权：Feishu `91403` |
| 活动时间线 | `KP2abpA8waP3Nbs3mptcXXMwn9d` | `tbl2bLwV4QSLDVYL` | 未授权：Feishu `91403` |
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

## 未授权模块处理

执行任务和活动时间线在应用取得对应 Base 的“可阅读”协作者权限前保持模块级错误，不回退到演示数据，也不猜测字段或表结构。
