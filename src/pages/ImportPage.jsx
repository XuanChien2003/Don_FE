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
    <div className="vtp-page-container">
      <div className="vtp-page-header">
        <h2 className="vtp-page-title">Import đơn hàng từ Excel</h2>
        <p className="vtp-page-subtitle">
          Tối đa 500 dòng/lần. Cột bắt buộc: <code>vtpCode</code>, <code>receiverName</code>. Cột tùy chọn:{' '}
          <code>receiverPhone</code>, <code>receiverAddress</code>, <code>productInfo</code>, <code>weightKg</code>.
        </p>
      </div>

      <div className="vtp-card">
        <form onSubmit={handleSubmit} className="vtp-form-stack">
          {isAdmin && (
            <div className="vtp-input-group">
              <label className="vtp-input-label">Đối tác sở hữu đơn hàng</label>
              <select className="vtp-select vtp-field-full" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                <option value="">-- Chọn đối tác --</option>
                {partners.map((p) => (
                  <option key={p.publicId} value={p.publicId}>
                    {p.companyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="vtp-input-group">
            <label className="vtp-input-label">File Excel (.xlsx / .xls)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="vtp-file-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && <div className="vtp-alert-error">{error}</div>}

          <div>
            <button type="submit" className="vtp-btn-primary" disabled={submitting}>
              {submitting && <span className="vtp-spinner vtp-spinner-light" />}
              {submitting ? 'Đang import...' : 'Import đơn hàng'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="vtp-card vtp-mt-lg">
          <p className="vtp-result-summary">
            Tổng {result.totalRows} dòng - <strong className="vtp-text-success">{result.successCount} thành công</strong>,{' '}
            <span className="vtp-text-danger">{result.failureCount} lỗi</span>.
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
