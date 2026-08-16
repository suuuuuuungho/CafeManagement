import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { DotGridBackground } from "../components/DotGridBackground";

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [banks, setBanks] = useState<string[]>([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    venue_name: "",
    bank_name: "",
    bank_account_no: "",
    bank_account_holder: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<string[]>("/api/meta/banks")
      .then((list) => {
        setBanks(list);
        setForm((f) => (f.bank_name ? f : { ...f, bank_name: list[0] ?? "" }));
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(form);
      navigate("/admin/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-margin-page">
      <DotGridBackground />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl p-padding-card flex flex-col gap-stack-sm my-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">local_cafe</span>
          <h1 className="text-headline-md font-headline-md">업장 회원가입</h1>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">아이디 (영문/숫자/밑줄, 4~20자)</span>
          <input
            type="text"
            required
            pattern="[a-zA-Z0-9_]{4,20}"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">비밀번호 (8자 이상)</span>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <div className="h-px bg-surface-variant my-2" />

        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">매장명</span>
          <input
            required
            value={form.venue_name}
            onChange={(e) => set("venue_name", e.target.value)}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <div className="h-px bg-surface-variant my-2" />
        <p className="text-label-caps text-on-surface-variant">입금 받을 계좌 (손님에게 그대로 안내됩니다)</p>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">은행명</span>
            <select
              required
              value={form.bank_name}
              onChange={(e) => set("bank_name", e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
            >
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
              value={form.bank_account_holder}
              onChange={(e) => set("bank_account_holder", e.target.value)}
              className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">계좌번호</span>
          <input
            value={form.bank_account_no}
            onChange={(e) => set("bank_account_no", e.target.value)}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        {error && <p className="text-body-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-primary text-on-primary rounded-lg py-2.5 font-semibold text-body-md shadow-md hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {loading ? "가입 중..." : "가입하고 시작하기"}
        </button>

        <p className="text-body-sm text-on-surface-variant text-center">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-primary font-semibold">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
