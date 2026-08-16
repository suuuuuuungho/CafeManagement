import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { DotGridBackground } from "../components/DotGridBackground";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center p-margin-page">
      <DotGridBackground />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-xl p-padding-card flex flex-col gap-stack-md"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">local_cafe</span>
          <h1 className="text-headline-md font-headline-md">사장님 로그인</h1>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">아이디</span>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-label-caps text-on-surface-variant">비밀번호</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface-container-low rounded-lg px-3 py-2 text-body-md outline-none focus:ring-1 focus:ring-primary"
          />
        </label>

        {error && <p className="text-body-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-primary text-on-primary rounded-lg py-2.5 font-semibold text-body-md shadow-md hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <p className="text-body-sm text-on-surface-variant text-center">
          아직 계정이 없으신가요?{" "}
          <Link to="/signup" className="text-primary font-semibold">
            회원가입
          </Link>
        </p>
      </form>
    </div>
  );
}
