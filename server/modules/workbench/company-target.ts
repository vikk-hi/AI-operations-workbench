export interface CompanyMonthRow {
  month: string | null;
  shop: string | null;
  gmv: number | null;
  net: number | null;
}

export interface CompanyTargetSummary {
  mtd: { gmv: number | null; net: number | null };
  ytd: { gmv: number | null; net: number | null };
  october: { gmv: number | null; net: number | null };
}

const empty = () => ({ gmv: null, net: null });

export function summarizeCompanyTargets(rows: readonly CompanyMonthRow[], asOf: string): CompanyTargetSummary {
  const currentMonth: number = Number(asOf.slice(5, 7));
  const valid = rows.map((row) => ({ ...row, monthNumber: Number(row.month?.match(/^(\d{1,2})月$/)?.[1]) }))
    .filter((row) => row.shop === 'HM官方旗舰店_天猫' && row.monthNumber >= 1 && row.monthNumber <= 12);
  const forMonth = (month: number) => valid.find((row) => row.monthNumber === month);
  const sumThrough = (month: number) => {
    const selected = valid.filter((row) => row.monthNumber <= month);
    const complete = selected.length === month && new Set(selected.map((row) => row.monthNumber)).size === month;
    return {
      gmv: complete && selected.every((row) => row.gmv !== null) ? selected.reduce((sum, row) => sum + (row.gmv ?? 0), 0) : null,
      net: complete && selected.every((row) => row.net !== null) ? selected.reduce((sum, row) => sum + (row.net ?? 0), 0) : null,
    };
  };
  const mtd = forMonth(currentMonth);
  const october = forMonth(10);
  return {
    mtd: mtd ? { gmv: mtd.gmv, net: mtd.net } : empty(),
    ytd: sumThrough(currentMonth),
    october: october ? { gmv: october.gmv, net: october.net } : empty(),
  };
}
