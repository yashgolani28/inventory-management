import { useEffect, useState } from "react";
import {
  login,
  register,
} from "./api";
import essiLogo from "./essi_logo.png";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
  const [companyBlurb, setCompanyBlurb] = useState<string | null>(null);

  useEffect(() => {
    // Check if server is reachable
    fetch(`${BASE_URL}/health`)
      .then(() => setServerStatus("online"))
      .catch(() => setServerStatus("offline"));

  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, email || undefined);
        // Auto-login after registration
        await login(username, password);
      }
      onLogin();
    } catch (e: any) {
      console.error("Auth error:", e);
      const errorMsg = e.message || "Authentication failed";
      setError(errorMsg.includes("Network error") || errorMsg.includes("Failed to fetch") 
        ? "Cannot connect to server. Make sure the backend is running on http://localhost:8000"
        : errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src={essiLogo} alt="ESSI" className="login-logo" />
            <div className="login-header-text">
              <h1>Inventory Management</h1>
              <p>Network Infrastructure Control Center</p>
            </div>
          </div>

          {serverStatus === "offline" && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>
                <strong>Server not reachable!</strong> Make sure the backend is running on {BASE_URL}. 
                Start it with: <code>uvicorn app.main:app --reload</code>
              </span>
            </div>
          )}
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="email">Email (optional)</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: "100%" }}>
              {loading ? "🔄 Processing..." : isLogin ? "🔐 Sign In" : "📝 Register"}
            </button>

            <div className="auth-toggle">
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setUsername("");
                  setPassword("");
                  setEmail("");
                }}
                disabled={loading}
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

