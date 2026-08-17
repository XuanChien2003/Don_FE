import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchBatchLabelPdf, listOrders } from '../api/orders';
import { getDashboardStats } from '../api/dashboard';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';

export function getStatusBadgeInfo(status) {
  if (!status) return { label: 'Chờ XL', className: 'badge-secondary' };
  const s = String(status).toLowerCase();
  if (s.includes('đang vc') || s.includes('vận chuyển') || s.includes('dang vc')) {
    return { label: 'Đang VC', className: 'badge-warning' };
  }
  if (s.includes('đã giao') || s.includes('da giao') || s.includes('giao thành công')) {
    return { label: 'Đã giao', className: 'badge-success' };
  }
  if (s.includes('phát') || s.includes('đang phát')) {
    return { label: 'Đang phát', className: 'badge-info' };
  }
  if (s.includes('chờ') || s.includes('xl') || s.includes('mới')) {
    return { label: 'Chờ XL', className: 'badge-secondary' };
  }
  if (s.includes('hoàn') || s.includes('hủy') || s.includes('thất bại')) {
    return { label: 'Hoàn', className: 'badge-danger' };
  }
  return { label: status, className: 'badge-secondary' };
}

function openPdfBlob(blob, targetWindow) {
  const url = URL.createObjectURL(blob);
  if (targetWindow) {
    targetWindow.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function OrdersListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [data, setData] = useState({ items: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [printing, setPrinting] = useState(false);

  // Fetch stats and order list from Backend API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, ordersRes] = await Promise.allSettled([
        getDashboardStats(),
        listOrders({
          internalCode: searchQuery,
          currentStatus: statusFilter,
          page,
          limit,
        }),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.items) {
        setData(ordersRes.value);
      }
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu từ hệ thống');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, page, limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  // Export orders to CSV file
  const handleExportCSV = () => {
    const itemsToExport = data.items || [];
    if (itemsToExport.length === 0) {
      toast.info('Không có đơn nào để xuất');
      return;
    }
    const headers = ['MÃ ĐƠN', 'TRẠNG THÁI', 'NGƯỜI NHẬN', 'DỊCH VỤ', 'COD', 'CẬP NHẬT'];
    const rows = itemsToExport.map((o) => [
      o.internalCode,
      o.currentStatus || 'Chờ XL',
      `"${o.receiverName || ''}"`,
      o.serviceName || o.productInfo || 'VHT',
      o.cod != null ? o.cod : 0,
      new Date(o.currentStatusDate || Date.now()).toLocaleString('vi-VN'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VTP_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${itemsToExport.length} đơn ra CSV`);
  };

  const handlePrintSelected = async () => {
    if (selected.size === 0) return;
    // Opened synchronously (still inside the click's user-activation window) so the browser
    // doesn't silently popup-block the tab once the network request resolves later.
    const pdfWindow = window.open('', '_blank', 'noopener');
    setPrinting(true);
    try {
      const blob = await fetchBatchLabelPdf({ internalCodes: [...selected] });
      openPdfBlob(blob, pdfWindow);
    } catch (err) {
      if (pdfWindow) pdfWindow.close();
      toast.error(err.message || 'Không in được nhãn hàng loạt');
    } finally {
      setPrinting(false);
    }
  };

  // Format COD display string
  const formatCod = (item) => {
    const val = item.cod ?? 0;
    if (!val) return '0đ';
    return `${val.toLocaleString('vi-VN')}đ`;
  };

  // Format date display (e.g., "10/11 11:07")
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${mins}`;
  };

  // Real backend metrics
  const totalCount = stats?.totalOrders ?? data.total ?? 0;
  const inTransitCount = stats?.inTransitCount ?? (stats?.byStatus?.find((s) => s.status.toLowerCase().includes('vc'))?.count || 0);
  const deliveredCount = stats?.deliveredCount ?? (stats?.byStatus?.find((s) => s.status.toLowerCase().includes('giao'))?.count || 0);
  const pendingCount = stats?.pendingCount ?? (stats?.byStatus?.find((s) => s.status.toLowerCase().includes('chờ'))?.count || 0);
  const growthText = stats?.todayGrowth || '';

  // Real 7-day chart metrics from BE
  // chart7Days items: { label: 'T2', count: 5 (actual orders), val: 80 (% height) }
  const chartDays = stats?.chart7Days || [
    { label: 'CN', count: 0, val: 0 },
    { label: 'T2', count: 0, val: 0 },
    { label: 'T3', count: 0, val: 0 },
    { label: 'T4', count: 0, val: 0 },
    { label: 'T5', count: 0, val: 0 },
    { label: 'T6', count: 0, val: 0 },
    { label: 'T7', count: 0, val: 0 },
  ];

  const allZero = chartDays.every((d) => !d.count);

  return (
    <div>
      {/* Top 4 Stat Cards */}
      <div className="vtp-stats-row">
        <div className="vtp-stat-card">
          <div className="vtp-stat-label">TỔNG ĐƠN</div>
          <div className="vtp-stat-value">{totalCount.toLocaleString()}</div>
          {growthText && <div className="vtp-stat-subtext">{growthText}</div>}
        </div>

        <div className="vtp-stat-card">
          <div className="vtp-stat-label">ĐANG VẬN CHUYỂN</div>
          <div className="vtp-stat-value">{inTransitCount.toLocaleString()}</div>
        </div>

        <div className="vtp-stat-card">
          <div className="vtp-stat-label">ĐÃ GIAO</div>
          <div className="vtp-stat-value">{deliveredCount.toLocaleString()}</div>
        </div>

        <div className="vtp-stat-card">
          <div className="vtp-stat-label">CHỜ XỬ LÝ</div>
          <div className="vtp-stat-value">{pendingCount.toLocaleString()}</div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="vtp-layout-grid">
        {/* Left Column: Filter + Orders Table Card */}
        <div className="vtp-card">
          <form className="vtp-filter-bar" onSubmit={handleSearchSubmit}>
            <div className="vtp-search-box">
              <svg className="vtp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="vtp-search-input"
                placeholder="Tìm mã đơn, SĐT, người nhận..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="vtp-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Đang VC">Đang VC</option>
              <option value="Đã giao">Đã giao</option>
              <option value="Đang phát">Đang phát</option>
              <option value="Chờ XL">Chờ XL</option>
              <option value="Hoàn">Hoàn</option>
            </select>

            <button type="submit" className="vtp-btn-primary">
              Tìm
            </button>

            <button type="button" className="vtp-btn-outline" onClick={handleExportCSV}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>

            {selected.size > 0 && (
              <button type="button" className="vtp-btn-outline" onClick={handlePrintSelected} disabled={printing}>
                {printing && <span className="vtp-spinner" />}
                In nhãn ({selected.size})
              </button>
            )}
          </form>

          {error && <div className="vtp-alert-error">{error}</div>}

          {/* Table */}
          <div className="vtp-table-wrapper">
            <table className="vtp-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGƯỜI NHẬN</th>
                  <th>DỊCH VỤ</th>
                  <th>COD</th>
                  <th>CẬP NHẬT</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="vtp-table-empty">
                      <span className="vtp-spinner" /> Đang tải dữ liệu đơn hàng...
                    </td>
                  </tr>
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="vtp-table-empty">
                      Không có đơn hàng nào
                    </td>
                  </tr>
                ) : (
                  data.items.map((order) => {
                    const badge = getStatusBadgeInfo(order.currentStatus);
                    return (
                      <tr key={order.internalCode}>
                        <td className="vtp-order-code">
                          <Link to={`/orders/${order.internalCode}`}>{order.internalCode}</Link>
                        </td>
                        <td>
                          <span className={`vtp-badge ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td>{order.receiverName || '-'}</td>
                        <td>{order.serviceName || order.productInfo || '-'}</td>
                        <td>{formatCod(order)}</td>
                        <td>{formatDate(order.currentStatusDate)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={data.page || page}
            limit={data.limit || limit}
            total={data.total || 0}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>

        {/* Right Column: 7-Day Chart Card */}
        <div className="vtp-card">
          <div className="vtp-chart-header">
            <span>📊</span>
            <span>Đơn 7 ngày</span>
          </div>

          {allZero && (
            <p className="vtp-chart-empty-note">
              Chưa có đơn hàng trong 7 ngày qua
            </p>
          )}
          <div className="vtp-chart-container">
            {chartDays.map((item) => (
              <div key={item.label} className="vtp-bar-group">
                <div
                  className="vtp-bar"
                  style={{ height: `${allZero ? 15 : Math.min(100, Math.max(6, item.val))}%`, opacity: allZero ? 0.2 : 1 }}
                  title={`${item.label}: ${item.count ?? item.val} đơn`}
                />
                <span className="vtp-bar-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer descriptor tag */}
      <div className="vtp-page-descriptor">
        <span>📊</span> Dashboard - thống kê + danh sách đơn + biểu đồ
      </div>
    </div>
  );
}
