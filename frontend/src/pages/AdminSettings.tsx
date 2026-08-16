import { useEffect, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { API_BASE, api, type Venue } from "../lib/api";
import { useActiveVenue, venueQuery } from "../lib/activeVenue";

function CopyField({ label, value, mask }: { label: string; value: string; mask?: boolean }) {
  const [revealed, setRevealed] = useState(!mask);
  const shown = revealed ? value : "•".repeat(Math.min(value.length, 24));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-caps text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        <code className="text-code-sm font-code-sm bg-surface-container-low rounded-lg px-3 py-2 flex-1 break-all">
          {shown}
        </code>
        {mask && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="shrink-0 w-9 h-9 flex items-center justify-center bg-surface-container-low rounded-lg hover:bg-surface-container-high"
            title={revealed ? "숨기기" : "보기"}
          >
            <span className="material-symbols-outlined text-[18px]">{revealed ? "visibility_off" : "visibility"}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value)}
          className="shrink-0 w-9 h-9 flex items-center justify-center bg-surface-container-low rounded-lg hover:bg-surface-container-high"
          title="복사"
        >
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
        </button>
      </div>
    </div>
  );
}

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
      <div className="max-w-lg bg-surface-container-lowest rounded-xl shadow-sm p-padding-card flex flex-col gap-stack-md mb-stack-md">
        <CopyField label="업장 URL (QR/NFC 링크에 사용됩니다, 가입 시 자동 생성)" value={venue.slug} />
        <CopyField
          label="입금 자동매칭 웹훅 주소 (폰 자동화 스크립트에 설정)"
          value={`${API_BASE}/api/webhook/deposit/${venue.slug}`}
        />
        <CopyField label="웹훅 시크릿 키 (폰 자동화 스크립트에 설정, 외부에 노출 금지)" value={venue.webhook_secret} mask />
      </div>

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
