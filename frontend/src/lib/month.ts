/** Local midnight on the 1st of next month; liability changes take effect from here. */
export function nextMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export const monthName = (date: Date) => date.toLocaleDateString("en-US", { month: "long" });
