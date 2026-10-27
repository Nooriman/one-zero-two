import axios, { type AxiosRequestConfig } from "axios";

export type DebtRecord = {
  id: number;
  person: string;
  amount: string;
  description: string;
  paidAt: string | null;
  createdAt: string;
};

const client = axios.create({
  baseURL: "/api/debts",
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

export const listDebts = () => request<DebtRecord[]>({ url: "" });

export const getDebt = (id: number) => request<DebtRecord>({ url: `/${id}` });

export const createDebt = (input: { person: string; amount: number; description: string }) =>
  request<DebtRecord>({ url: "", method: "POST", data: input });

export const markDebtPaid = (id: number) =>
  request<DebtRecord>({ url: `/${id}/paid`, method: "POST" });

export const formatAmount = (amount: string) =>
  "$" + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
