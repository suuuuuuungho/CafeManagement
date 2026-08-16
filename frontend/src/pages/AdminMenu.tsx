import { useEffect, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { api, type MenuItem } from "../lib/api";
import { useActiveVenue, venueQuery } from "../lib/activeVenue";

export function AdminMenu() {
  const { venueId } = useActiveVenue();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function refresh() {
    if (!venueId) return;
    api.get<MenuItem[]>(`/api/admin/menu-items${venueQuery(venueId)}`).then(setItems).catch(() => {});
  }

  useEffect(refresh, [venueId]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) return;
    await api.post(`/api/admin/menu-items${venueQuery(venueId)}`, { name, price: Number(price) });
    setName("");
    setPrice("");
    refresh();
  }

  async function toggleAvailable(item: MenuItem) {
    await api.patch(`/api/admin/menu-items/${item.id}${venueQuery(venueId)}`, {
      is_available: !item.is_available,
    });
    refresh();
  }

  async function remove(item: MenuItem) {
    await api.delete(`/api/admin/menu-items/${item.id}${venueQuery(venueId)}`);
    refresh();
  }

  if (!venueId) {
    return (
      <AdminShell title="메뉴관리">
        <p className="text-body-sm text-on-surface-variant">먼저 업장을 선택해주세요.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="메뉴관리">
      <form onSubmit={addItem} className="flex gap-2 mb-gutter-grid bg-surface-container-lowest rounded-xl p-4 shadow-sm">
        <input
          placeholder="메뉴명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-surface-container-low rounded-lg px-3 py-2 text-body-sm outline-none"
        />
        <input
          placeholder="가격"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-32 bg-surface-container-low rounded-lg px-3 py-2 text-body-sm outline-none"
        />
        <button type="submit" className="bg-primary text-on-primary rounded-lg px-4 text-body-sm font-semibold">
          추가
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-grid">
        {items.map((item) => (
          <div key={item.id} className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-body-md font-semibold">{item.name}</p>
              <p className="text-body-sm text-on-surface-variant">{item.price.toLocaleString()}원</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAvailable(item)}
                className={`text-label-caps px-2 py-1 rounded-full ${
                  item.is_available ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {item.is_available ? "판매중" : "품절"}
              </button>
              <button onClick={() => remove(item)} className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
