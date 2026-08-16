import { useEffect, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { api, type Table } from "../lib/api";
import { useActiveVenue, venueQuery } from "../lib/activeVenue";

export function AdminTables() {
  const { venueId, venueSlug } = useActiveVenue();
  const [tables, setTables] = useState<Table[]>([]);
  const [tableNo, setTableNo] = useState("");

  function refresh() {
    if (!venueId) return;
    api.get<Table[]>(`/api/admin/tables${venueQuery(venueId)}`).then(setTables).catch(() => {});
  }

  useEffect(refresh, [venueId]);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (!tableNo) return;
    await api.post(`/api/admin/tables${venueQuery(venueId)}`, { table_no: Number(tableNo) });
    setTableNo("");
    refresh();
  }

  async function remove(id: string) {
    await api.delete(`/api/admin/tables/${id}${venueQuery(venueId)}`);
    refresh();
  }

  if (!venueId) {
    return (
      <AdminShell title="테이블관리">
        <p className="text-body-sm text-on-surface-variant">먼저 업장을 선택해주세요.</p>
      </AdminShell>
    );
  }

  const orderBaseUrl = `${window.location.origin}${window.location.pathname}#/order`;

  return (
    <AdminShell title="테이블관리">
      <form onSubmit={addTable} className="flex gap-2 mb-gutter-grid bg-surface-container-lowest rounded-xl p-4 shadow-sm">
        <input
          placeholder="테이블 번호"
          type="number"
          value={tableNo}
          onChange={(e) => setTableNo(e.target.value)}
          className="w-40 bg-surface-container-low rounded-lg px-3 py-2 text-body-sm outline-none"
        />
        <button type="submit" className="bg-primary text-on-primary rounded-lg px-4 text-body-sm font-semibold">
          테이블 추가
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-grid">
        {tables.map((table) => {
          const url = `${orderBaseUrl}?venue=${venueSlug}&table=${table.table_no}`;
          return (
            <div key={table.id} className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-headline-sm font-headline-sm">테이블 {table.table_no}</p>
                <button onClick={() => remove(table.id)} className="text-on-surface-variant hover:text-error">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              <p className="text-code-sm font-code-sm text-on-surface-variant break-all">{url}</p>
              <p className="text-label-caps text-on-surface-variant">
                이 URL을 QR로 만들거나 NFC 태그에 기록하세요 (backend/scripts/generate_qr.py 참고)
              </p>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
