import { useEffect, useState, type ReactNode } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import ListPage from "./pages/ListPage";
import StatsPage from "./pages/Stats";
import Login from "./pages/Login";
import { getRandom } from "./api";
import { useAuth } from "./AuthContext";

function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("watchlist-theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("watchlist-theme", theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "light" ? "dark" : "light"))];
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [rolling, setRolling] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  async function rollRandom() {
    setRolling(true);
    try {
      const comic = await getRandom();
      setTimeout(() => { setRolling(false); navigate(`/comic/${comic.id}`); }, 650);
    } catch {
      setRolling(false);
      alert("Couldn't reach the comics database. Is the backend running on port 3000?");
    }
  }

  return (
    <>
      <header className="masthead">
        <div className="brand">
          <NavLink to="/" className="logo">WATCH<span className="o">LIST</span></NavLink>
          <div>
            <span className="issue-no">N°001</span>
            <div className="tagline">Your comics readlist</div>
          </div>
        </div>
        <nav>
          <NavLink to="/" className={({ isActive }) => "nav-btn" + (isActive ? " active" : "")} end>Browse</NavLink>
          <NavLink to="/list" className={({ isActive }) => "nav-btn" + (isActive ? " active" : "")}>My List</NavLink>
          <NavLink to="/stats" className={({ isActive }) => "nav-btn" + (isActive ? " active" : "")}>Stats</NavLink>
          <button className="nav-btn dice" onClick={rollRandom} disabled={rolling}>
            <span className="pip">⚄</span> Random
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? "◑ Dark" : "◐ Light"}
          </button>
          {user ? (
            <button className="theme-toggle" onClick={() => logout()} title={user.email}>⏻ Logout</button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => "nav-btn" + (isActive ? " active" : "")}>Log in</NavLink>
          )}
        </nav>
      </header>

      <main key={location.pathname} className="fade">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/comic/:id" element={<Detail />} />
          <Route path="/list" element={<Protected><ListPage /></Protected>} />
          <Route path="/stats" element={<Protected><StatsPage /></Protected>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>

      {rolling && (
        <div id="splash" onClick={() => setRolling(false)}>
          <div className="word">Random!</div>
        </div>
      )}
    </>
  );
}