import axios, { type AxiosRequestConfig } from "axios";
import { nextMonthStart } from "../lib/month";

export type LiabilityRecord = {
  id: number;
  description: string;
  amount: string;
  createdAt: string;
};

export type LiabilityInput = { description: string; amount: string };

const client = axios.create({
  baseURL: "/api/liabilities",
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

/** Without a range: the plan going forward (what next month looks like). With one: what counts in that month. */
export const listLiabilities = (range?: { from: Date; to: Date }) =>
  request<LiabilityRecord[]>({
    url: "",
    params: range && { from: range.from.toISOString(), to: range.to.toISOString() },
  });

export const createLiability = (input: LiabilityInput) =>
  request<LiabilityRecord>({ url: "", method: "POST", data: { ...input, effectiveFrom: nextMonthStart().toISOString() } });

export const updateLiability = (id: number, input: LiabilityInput) =>
  request<LiabilityRecord>({
    url: `/${id}`,
    method: "PATCH",
    data: { ...input, effectiveFrom: nextMonthStart().toISOString() },
  });

export const deleteLiability = (id: number) =>
  request<void>({ url: `/${id}`, method: "DELETE", params: { effectiveFrom: nextMonthStart().toISOString() } });
