import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">NXC</div>
        <nav className="app-nav">
          <NavLink to="/orders" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Đơn hàng
          </NavLink>
          <NavLink to="/orders/import" className={({ isActive }) => (isActive ? 'active' : '')}>
            Import Excel
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
        </nav>
        <div className="app-header__user">
          <span>
            {user?.displayName || user?.username} ({user?.role})
          </span>
          <button type="button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
