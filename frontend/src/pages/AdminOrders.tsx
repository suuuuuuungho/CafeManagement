import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { api, type Order } from "../lib/api";
import { useActiveVenue, venueQuery } from "../lib/activeVenue";
import { useVenueSocket } from "../lib/useVenueSocket";

const COLUMNS: { status: Order["status"]; label: string }[] = [
  { status: "payment_pending", label: "입금대기" },
  { status: "payment_confirmed", label: "입금확인" },
  { status: "preparing", label: "제조중" },
  { status: "completed", label: "제조완료" },
];

function elapsed(iso: string): string {
  // SQLite (local dev) returns naive datetimes with no timezone marker;
  // Postgres (prod) returns them already suffixed with "Z". Only append
  // one if it's actually missing, or "...Z" becomes "...ZZ" and fails to parse.
  const hasTz = /[zZ]|[+-]\d\d:\d\d$/.test(iso);
  const date = new Date(hasTz ? iso : iso + "Z");
  const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  return mins < 1 ? "방금" : `${mins}분 전`;
}

export function AdminOrders() {
  const { venueId, venueSlug } = useActiveVenue();
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!venueId) return;
    api.get<Order[]>(`/api/admin/orders${venueQuery(venueId)}`).then(setOrders).catch(() => {});
  }, [venueId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [refresh]);

  useVenueSocket(venueSlug, refresh);

  async function act(orderId: string, action: string) {
    setBusy(orderId);
    try {
      await api.post<Order>(`/api/admin/orders/${orderId}/${action}${venueQuery(venueId)}`);
      refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!venueId) {
    return (
      <AdminShell title="주문현황">
        <p className="text-body-sm text-on-surface-variant">
          최상위 관리자는 좌측 "전체 업장"에서 먼저 업장을 선택해주세요.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="주문현황">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter-grid">
        {COLUMNS.map((col) => (
          <div key={col.status} className="flex flex-col gap-stack-sm">
            <p className="text-label-caps text-on-surface-variant px-1">
              {col.label} ({orders.filter((o) => o.status === col.status).length})
            </p>
            <div className="flex flex-col gap-stack-sm">
              {orders
                .filter((o) => o.status === col.status)
                .map((order) => (
                  <div key={order.id} className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        {order.items.map((it) => (
                          <p key={it.id} className="text-body-sm">
                            {it.name_snapshot} x{it.qty}
                          </p>
                        ))}
                      </div>
                      <span className="text-label-caps text-on-surface-variant">{elapsed(order.created_at)}</span>
                    </div>
                    <p className="text-body-md font-semibold text-primary">{order.unique_amount.toLocaleString()}원</p>

                    {col.status === "payment_pending" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => act(order.id, "confirm-payment")}
                        className="bg-primary text-on-primary rounded-lg py-2 text-body-sm font-semibold disabled:opacity-60"
                      >
                        입금확인
                      </button>
                    )}
                    {col.status === "payment_confirmed" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => act(order.id, "start-preparing")}
                        className="bg-primary text-on-primary rounded-lg py-2 text-body-sm font-semibold disabled:opacity-60"
                      >
                        제조 시작
                      </button>
                    )}
                    {col.status === "preparing" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => act(order.id, "complete")}
                        className="bg-primary text-on-primary rounded-lg py-2 text-body-sm font-semibold disabled:opacity-60"
                      >
                        제조완료
                      </button>
                    )}
                    {col.status === "completed" && (
                      <button
                        disabled={busy === order.id || !order.visible_on_display}
                        onClick={() => act(order.id, "mark-picked-up")}
                        className="bg-secondary text-on-secondary rounded-lg py-2 text-body-sm font-semibold disabled:opacity-60"
                      >
                        {order.visible_on_display ? "수령완료" : "수령 처리됨"}
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
