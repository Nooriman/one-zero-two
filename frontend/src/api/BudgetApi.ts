import axios from "axios";

const client = axios.create({
  baseURL: "/api/budget",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

async function request<T>(config: Parameters<typeof client.request>[0]): Promise<T> {
  try {
    return (await client.request<T>(config)).data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error ?? "Something went wrong.");
    }
    throw error;
  }
}

export type Budget = { amount: string | null };

export const getBudget = () => request<Budget>({ url: "" });

export const setBudget = (amount: string) => request<Budget>({ url: "", method: "PUT", data: { amount } });
