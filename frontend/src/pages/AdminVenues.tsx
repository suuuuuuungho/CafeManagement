import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "../components/AdminShell";
import { api, type Venue } from "../lib/api";
import { useActiveVenue } from "../lib/activeVenue";

export function AdminVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const { setSelectedVenue, venueId } = useActiveVenue();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Venue[]>("/api/admin/venues").then(setVenues).catch(() => {});
  }, []);

  function operateAs(v: Venue) {
    setSelectedVenue(v.id, v.slug);
    navigate("/admin/orders");
  }

  return (
    <AdminShell title="전체 업장">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-grid">
        {venues.map((v) => (
          <div key={v.id} className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-headline-sm font-headline-sm">{v.name}</p>
              {v.id === venueId && (
                <span className="text-label-caps bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">
                  선택됨
                </span>
              )}
            </div>
            <p className="text-code-sm font-code-sm text-on-surface-variant">/{v.slug}</p>
            <button
              onClick={() => operateAs(v)}
              className="mt-1 bg-primary text-on-primary rounded-lg py-2 text-body-sm font-semibold"
            >
              이 업장 관리하기
            </button>
          </div>
        ))}
        {venues.length === 0 && <p className="text-body-sm text-on-surface-variant">아직 가입한 업장이 없습니다.</p>}
      </div>
    </AdminShell>
  );
}
