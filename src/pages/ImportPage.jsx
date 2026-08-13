import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { importOrders } from '../api/orders';
import { listPartners } from '../api/partners';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ImportPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [file, setFile] = useState(null);
  const [partnerId, setPartnerId] = useState('');
  const [partners, setPartners] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    listPartners()
      .then((res) => setPartners(res.items))
      .catch(() => {});
  }, [isAdmin]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Vui lòng chọn file Excel (.xlsx/.xls)');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File vượt quá 5MB');
      return;
    }
    if (isAdmin && !partnerId) {
      setError('Vui lòng chọn đối tác sở hữu các đơn này');
      return;
    }

    setSubmitting(true);
    try {
      const res = await importOrders({ file, partnerId: isAdmin ? partnerId : undefined });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Import thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>Import đơn hàng từ Excel</h2>
      <p style={{ color: '#6b7280', fontSize: '13.5px', marginBottom: '20px' }}>
        Tối đa 500 dòng/lần. Cột bắt buộc: <code>vtpCode</code>, <code>receiverName</code>. Cột tùy chọn:{' '}
        <code>receiverPhone</code>, <code>receiverAddress</code>, <code>productInfo</code>, <code>weightKg</code>.
      </p>

      <div className="vtp-card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isAdmin && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Đối tác sở hữu đơn hàng
              </label>
              <select className="vtp-select" style={{ width: '100%' }} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">-- Chọn đối tác --</option>
                {partners.map((p) => (
                  <option key={p.publicId} value={p.publicId}>
                    {p.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              File Excel (.xlsx / .xls)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="vtp-search-input"
              style={{ paddingLeft: '12px', paddingTop: '6px' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && <div className="vtp-alert-error">{error}</div>}

          <div>
            <button type="submit" className="vtp-btn-primary" disabled={submitting}>
              {submitting ? 'Đang import...' : 'Import đơn hàng'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="vtp-card" style={{ marginTop: '20px' }}>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
            Tổng {result.totalRows} dòng - <strong style={{ color: '#16a34a' }}>{result.successCount} thành công</strong>,{' '}
            <span style={{ color: '#dc2626' }}>{result.failureCount} lỗi</span>.
          </p>

          <div className="vtp-table-wrapper">
            <table className="vtp-table">
              <thead>
                <tr>
                  <th>Dòng</th>
                  <th>Kết quả</th>
                  <th>Mã đơn / Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>
                      <span className={`vtp-badge ${r.success ? 'badge-success' : 'badge-danger'}`}>
                        {r.success ? 'Thành công' : 'Lỗi'}
                      </span>
                    </td>
                    <td>{r.success ? r.internalCode : r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
