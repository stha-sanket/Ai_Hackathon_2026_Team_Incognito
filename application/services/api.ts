const API_BASE_URL = "http://localhost:3000/api";

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
