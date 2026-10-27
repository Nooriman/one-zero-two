export type DebtRecord = {
  id: number;
  person: string;
  amount: string;
  description: string;
  paidAt: string | null;
  createdAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/debts${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

export const listDebts = () => request<DebtRecord[]>("");

export const getDebt = (id: number) => request<DebtRecord>(`/${id}`);

export const createDebt = (input: { person: string; amount: number; description: string }) =>
  request<DebtRecord>("", { method: "POST", body: JSON.stringify(input) });

export const markDebtPaid = (id: number) =>
  request<DebtRecord>(`/${id}/paid`, { method: "POST" });

export const formatAmount = (amount: string) =>
  "$" + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
