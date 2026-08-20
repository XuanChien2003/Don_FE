import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchBatchLabelPdf, listOrders } from '../api/orders';
import { getDashboardStats } from '../api/dashboard';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';

const SCAN_EVENT_LABELS = {
  nhap_kho: 'Nhập kho',
  xuat_kho: 'Xuất kho',
  ban_giao: 'Bàn giao',
};
export function scanEventLabel(type) {
  return SCAN_EVENT_LABELS[type] || type || '-';
}

export function getStatusBadgeInfo(status) {
  if (!status) return { label: 'Chờ XL', className: 'badge-secondary' };
  // currentStatus is either VTP's free-text webhook status or, for orders whose latest event is
  // a scan, the raw scan eventType itself (see deriveStatusFromEvent in orderStatus.service.js) -
  // map those known exact values to a proper label before falling through to keyword matching.
  if (status === 'imported') return { label: 'Mới nhập', className: 'badge-secondary' };
  if (SCAN_EVENT_LABELS[status]) {
    return { label: SCAN_EVENT_LABELS[status], className: 'badge-info' };
  }
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
    // Navigating a tab's top-level location straight to a blob: PDF makes Chrome silently
    // download it instead of rendering it - the tab is left blank with no visible sign anything
    // happened. An <iframe> pointing at the same blob URL renders inline reliably instead.
    targetWindow.document.title = 'Nhãn PDF';
    targetWindow.document.body.style.margin = '0';
    const iframe = targetWindow.document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'border:0;width:100vw;height:100vh;display:block';
    targetWindow.document.body.appendChild(iframe);
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
          keyword: searchQuery,
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

  // Export orders to a real .xlsx file (not CSV) - avoids the classic "mở CSV bằng Excel thì vỡ
  // dấu tiếng Việt" encoding problem entirely, since xlsx stores text as UTF-8 natively.
  const handleExportExcel = async () => {
    const itemsToExport = data.items || [];
    if (itemsToExport.length === 0) {
      toast.info('Không có đơn nào để xuất');
      return;
    }
    const XLSX = await import('xlsx');
    const headers = ['MÃ VTP', 'TRẠNG THÁI', 'NGƯỜI NHẬN', 'DỊCH VỤ', 'COD', 'CẬP NHẬT'];
    const rows = itemsToExport.map((o) => [
      o.vtpCode,
      getStatusBadgeInfo(o.currentStatus).label,
      o.receiverName || '',
      o.serviceName || o.productInfo || 'VHT',
      o.cod != null ? o.cod : 0,
      new Date(o.currentStatusDate || Date.now()).toLocaleString('vi-VN'),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 16 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '\u0110\u01A1n h\u00E0ng');
    XLSX.writeFile(workbook, `NewHorizon_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`\u0110\u00E3 xu\u1EA5t ${itemsToExport.length} \u0111\u01A1n ra Excel`);
  };

  const handlePrintSelected = async () => {
    if (selected.size === 0) return;
    // Opened synchronously (still inside the click's user-activation window) so the browser
    // doesn't silently popup-block the tab once the network request resolves later.
    // The tab must be opened synchronously from this click. `noopener` would
    // make window.open return null in Chrome and the PDF popup gets blocked
    // after the asynchronous download finishes.
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) pdfWindow.opener = null;
    setPrinting(true);
    try {
      const blob = await fetchBatchLabelPdf({ vtpCodes: [...selected] });
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
      <div className="vtp-page-header">
        <h1 className="vtp-dashboard-title">Dashboard</h1>
        <p className="vtp-page-subtitle">Thống kê tổng quan, danh sách đơn hàng và biểu đồ hoạt động 7 ngày gần nhất.</p>
      </div>

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
                placeholder="Tìm mã VTP, SĐT, người nhận..."
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

            <button type="button" className="vtp-btn-outline" onClick={handleExportExcel}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
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
                  <th style={{ width: '36px' }}>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả đơn trên trang này"
                      checked={data.items.length > 0 && data.items.every((o) => selected.has(o.vtpCode))}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            data.items.forEach((o) => next.add(o.vtpCode));
                          } else {
                            data.items.forEach((o) => next.delete(o.vtpCode));
                          }
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th>MÃ VTP</th>
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
                    <td colSpan={7} className="vtp-table-empty">
                      <span className="vtp-spinner" /> Đang tải dữ liệu đơn hàng...
                    </td>
                  </tr>
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="vtp-table-empty">
                      Không có đơn hàng nào
                    </td>
                  </tr>
                ) : (
                  data.items.map((order) => {
                    const badge = getStatusBadgeInfo(order.currentStatus);
                    return (
                      <tr key={order.vtpCode}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Chọn đơn ${order.vtpCode}`}
                            checked={selected.has(order.vtpCode)}
                            onChange={(e) => {
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) {
                                  next.add(order.vtpCode);
                                } else {
                                  next.delete(order.vtpCode);
                                }
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="vtp-order-code">
                          <Link to={`/orders/${order.vtpCode}`}>{order.vtpCode}</Link>
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

      {/* Admin-only: scan activity by event type + by order, with the employee who scanned it
          most recently (scanners aren't tied to a partner, so this stays out of the partner
          view). Shows the SCAN_STATS_ORDER_LIMIT most recently-scanned orders - click through to
          an order's own detail page for its full timeline. */}
      {user?.role === 'admin' && stats?.scanStats && (
        <div className="vtp-card" style={{ marginTop: '16px' }}>
          <div className="vtp-detail-section-title">LƯỢT QUÉT KHO</div>

          <div className="vtp-stats-row">
            {['nhap_kho', 'xuat_kho', 'ban_giao'].map((type) => {
              const found = stats.scanStats.byEventType.find((s) => s.eventType === type);
              return (
                <div className="vtp-stat-card" key={type}>
                  <div className="vtp-stat-label">{scanEventLabel(type).toUpperCase()}</div>
                  <div className="vtp-stat-value">{(found?.count || 0).toLocaleString()}</div>
                </div>
              );
            })}
          </div>

          <div className="vtp-table-wrapper" style={{ marginTop: '16px' }}>
            <table className="vtp-table">
              <thead>
                <tr>
                  <th>MÃ VTP</th>
                  <th>NGƯỜI NHẬN</th>
                  <th>NHẬP KHO</th>
                  <th>XUẤT KHO</th>
                  <th>BÀN GIAO</th>
                  <th>TỔNG</th>
                  <th>NHÂN VIÊN GẦN NHẤT</th>
                  <th>QUÉT GẦN NHẤT</th>
                </tr>
              </thead>
              <tbody>
                {stats.scanStats.byOrder.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="vtp-table-empty">
                      Chưa có lượt quét nào
                    </td>
                  </tr>
                ) : (
                  stats.scanStats.byOrder.map((o) => (
                    <tr key={o.vtpCode}>
                      <td className="vtp-order-code">
                        <Link to={`/orders/${o.vtpCode}`}>{o.vtpCode}</Link>
                      </td>
                      <td>{o.receiverName || '-'}</td>
                      <td>{o.byEventType.nhap_kho || 0}</td>
                      <td>{o.byEventType.xuat_kho || 0}</td>
                      <td>{o.byEventType.ban_giao || 0}</td>
                      <td><strong>{o.total}</strong></td>
                      <td>{o.lastActorDisplayName || '-'}</td>
                      <td>{formatDate(o.lastScanAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
