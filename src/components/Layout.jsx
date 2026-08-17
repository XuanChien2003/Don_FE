import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="vtp-shell">
      <header className="vtp-header">
        <div className="vtp-header-left">
          <Link to="/orders" className="vtp-brand">
            <img src="/Logo.png" alt="New Horizon Logistics" className="vtp-brand-logo" />
          </Link>
          <nav className="vtp-nav-links">
            <NavLink to="/orders" end className={({ isActive }) => (isActive ? 'vtp-nav-link active' : 'vtp-nav-link')}>
              Đơn hàng
            </NavLink>
            <NavLink to="/orders/import" className={({ isActive }) => (isActive ? 'vtp-nav-link active' : 'vtp-nav-link')}>
              Import Excel
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/partners" className={({ isActive }) => (isActive ? 'vtp-nav-link active' : 'vtp-nav-link')}>
                Đối tác
              </NavLink>
            )}
          </nav>
        </div>

        <div className="vtp-header-right">
          <Link to="/profile" className="vtp-user-profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{user?.displayName || user?.username || 'Admin'}</span>
          </Link>
          <button type="button" className="vtp-logout-btn" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="vtp-main-container">
        <Outlet />
      </main>
    </div>
  );
}
