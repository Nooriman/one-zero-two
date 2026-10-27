import { listExpenses } from "../api/ExpenseApi";
import { listLiabilities, type LiabilityRecord } from "../api/LiabilityApi";

/** This month's liabilities split by whether an expense linked to them exists in the current month. */
export async function loadLiabilityStatus(): Promise<{ all: LiabilityRecord[]; unpaid: LiabilityRecord[] }> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [all, expenses] = await Promise.all([listLiabilities({ from, to }), listExpenses({ from, to })]);
  const paid = new Set(expenses.map((e) => e.liabilityId));
  return { all, unpaid: all.filter((l) => !paid.has(l.id)) };
}
