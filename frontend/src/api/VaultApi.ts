import axios from "axios";

export type VaultMeta = { salt: string; iterations: number; check: string };

const client = axios.create({
  baseURL: "/api/vault",
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

/** Null until someone sets the vault up. */
export const getVault = () => request<VaultMeta | null>({ url: "" });

export const createVault = (meta: VaultMeta) => request<VaultMeta>({ url: "", method: "POST", data: meta });
