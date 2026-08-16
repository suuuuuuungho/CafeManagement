import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError, type MenuItem, type Order, type Category } from "../lib/api";
import { DotGridBackground } from "../components/DotGridBackground";

interface TableInfo {
  table_id: string;
  table_no: number;
  venue: {
    id: string;
    name: string;
    slug: string;
    bank_name: string;
    bank_account_no: string;
    bank_account_holder: string;
  };
}

type Cart = Record<string, number>; // menu_item_id -> qty

const STATUS_LABEL: Record<Order["status"], string> = {
  payment_pending: "입금 대기중",
  payment_confirmed: "입금 확인 완료",
  preparing: "제조중",
  completed: "제조 완료 — 곧 가져다드릴게요",
  cancelled: "주문이 취소되었습니다",
};

export function OrderPage() {
  const [params] = useSearchParams();
  const slug = params.get("venue") ?? "";
  const tableNo = params.get("table") ?? "";

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [menu, setMenu] = useState<{ categories: Category[]; items: MenuItem[] } | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug || !tableNo) {
      setError("잘못된 접근입니다. 테이블의 QR/NFC를 다시 이용해주세요.");
      return;
    }
    Promise.all([
      api.get<TableInfo>(`/api/venues/${slug}/tables/${tableNo}`),
      api.get<{ categories: Category[]; items: MenuItem[] }>(`/api/venues/${slug}/menu`),
    ])
      .then(([t, m]) => {
        setTableInfo(t);
        setMenu(m);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "정보를 불러오지 못했습니다"));
  }, [slug, tableNo]);

  // Poll order status until it leaves payment_pending/preparing territory.
  useEffect(() => {
    if (!order || !slug) return;
    if (order.status === "completed" || order.status === "cancelled") return;
    const timer = setInterval(async () => {
      try {
        const fresh = await api.get<Order>(`/api/venues/${slug}/orders/${order.id}`);
        setOrder(fresh);
      } catch {
        // transient network hiccup — keep polling
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [order, slug]);

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function removeFromCart(id: string) {
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return next;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  const cartTotal =
    menu?.items.reduce((sum, item) => sum + (cart[item.id] ?? 0) * item.price, 0) ?? 0;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  async function submitOrder() {
    if (!tableInfo || cartCount === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.post<Order>(`/api/venues/${slug}/orders`, {
        table_id: tableInfo.table_id,
        items: Object.entries(cart).map(([menu_item_id, qty]) => ({ menu_item_id, qty })),
      });
      setOrder(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "주문에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !tableInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-margin-page bg-background">
        <p className="text-body-md text-error text-center">{error}</p>
      </div>
    );
  }

  if (!tableInfo || !menu) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-on-surface-variant">불러오는 중...</div>;
  }

  // ---- Payment / status screen after order submitted ----
  if (order) {
    return (
      <div className="min-h-screen bg-background relative">
        <DotGridBackground />
        <div className="relative z-10 max-w-md mx-auto p-margin-page flex flex-col gap-stack-md pt-10">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl p-padding-card flex flex-col gap-stack-sm items-center text-center">
            <span className="material-symbols-outlined text-primary text-[40px]">
              {order.status === "payment_pending" ? "account_balance" : "check_circle"}
            </span>
            <h2 className="text-headline-md font-headline-md">{STATUS_LABEL[order.status]}</h2>

            {order.status === "payment_pending" && (
              <div className="w-full mt-2 bg-surface-container-low rounded-lg p-4 flex flex-col gap-1 text-left">
                <p className="text-body-sm text-on-surface-variant">
                  {tableInfo.venue.bank_name} {tableInfo.venue.bank_account_no} (예금주: {tableInfo.venue.bank_account_holder})
                </p>
                <p className="text-headline-lg font-headline-lg text-primary mt-1">
                  {order.unique_amount.toLocaleString()}원
                </p>
                <p className="text-body-sm text-error font-semibold">
                  * 반드시 끝자리까지 정확한 금액을 입금해주세요
                </p>
              </div>
            )}
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-md p-padding-card">
            <p className="text-label-caps text-on-surface-variant mb-2">주문 내역</p>
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-body-sm py-1">
                <span>
                  {it.name_snapshot} x{it.qty}
                </span>
                <span>{(it.unit_price * it.qty).toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Menu / cart screen ----
  return (
    <div className="min-h-screen bg-background relative pb-28">
      <DotGridBackground />
      <div className="relative z-10 max-w-md mx-auto p-margin-page flex flex-col gap-stack-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">local_cafe</span>
          <div>
            <h1 className="text-headline-md font-headline-md">{tableInfo.venue.name}</h1>
            <p className="text-body-sm text-on-surface-variant">테이블 {tableInfo.table_no}</p>
          </div>
        </div>

        {menu.items.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">아직 등록된 메뉴가 없습니다.</p>
        )}

        <div className="flex flex-col gap-stack-sm">
          {menu.items.map((item) => (
            <div
              key={item.id}
              className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-body-md font-semibold">{item.name}</p>
                <p className="text-body-sm text-on-surface-variant">{item.price.toLocaleString()}원</p>
              </div>
              <div className="flex items-center gap-2">
                {cart[item.id] > 0 && (
                  <>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <span className="w-5 text-center text-body-sm">{cart[item.id]}</span>
                  </>
                )}
                <button
                  onClick={() => addToCart(item.id)}
                  className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-margin-page bg-surface-bright/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <button
            onClick={submitOrder}
            disabled={submitting}
            className="max-w-md mx-auto w-full bg-primary text-on-primary rounded-xl py-3 font-semibold text-body-md shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{submitting ? "주문 중..." : `${cartCount}개 주문하기`}</span>
            <span>·</span>
            <span>{cartTotal.toLocaleString()}원</span>
          </button>
        </div>
      )}
    </div>
  );
}
