import axios, { type AxiosRequestConfig } from "axios";

export type ExpenseRecord = {
  id: number;
  description: string;
  amount: string;
  createdAt: string;
  liabilityId: number | null;
};

export type ExpenseInput = { description: string; amount: string; createdAt?: string; liabilityId?: number };

const client = axios.create({
  baseURL: "/api/expenses",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await client.request<T>(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error ?? "Something went wrong.");
    }
    throw error;
  }
}

/** Expenses with createdAt in [from, to). */
export const listExpenses = (range?: { from: Date; to: Date }) =>
  request<ExpenseRecord[]>({
    url: "",
    params: range && { from: range.from.toISOString(), to: range.to.toISOString() },
  });

export const createExpense = (input: ExpenseInput) =>
  request<ExpenseRecord>({ url: "", method: "POST", data: input });
