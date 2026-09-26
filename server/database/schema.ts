/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { bigint, boolean, date, index, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmActivityTimeline = pgTable("hm_activity_timeline", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  activityName: text("activity_name"),
  // Synced field: auto-synced, do not modify or delete
  promotionType: text("promotion_type"),
  // Synced field: auto-synced, do not modify or delete
  activityPreheatDate: date("activity_preheat_date"),
  // Synced field: auto-synced, do not modify or delete
  activityStartDate: date("activity_start_date"),
  // Synced field: auto-synced, do not modify or delete
  activityEndDate: date("activity_end_date"),
  /**
   * 端口
   */
  // Synced field: auto-synced, do not modify or delete
  port: jsonb("port"),
  /**
   * 一级事项
   */
  // Synced field: auto-synced, do not modify or delete
  primaryItem: jsonb("primary_item"),
  // Synced field: auto-synced, do not modify or delete
  item: text("item"),
  // Synced field: auto-synced, do not modify or delete
  itemStartDate: date("item_start_date"),
  // Synced field: auto-synced, do not modify or delete
  itemEndDate: date("item_end_date"),
  /**
   * 负责人
   */
  // Synced field: auto-synced, do not modify or delete
  appPrincipal: jsonb("app_principal"),
  // Synced field: auto-synced, do not modify or delete
  appIsCompleted: boolean("app_is_completed"),
  // Synced field: auto-synced, do not modify or delete
  tester: userProfileArray("tester"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877270105635065").on(table.id),
  uniqueIndex("unq_1877270105636201").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmBrandTargets = pgTable("hm_brand_targets", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appDate: text("app_date"),
  // Synced field: auto-synced, do not modify or delete
  appMonth: text("app_month"),
  /**
   * 活动
   */
  // Synced field: auto-synced, do not modify or delete
  appActivity: jsonb("app_activity"),
  // Synced field: auto-synced, do not modify or delete
  activityDimension: text("activity_dimension"),
  // Synced field: auto-synced, do not modify or delete
  gmvTarget: numeric("gmv_target"),
  // Synced field: auto-synced, do not modify or delete
  uvTarget: numeric("uv_target"),
  // Synced field: auto-synced, do not modify or delete
  ddnTarget: numeric("ddn_target"),
  // Synced field: auto-synced, do not modify or delete
  netTarget: numeric("net_target"),
  // Synced field: auto-synced, do not modify or delete
  crTarget: numeric("cr_target"),
  // Synced field: auto-synced, do not modify or delete
  aspTarget: bigint("asp_target", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  aovTarget: bigint("aov_target", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  ddnActualUnused: text("ddn_actual_unused"),
  // Synced field: auto-synced, do not modify or delete
  taobaoKeSobTarget: text("taobao_ke_sob_target"),
  // Synced field: auto-synced, do not modify or delete
  timeLimitRedPacketSobTarget: text("time_limit_red_packet_sob_target"),
  // Synced field: auto-synced, do not modify or delete
  newCustomerAccelerationSobTarget: text("new_customer_acceleration_sob_target"),
  // Synced field: auto-synced, do not modify or delete
  taoGoldCoinSobTarget: text("tao_gold_coin_sob_target"),
  // Synced field: auto-synced, do not modify or delete
  hundredBillionSubsidySobTarget: text("hundred_billion_subsidy_sob_target"),
  // Synced field: auto-synced, do not modify or delete
  corresponding2025Date: text("corresponding_2025_date"),
  // Synced field: auto-synced, do not modify or delete
  _25YearActualDdn: numeric("25_year_actual_ddn"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877269224839210").on(table.id),
  uniqueIndex("unq_1877269224840266").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmCompanyTargets = pgTable("hm_company_targets", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appDepartment1: text("app_department_1"),
  // Synced field: auto-synced, do not modify or delete
  appDepartment: text("app_department"),
  // Synced field: auto-synced, do not modify or delete
  appShop: text("app_shop"),
  // Synced field: auto-synced, do not modify or delete
  appPlatform: text("app_platform"),
  // Synced field: auto-synced, do not modify or delete
  shopNamePlatform: text("shop_name_platform"),
  // Synced field: auto-synced, do not modify or delete
  appMonth: text("app_month"),
  // Synced field: auto-synced, do not modify or delete
  appRemark: text("app_remark"),
  // Synced field: auto-synced, do not modify or delete
  _26YearTargetWithShoppingGold: bigint("26_year_target_with_shopping_gold", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _26YearTargetWithoutShoppingGold: bigint("26_year_target_without_shopping_gold", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _2026YearRefundRateTargetWithoutShoppingGoldFinancial: numeric("2026_year_refund_rate_target_without_shopping_gold_financial"),
  // Synced field: auto-synced, do not modify or delete
  _2026ActualTargetGmvXRefundRate: bigint("2026_actual_target_gmv_x_refund_rate", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _2025ActualCompletion1: bigint("2025_actual_completion_1", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  yoy: numeric("yoy"),
  // Synced field: auto-synced, do not modify or delete
  _25TargetIncludeShoppingGold: bigint("25_target_include_shopping_gold", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _25TargetExcludeShoppingGold: bigint("25_target_exclude_shopping_gold", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _2025RefundRateTargetExcludeShoppingGoldFinancial: numeric("2025_refund_rate_target_exclude_shopping_gold_financial"),
  // Synced field: auto-synced, do not modify or delete
  _2025ActualTargetGmvXRefundRate: bigint("2025_actual_target_gmv_x_refund_rate", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _2025ActualCompletion: bigint("2025_actual_completion", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _26TargetYoyIncludeShoppingGold: numeric("26_target_yoy_include_shopping_gold"),
  // Synced field: auto-synced, do not modify or delete
  _26TargetYoyExcludeShoppingGold: numeric("26_target_yoy_exclude_shopping_gold"),
  // Synced field: auto-synced, do not modify or delete
  _26RefundRateDiffNoShoppingFina: numeric("26_refund_rate_diff_no_shopping_fina"),
  // Synced field: auto-synced, do not modify or delete
  _26PaidYearOnYear: numeric("26_paid_year_on_year"),
  // Synced field: auto-synced, do not modify or delete
  _24GmvWithShopping: bigint("24_gmv_with_shopping", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _24GmvNoShopping: bigint("24_gmv_no_shopping", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _24RefundRateNoShoppingFina: numeric("24_refund_rate_no_shopping_fina"),
  // Synced field: auto-synced, do not modify or delete
  _24PaidNoShoppingGmvXRefund: bigint("24_paid_no_shopping_gmv_x_refund", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _25TargetYoyWithShopping: numeric("25_target_yoy_with_shopping"),
  // Synced field: auto-synced, do not modify or delete
  _25TargetYoyNoShopping: numeric("25_target_yoy_no_shopping"),
  // Synced field: auto-synced, do not modify or delete
  _25RefundRateDiffNoShoppingFina: numeric("25_refund_rate_diff_no_shopping_fina"),
  // Synced field: auto-synced, do not modify or delete
  _25PaidYearOnYear: numeric("25_paid_year_on_year"),
  // Synced field: auto-synced, do not modify or delete
  _2024ActualAchievement: bigint("2024_actual_achievement", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  _25vs24Yoy: numeric("25vs24_yoy"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877270296479819").on(table.id),
  uniqueIndex("unq_1877270296479851").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmTaskMain = pgTable("hm_task_main", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  taskItem: text("task_item"),
  // Synced field: auto-synced, do not modify or delete
  personInCharge: userProfileArray("person_in_charge"),
  // Synced field: auto-synced, do not modify or delete
  section: text("section"),
  // Synced field: auto-synced, do not modify or delete
  itemCategory: text("item_category"),
  // Synced field: auto-synced, do not modify or delete
  subgroup: text("subgroup"),
  // Synced field: auto-synced, do not modify or delete
  status: text("status"),
  // Synced field: auto-synced, do not modify or delete
  remark: text("remark"),
  /**
   * 南桑
   */
  // Synced field: auto-synced, do not modify or delete
  nansang: jsonb("nansang"),
  /**
   * 川赤
   */
  // Synced field: auto-synced, do not modify or delete
  chuanchi: jsonb("chuanchi"),
  /**
   * 罗青
   */
  // Synced field: auto-synced, do not modify or delete
  luoqing: jsonb("luoqing"),
  /**
   * 岭罗
   */
  // Synced field: auto-synced, do not modify or delete
  appLingluo: jsonb("app_lingluo"),
  /**
   * 魔南
   */
  // Synced field: auto-synced, do not modify or delete
  monan: jsonb("monan"),
  /**
   * 榅桲
   */
  // Synced field: auto-synced, do not modify or delete
  wenbo: jsonb("wenbo"),
  /**
   * 艾莎
   */
  // Synced field: auto-synced, do not modify or delete
  aisha: jsonb("aisha"),
  /**
   * 全员
   */
  // Synced field: auto-synced, do not modify or delete
  allStaff: jsonb("all_staff"),
  /**
   * 大雀
   */
  // Synced field: auto-synced, do not modify or delete
  daque: jsonb("daque"),
  /**
   * 荔莴
   */
  // Synced field: auto-synced, do not modify or delete
  liwo: jsonb("liwo"),
  /**
   * 春豌
   */
  // Synced field: auto-synced, do not modify or delete
  chunwan: jsonb("chunwan"),
  /**
   * 银棠
   */
  // Synced field: auto-synced, do not modify or delete
  yintang: jsonb("yintang"),
  /**
   * 果连
   */
  // Synced field: auto-synced, do not modify or delete
  guolian: jsonb("guolian"),
  /**
   * 生碱
   */
  // Synced field: auto-synced, do not modify or delete
  alkali: jsonb("alkali"),
  /**
   * 华灰
   */
  // Synced field: auto-synced, do not modify or delete
  lime: jsonb("lime"),
  /**
   * 双灯
   */
  // Synced field: auto-synced, do not modify or delete
  doubleLamp: jsonb("double_lamp"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877268679523402").on(table.id),
  uniqueIndex("unq_1877268679523434").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmCoreMetrics2025 = pgTable("hm_core_metrics_2025", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appYear: text("app_year"),
  // Synced field: auto-synced, do not modify or delete
  sourceId: text("source_id"),
  // Synced field: auto-synced, do not modify or delete
  year1: text("year_1"),
  // Synced field: auto-synced, do not modify or delete
  appDate: text("app_date"),
  // Synced field: auto-synced, do not modify or delete
  appChannel: text("app_channel"),
  // Synced field: auto-synced, do not modify or delete
  appActivity: text("app_activity"),
  // Synced field: auto-synced, do not modify or delete
  appTarget: numeric("app_target"),
  // Synced field: auto-synced, do not modify or delete
  gmv: numeric("gmv"),
  // Synced field: auto-synced, do not modify or delete
  gmvExclShoppingCredit: numeric("gmv_excl_shopping_credit"),
  // Synced field: auto-synced, do not modify or delete
  achievePercent: numeric("achieve_percent"),
  // Synced field: auto-synced, do not modify or delete
  refundAmount: numeric("refund_amount"),
  // Synced field: auto-synced, do not modify or delete
  refundRate: numeric("refund_rate"),
  // Synced field: auto-synced, do not modify or delete
  net: numeric("net"),
  // Synced field: auto-synced, do not modify or delete
  ipv: numeric("ipv"),
  // Synced field: auto-synced, do not modify or delete
  pdpIpv: numeric("pdp_ipv"),
  // Synced field: auto-synced, do not modify or delete
  uv: numeric("uv"),
  // Synced field: auto-synced, do not modify or delete
  aov: numeric("aov"),
  // Synced field: auto-synced, do not modify or delete
  cvr: numeric("cvr"),
  // Synced field: auto-synced, do not modify or delete
  appBuyers: numeric("app_buyers"),
  // Synced field: auto-synced, do not modify or delete
  gmvPcs: numeric("gmv_pcs"),
  // Synced field: auto-synced, do not modify or delete
  appAsp: numeric("app_asp"),
  // Synced field: auto-synced, do not modify or delete
  parentOrderQuantity: numeric("parent_order_quantity"),
  // Synced field: auto-synced, do not modify or delete
  orderQuantity: numeric("order_quantity"),
  // Synced field: auto-synced, do not modify or delete
  paidOldBuyers: numeric("paid_old_buyers"),
  // Synced field: auto-synced, do not modify or delete
  appAtc: numeric("app_atc"),
  // Synced field: auto-synced, do not modify or delete
  atcPcs: numeric("atc_pcs"),
  // Synced field: auto-synced, do not modify or delete
  atcRate: numeric("atc_rate"),
  // Synced field: auto-synced, do not modify or delete
  addCartItemsPerPerson: numeric("add_cart_items_per_person"),
  // Synced field: auto-synced, do not modify or delete
  favoritesCountRate: numeric("favorites_count_rate"),
  // Synced field: auto-synced, do not modify or delete
  favoritesCount: numeric("favorites_count"),
  // Synced field: auto-synced, do not modify or delete
  avgStayDurationS: numeric("avg_stay_duration_s"),
  // Synced field: auto-synced, do not modify or delete
  memberJoinUv: numeric("member_join_uv"),
  // Synced field: auto-synced, do not modify or delete
  memberReturnUv: numeric("member_return_uv"),
  // Synced field: auto-synced, do not modify or delete
  memberScale: numeric("member_scale"),
  // Synced field: auto-synced, do not modify or delete
  memberBuyers: numeric("member_buyers"),
  // Synced field: auto-synced, do not modify or delete
  memberBuyersSob: numeric("member_buyers_sob"),
  // Synced field: auto-synced, do not modify or delete
  memberGmv: numeric("member_gmv"),
  // Synced field: auto-synced, do not modify or delete
  memberGmvSob: numeric("member_gmv_sob"),
  // Synced field: auto-synced, do not modify or delete
  storeLevelRanking: text("store_level_ranking"),
  // Synced field: auto-synced, do not modify or delete
  shopPerformanceScore: numeric("shop_performance_score"),
  // Synced field: auto-synced, do not modify or delete
  cpsGmv: numeric("cps_gmv"),
  // Synced field: auto-synced, do not modify or delete
  lsGmv: numeric("ls_gmv"),
  // Synced field: auto-synced, do not modify or delete
  lsBuyers: numeric("ls_buyers"),
  // Synced field: auto-synced, do not modify or delete
  lsAov: numeric("ls_aov"),
  // Synced field: auto-synced, do not modify or delete
  lsUv: numeric("ls_uv"),
  // Synced field: auto-synced, do not modify or delete
  lsMemberJoinUv: numeric("ls_member_join_uv"),
  // Synced field: auto-synced, do not modify or delete
  unitPriceTarget: numeric("unit_price_target"),
  // Synced field: auto-synced, do not modify or delete
  conversionRateTarget: numeric("conversion_rate_target"),
  // Synced field: auto-synced, do not modify or delete
  itemUnitPriceTarget: numeric("item_unit_price_target"),
  // Synced field: auto-synced, do not modify or delete
  netSalesTarget: numeric("net_sales_target"),
  // Synced field: auto-synced, do not modify or delete
  ranking: numeric("ranking"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877191160297946").on(table.id),
  uniqueIndex("unq_1877191160297978").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmTaskTemplates = pgTable("hm_task_templates", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  workItem: text("work_item"),
  // Synced field: auto-synced, do not modify or delete
  appId: text("app_id"),
  // Synced field: auto-synced, do not modify or delete
  workFlow: text("work_flow"),
  // Synced field: auto-synced, do not modify or delete
  coreLink: text("core_link"),
  // Synced field: auto-synced, do not modify or delete
  itemType: text("item_type").array(),
  // Synced field: auto-synced, do not modify or delete
  workScene: text("work_scene"),
  // Synced field: auto-synced, do not modify or delete
  sopLink: text("sop_link"),
  // Synced field: auto-synced, do not modify or delete
  sopStep: text("sop_step"),
  // Synced field: auto-synced, do not modify or delete
  department: text("department").array(),
  /**
   * 负责人
   */
  // Synced field: auto-synced, do not modify or delete
  personInCharge: jsonb("person_in_charge"),
  // Synced field: auto-synced, do not modify or delete
  postLevel: text("post_level"),
  // Synced field: auto-synced, do not modify or delete
  appPlatform: text("app_platform").array(),
  // Synced field: auto-synced, do not modify or delete
  workNature: text("work_nature"),
  // Synced field: auto-synced, do not modify or delete
  workNatureOriginal: text("work_nature_original"),
  // Synced field: auto-synced, do not modify or delete
  frequency: text("frequency"),
  // Synced field: auto-synced, do not modify or delete
  singleTimeCost: text("single_time_cost"),
  // Synced field: auto-synced, do not modify or delete
  aiBasicAutomationNote: text("ai_basic_automation_note"),
  // Synced field: auto-synced, do not modify or delete
  dataSource: text("data_source"),
  // Synced field: auto-synced, do not modify or delete
  otherNote: text("other_note"),
  /**
   * 负责人（人员）
   */
  // Synced field: auto-synced, do not modify or delete
  personInCharge1: jsonb("person_in_charge_1"),
  // Synced field: auto-synced, do not modify or delete
  startDate: date("start_date"),
  // Synced field: auto-synced, do not modify or delete
  endDate: date("end_date"),
  // Synced field: auto-synced, do not modify or delete
  correspondingSkill: text("corresponding_skill").array(),
  // Synced field: auto-synced, do not modify or delete
  appParentRecord: text("app_parent_record"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877190561540394").on(table.id),
  uniqueIndex("unq_1877190561541194").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmTasks = pgTable("hm_tasks", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appTask: text("app_task"),
  /**
   * 板块
   */
  // Synced field: auto-synced, do not modify or delete
  appSection: jsonb("app_section"),
  /**
   * 事项分类
   */
  // Synced field: auto-synced, do not modify or delete
  itemCategory: jsonb("item_category"),
  /**
   * 子分组
   */
  // Synced field: auto-synced, do not modify or delete
  subGroup: jsonb("sub_group"),
  // Synced field: auto-synced, do not modify or delete
  appStatus: text("app_status"),
  /**
   * 主任务
   */
  // Synced field: auto-synced, do not modify or delete
  mainTask: jsonb("main_task"),
  // Synced field: auto-synced, do not modify or delete
  appWeek: text("app_week"),
  // Synced field: auto-synced, do not modify or delete
  startDate: date("start_date"),
  // Synced field: auto-synced, do not modify or delete
  endDate: date("end_date"),
  responsiblePerson: userProfile("responsible_person"),
  /**
   * 艾莎
   */
  // Synced field: auto-synced, do not modify or delete
  appAisa: jsonb("app_aisa"),
  /**
   * 魔南
   */
  // Synced field: auto-synced, do not modify or delete
  monan: jsonb("monan"),
  /**
   * 岭罗
   */
  // Synced field: auto-synced, do not modify or delete
  lingluo: jsonb("lingluo"),
  /**
   * 榅桲
   */
  // Synced field: auto-synced, do not modify or delete
  wenbo: jsonb("wenbo"),
  /**
   * 全员
   */
  // Synced field: auto-synced, do not modify or delete
  allStaff: jsonb("all_staff"),
  /**
   * 川赤
   */
  // Synced field: auto-synced, do not modify or delete
  chuanchi: jsonb("chuanchi"),
  /**
   * 罗青
   */
  // Synced field: auto-synced, do not modify or delete
  luoqing: jsonb("luoqing"),
  /**
   * 大雀
   */
  // Synced field: auto-synced, do not modify or delete
  dacque: jsonb("dacque"),
  /**
   * 荔莴
   */
  // Synced field: auto-synced, do not modify or delete
  liwo: jsonb("liwo"),
  /**
   * 春豌
   */
  // Synced field: auto-synced, do not modify or delete
  chunwan: jsonb("chunwan"),
  /**
   * 银棠
   */
  // Synced field: auto-synced, do not modify or delete
  yinTang: jsonb("yin_tang"),
  /**
   * 果连
   */
  // Synced field: auto-synced, do not modify or delete
  guoLian: jsonb("guo_lian"),
  /**
   * 生碱
   */
  // Synced field: auto-synced, do not modify or delete
  shengJian: jsonb("sheng_jian"),
  /**
   * 华灰
   */
  // Synced field: auto-synced, do not modify or delete
  huaHui: jsonb("hua_hui"),
  /**
   * 双灯
   */
  // Synced field: auto-synced, do not modify or delete
  shuangDeng: jsonb("shuang_deng"),
  // Synced field: auto-synced, do not modify or delete
  appFatherRecord: text("app_father_record"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877190529081403").on(table.id),
  uniqueIndex("unq_1877190529082395").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const hmCoreMetrics = pgTable("hm_core_metrics", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appYear: text("app_year"),
  // Synced field: auto-synced, do not modify or delete
  sourceId: text("source_id"),
  // Synced field: auto-synced, do not modify or delete
  year1: text("year1"),
  // Synced field: auto-synced, do not modify or delete
  appDate: text("app_date"),
  channel: text("channel"),
  // Synced field: auto-synced, do not modify or delete
  activity: text("activity"),
  // Synced field: auto-synced, do not modify or delete
  appTarget: numeric("app_target"),
  // Synced field: auto-synced, do not modify or delete
  gmv: numeric("gmv"),
  gmvExclShoppingCredit: numeric("gmv_excl_shopping_credit"),
  // Synced field: auto-synced, do not modify or delete
  achievePercent: numeric("achieve_percent"),
  // Synced field: auto-synced, do not modify or delete
  refundAmount: numeric("refund_amount"),
  // Synced field: auto-synced, do not modify or delete
  refundRate: numeric("refund_rate"),
  // Synced field: auto-synced, do not modify or delete
  net: numeric("net"),
  // Synced field: auto-synced, do not modify or delete
  ipv: numeric("ipv"),
  // Synced field: auto-synced, do not modify or delete
  pdpIpv: numeric("pdp_ipv"),
  // Synced field: auto-synced, do not modify or delete
  uv: numeric("uv"),
  // Synced field: auto-synced, do not modify or delete
  aov: numeric("aov"),
  // Synced field: auto-synced, do not modify or delete
  cvr: numeric("cvr"),
  // Synced field: auto-synced, do not modify or delete
  appBuyers: numeric("app_buyers"),
  // Synced field: auto-synced, do not modify or delete
  gmvPcs: numeric("gmv_pcs"),
  // Synced field: auto-synced, do not modify or delete
  appAsp: numeric("app_asp"),
  // Synced field: auto-synced, do not modify or delete
  parentOrderQuantity: numeric("parent_order_quantity"),
  orderQuantity: numeric("order_quantity"),
  // Synced field: auto-synced, do not modify or delete
  paidOldBuyers: numeric("paid_old_buyers"),
  // Synced field: auto-synced, do not modify or delete
  appAtc: numeric("app_atc"),
  // Synced field: auto-synced, do not modify or delete
  atcPcs: numeric("atc_pcs"),
  atcRate: numeric("atc_rate"),
  // Synced field: auto-synced, do not modify or delete
  addCartItemsPerPerson: numeric("add_cart_items_per_person"),
  favoritesCountRate: numeric("favorites_count_rate"),
  // Synced field: auto-synced, do not modify or delete
  favoritesCount: numeric("favorites_count"),
  // Synced field: auto-synced, do not modify or delete
  avgStayDurationS: numeric("avg_stay_duration_s"),
  // Synced field: auto-synced, do not modify or delete
  memberJoinUv: numeric("member_join_uv"),
  memberReturnUv: numeric("member_return_uv"),
  // Synced field: auto-synced, do not modify or delete
  memberScale: numeric("member_scale"),
  // Synced field: auto-synced, do not modify or delete
  memberBuyers: numeric("member_buyers"),
  // Synced field: auto-synced, do not modify or delete
  memberBuyersSob: numeric("member_buyers_sob"),
  // Synced field: auto-synced, do not modify or delete
  memberGmv: numeric("member_gmv"),
  // Synced field: auto-synced, do not modify or delete
  memberGmvSob: numeric("member_gmv_sob"),
  storeLevelRanking: text("store_level_ranking"),
  shopPerformanceScore: numeric("shop_performance_score"),
  cpsGmv: numeric("cps_gmv"),
  // Synced field: auto-synced, do not modify or delete
  lsGmv: numeric("ls_gmv"),
  // Synced field: auto-synced, do not modify or delete
  lsBuyers: numeric("ls_buyers"),
  // Synced field: auto-synced, do not modify or delete
  lsAov: numeric("ls_aov"),
  // Synced field: auto-synced, do not modify or delete
  lsUv: numeric("ls_uv"),
  lsMemberJoinUv: numeric("ls_member_join_uv"),
  unitPriceTarget: numeric("unit_price_target"),
  conversionRateTarget: numeric("conversion_rate_target"),
  itemUnitPriceTarget: numeric("item_unit_price_target"),
  netSalesTarget: numeric("net_sales_target"),
  appRank: numeric("app_rank"),
  /**
   * 活动期
   */
  activityPeriod: jsonb("activity_period"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1877190680257675").on(table.id),
  uniqueIndex("unq_1877190680257707").on(table.baseRecordId),
]);

// table aliases
export const hmActivityTimelineTable = hmActivityTimeline;
export const hmBrandTargetsTable = hmBrandTargets;
export const hmCompanyTargetsTable = hmCompanyTargets;
export const hmCoreMetricsTable = hmCoreMetrics;
export const hmCoreMetrics2025Table = hmCoreMetrics2025;
export const hmTaskMainTable = hmTaskMain;
export const hmTaskTemplatesTable = hmTaskTemplates;
export const hmTasksTable = hmTasks;
