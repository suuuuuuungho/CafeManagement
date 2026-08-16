import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Order } from "../lib/api";
import { useVenueSocket } from "../lib/useVenueSocket";
import { DotGridBackground } from "../components/DotGridBackground";

export function Display() {
  const [params] = useSearchParams();
  const slug = params.get("venue");
  const [orders, setOrders] = useState<Order[]>([]);

  const refresh = useCallback(() => {
    if (!slug) return;
    api.get<Order[]>(`/api/venues/${slug}/display`).then(setOrders).catch(() => {});
  }, [slug]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  useVenueSocket(slug, refresh);

  if (!slug) {
    return <div className="min-h-screen flex items-center justify-center bg-background">잘못된 접근입니다.</div>;
  }

  const preparing = orders.filter((o) => o.status === "preparing");
  const completed = orders.filter((o) => o.status === "completed");

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <DotGridBackground />
      <div className="relative z-10 p-margin-page h-screen flex flex-col">
        <h1 className="text-headline-lg font-headline-lg text-center mb-gutter-grid">제조 현황</h1>
        <div className="flex-1 grid grid-cols-2 gap-gutter-grid overflow-hidden">
          <section className="flex flex-col gap-stack-md">
            <p className="text-headline-md font-headline-md text-center text-on-surface-variant">제조중</p>
            <div className="flex flex-wrap gap-stack-md justify-center content-start overflow-y-auto">
              {preparing.map((o) => (
                <div
                  key={o.id}
                  className="w-32 h-32 bg-surface-container-lowest rounded-xl shadow-md flex items-center justify-center"
                >
                  <span className="text-headline-lg font-headline-lg">#{o.order_seq}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-stack-md">
            <p className="text-headline-md font-headline-md text-center text-primary">제조완료</p>
            <div className="flex flex-wrap gap-stack-md justify-center content-start overflow-y-auto">
              {completed.map((o) => (
                <div
                  key={o.id}
                  className="w-32 h-32 bg-primary-container rounded-xl shadow-md flex items-center justify-center"
                >
                  <span className="text-headline-lg font-headline-lg text-on-primary-container">#{o.order_seq}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
