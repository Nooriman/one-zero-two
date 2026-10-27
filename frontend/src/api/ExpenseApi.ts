import axios, { type AxiosRequestConfig } from "axios";

export type ExpenseRecord = {
  id: number;
  description: string;
  amount: string;
  createdAt: string;
};

export type ExpenseInput = { description: string; amount: string };

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

export const listExpenses = () => request<ExpenseRecord[]>({ url: "" });

export const createExpense = (input: ExpenseInput) =>
  request<ExpenseRecord>({ url: "", method: "POST", data: input });

export const updateExpense = (id: number, input: ExpenseInput) =>
  request<ExpenseRecord>({ url: `/${id}`, method: "PATCH", data: input });

export const deleteExpense = (id: number) => request<void>({ url: `/${id}`, method: "DELETE" });
