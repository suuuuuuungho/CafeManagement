import { useEffect, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { api, type Venue } from "../lib/api";
import { useActiveVenue, venueQuery } from "../lib/activeVenue";

export function AdminSettings() {
  const { venueId } = useActiveVenue();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [banks, setBanks] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!venueId) return;
    api.get<Venue>(`/api/admin/venue${venueQuery(venueId)}`).then(setVenue).catch(() => {});
  }, [venueId]);

  useEffect(() => {
    api.get<string[]>("/api/meta/banks").then(setBanks).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!venue) return;
    await api.patch(`/api/admin/venue${venueQuery(venueId)}`, {
      name: venue.name,
      bank_name: venue.bank_name,
      bank_account_no: venue.bank_account_no,
      bank_account_holder: venue.bank_account_holder,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!venueId || !venue) {
    return (
      <AdminShell title="설정">
        <p className="text-body-sm text-on-surface-variant">먼저 업장을 선택해주세요.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="설정">
      <form
        onSubmit={save}
        className="max-w-lg bg-surface-container-lowest rounded-xl shadow-sm p-padding-card flex flex-col gap-stack-md"
      >
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">매장명</span>
          <input
            value={venue.name}
            onChange={(e) => setVenue({ ...venue, name: e.target.value })}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">은행명</span>
            <select
              value={venue.bank_name}
              onChange={(e) => setVenue({ ...venue, bank_name: e.target.value })}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none"
            >
              {!banks.includes(venue.bank_name) && venue.bank_name && (
                <option value={venue.bank_name}>{venue.bank_name}</option>
              )}
              {banks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">예금주</span>
            <input
              value={venue.bank_account_holder}
              onChange={(e) => setVenue({ ...venue, bank_account_holder: e.target.value })}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">계좌번호</span>
          <input
            value={venue.bank_account_no}
            onChange={(e) => setVenue({ ...venue, bank_account_no: e.target.value })}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none"
          />
        </label>

        <button type="submit" className="bg-primary text-on-primary rounded-lg py-2.5 font-semibold text-body-md">
          {saved ? "저장됨" : "저장"}
        </button>
      </form>
    </AdminShell>
  );
}
