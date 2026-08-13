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
    <div>
      <h1>Import đơn hàng từ Excel</h1>
      <p>
        Tối đa 500 dòng/lần. Cột bắt buộc: <code>vtpCode</code>, <code>receiverName</code>. Cột tùy chọn:{' '}
        <code>receiverPhone</code>, <code>receiverAddress</code>, <code>productInfo</code>, <code>weightKg</code>.
      </p>

      <form className="import-form" onSubmit={handleSubmit}>
        {isAdmin && (
          <label>
            Đối tác sở hữu đơn hàng
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              <option value="">-- Chọn đối tác --</option>
              {partners.map((p) => (
                <option key={p.publicId} value={p.publicId}>
                  {p.companyName}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          File Excel
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Đang import...' : 'Import'}
        </button>
      </form>

      {result && (
        <div className="import-result">
          <p>
            Tổng {result.totalRows} dòng - <strong>{result.successCount} thành công</strong>, {result.failureCount} lỗi.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Dòng</th>
                <th>Kết quả</th>
                <th>Mã đơn / Lỗi</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.row} className={r.success ? 'row-success' : 'row-error'}>
                  <td>{r.row}</td>
                  <td>{r.success ? 'Thành công' : 'Lỗi'}</td>
                  <td>{r.success ? r.internalCode : r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
