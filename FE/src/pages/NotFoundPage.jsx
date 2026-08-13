import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>404</h1>
        <p>Không tìm thấy trang.</p>
        <Link to="/orders">Về trang đơn hàng</Link>
      </div>
    </div>
  );
}
