import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchBatchLabelPdf, listOrders } from '../api/orders';
import { listPartners } from '../api/partners';
import { Pagination } from '../components/Pagination';

const EMPTY_FILTERS = { internalCode: '', vtpCode: '', receiverPhone: '', currentStatus: '', partnerId: '' };

function openPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function OrdersListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partners, setPartners] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    listPartners()
      .then((res) => setPartners(res.items))
      .catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listOrders({ ...appliedFilters, page, limit });
      setData(res);
      setSelected(new Set());
    } catch (err) {
      setError(err.message || 'Không tải được danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  function handleFilterSubmit(e) {
    e.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function toggleSelected(internalCode) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(internalCode)) {
        next.delete(internalCode);
      } else {
        next.add(internalCode);
      }
      return next;
    });
  }

  const allOnPageSelected = useMemo(
    () => data.items.length > 0 && data.items.every((o) => selected.has(o.internalCode)),
    [data.items, selected]
  );

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        data.items.forEach((o) => next.delete(o.internalCode));
      } else {
        data.items.forEach((o) => next.add(o.internalCode));
      }
      return next;
    });
  }

  async function handlePrintSelected() {
    if (selected.size === 0) return;
    setPrinting(true);
    setError('');
    try {
      const blob = await fetchBatchLabelPdf({ internalCodes: [...selected] });
      openPdfBlob(blob);
    } catch (err) {
      setError(err.message || 'Không in được nhãn hàng loạt');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div>
      <h1>Đơn hàng</h1>

      <form className="filter-bar" onSubmit={handleFilterSubmit}>
        <input
          placeholder="Mã đơn (internalCode)"
          value={filters.internalCode}
          onChange={(e) => setFilters((f) => ({ ...f, internalCode: e.target.value }))}
        />
        <input
          placeholder="Mã VTP"
          value={filters.vtpCode}
          onChange={(e) => setFilters((f) => ({ ...f, vtpCode: e.target.value }))}
        />
        <input
          placeholder="SĐT người nhận"
          value={filters.receiverPhone}
          onChange={(e) => setFilters((f) => ({ ...f, receiverPhone: e.target.value }))}
        />
        <input
          placeholder="Trạng thái"
          value={filters.currentStatus}
          onChange={(e) => setFilters((f) => ({ ...f, currentStatus: e.target.value }))}
        />
        {isAdmin && (
          <select value={filters.partnerId} onChange={(e) => setFilters((f) => ({ ...f, partnerId: e.target.value }))}>
            <option value="">-- Tất cả đối tác --</option>
            {partners.map((p) => (
              <option key={p.publicId} value={p.publicId}>
                {p.companyName}
              </option>
            ))}
          </select>
        )}
        <button type="submit">Tìm</button>
        <button type="button" onClick={handleReset}>
          Xóa lọc
        </button>
      </form>

      <div className="list-toolbar">
        <button type="button" disabled={selected.size === 0 || printing} onClick={handlePrintSelected}>
          {printing ? 'Đang tạo PDF...' : `In nhãn đã chọn (${selected.size})`}
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} />
                </th>
                <th>Mã đơn</th>
                <th>Mã VTP</th>
                {isAdmin && <th>Đối tác</th>}
                <th>Người nhận</th>
                <th>SĐT</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="empty-cell">
                    Không có đơn hàng nào
                  </td>
                </tr>
              )}
              {data.items.map((order) => (
                <tr key={order.internalCode}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(order.internalCode)}
                      onChange={() => toggleSelected(order.internalCode)}
                    />
                  </td>
                  <td>
                    <Link to={`/orders/${order.internalCode}`}>{order.internalCode}</Link>
                  </td>
                  <td>{order.vtpCode}</td>
                  {isAdmin && <td>{order.partner?.companyName || '-'}</td>}
                  <td>{order.receiverName}</td>
                  <td>{order.receiverPhone || '-'}</td>
                  <td>
                    <span className="status-badge">{order.currentStatus}</span>
                  </td>
                  <td>{new Date(order.currentStatusDate).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page || page} limit={data.limit || limit} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
