const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function wsUrl(slug: string): string {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return `${wsBase}/ws/${slug}`;
}

// ---- Types mirroring backend/app/schemas.py ----

export type UserRole = "super_admin" | "venue_owner";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  venue_id: string | null;
  venue_slug: string | null;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  is_active: boolean;
}

export interface Table {
  id: string;
  table_no: number;
  qr_token: string;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  price: number;
  is_available: boolean;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export type OrderStatus = "payment_pending" | "payment_confirmed" | "preparing" | "completed" | "cancelled";

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name_snapshot: string;
  qty: number;
  unit_price: number;
}

export interface Order {
  id: string;
  venue_id: string;
  table_id: string;
  status: OrderStatus;
  subtotal: number;
  unique_amount: number;
  order_seq: number;
  confirmed_method: "auto" | "manual" | null;
  confirmed_at: string | null;
  visible_on_display: boolean;
  created_at: string;
  items: OrderItem[];
}
