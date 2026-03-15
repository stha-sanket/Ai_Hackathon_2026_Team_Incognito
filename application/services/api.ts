import { Platform } from "react-native";
import Constants from "expo-constants";

// Explicitly set to your machine's Wi-Fi IP address for Expo Go to work effortlessly
let API_BASE_URL = "http://172.20.10.53:3000/api";

// (Optional) Fallbacks for other environments if needed

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  token?: string | null;
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    // Throw an error object that mimics an axios-style error so callers can read .response.data.message
    const error: any = new Error(data?.message || "Request failed");
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
}

const api = {
  post: <T = unknown>(
    path: string,
    body: Record<string, unknown>,
    token?: string | null,
  ) =>
    request<T>(path, { method: "POST", body, token }).then((data) => ({
      data,
    })),

  get: <T = unknown>(path: string, token?: string | null) =>
    request<T>(path, { method: "GET", token }).then((data) => ({ data })),

  put: <T = unknown>(
    path: string,
    body: Record<string, unknown>,
    token?: string | null,
  ) =>
    request<T>(path, { method: "PUT", body, token }).then((data) => ({ data })),

  delete: <T = unknown>(path: string, token?: string | null) =>
    request<T>(path, { method: "DELETE", token }).then((data) => ({ data })),
};

export default api;
