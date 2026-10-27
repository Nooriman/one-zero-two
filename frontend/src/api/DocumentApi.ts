import axios, { type AxiosRequestConfig } from "axios";

export type DocumentRecord = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentInput = { title: string; content: string };

const client = axios.create({
  baseURL: "/api/documents",
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

export const listDocuments = () => request<DocumentRecord[]>({ url: "" });

export const createDocument = (input: DocumentInput) =>
  request<DocumentRecord>({ url: "", method: "POST", data: input });

export const updateDocument = (id: number, input: DocumentInput) =>
  request<DocumentRecord>({ url: `/${id}`, method: "PATCH", data: input });

export const deleteDocument = (id: number) => request<void>({ url: `/${id}`, method: "DELETE" });
