import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="vtp-shell">
      <header className="vtp-header">
        <div className="vtp-header-left">
          <Link to="/orders" className="vtp-brand">
            <div className="vtp-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span>VTP Orders</span>
          </Link>
          <nav className="vtp-nav-links">
            <NavLink to="/orders" end className={({ isActive }) => (isActive ? 'vtp-nav-link active' : 'vtp-nav-link')}>
              Đơn hàng
            </NavLink>
            <NavLink to="/orders/import" className={({ isActive }) => (isActive ? 'vtp-nav-link active' : 'vtp-nav-link')}>
              Import Excel
            </NavLink>
          </nav>
        </div>

        <div className="vtp-header-right">
          <div className="vtp-user-profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{user?.displayName || user?.username || 'Admin'}</span>
          </div>
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
