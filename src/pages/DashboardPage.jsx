import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/dashboard';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err.message || 'Không tải được thống kê'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <div className="form-error">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__value">{stats.totalOrders}</div>
          <div className="stat-card__label">Tổng số đơn</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.recentOrders7d}</div>
          <div className="stat-card__label">Đơn 7 ngày gần nhất</div>
        </div>
      </div>

      <h2>Số đơn theo trạng thái</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Trạng thái</th>
            <th>Số lượng</th>
          </tr>
        </thead>
        <tbody>
          {stats.byStatus.length === 0 && (
            <tr>
              <td colSpan={2} className="empty-cell">
                Chưa có dữ liệu
              </td>
            </tr>
          )}
          {stats.byStatus.map((s) => (
            <tr key={s.status}>
              <td>{s.status}</td>
              <td>{s.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
