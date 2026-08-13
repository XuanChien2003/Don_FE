import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchLabelPdf, getOrderDetail } from '../api/orders';

function openPdfBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function OrderDetailPage() {
  const { internalCode } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelFormat, setLabelFormat] = useState('code128');

  useEffect(() => {
    setLoading(true);
    setError('');
    getOrderDetail(internalCode)
      .then(setOrder)
      .catch((err) => setError(err.message || 'Không tìm thấy đơn hàng'))
      .finally(() => setLoading(false));
  }, [internalCode]);

  async function handlePrintLabel() {
    setLabelLoading(true);
    setError('');
    try {
      const blob = await fetchLabelPdf(internalCode, labelFormat);
      openPdfBlob(blob);
    } catch (err) {
      setError(err.message || 'Không tạo được nhãn');
    } finally {
      setLabelLoading(false);
    }
  }

  if (loading) return <p>Đang tải...</p>;
  if (error && !order) return <div className="form-error">{error}</div>;
  if (!order) return null;

  return (
    <div>
      <p>
        <Link to="/orders">&larr; Quay lại danh sách</Link>
      </p>
      <h1>Đơn hàng {order.internalCode}</h1>

      <div className="detail-grid">
        <div>
          <strong>Mã VTP:</strong> {order.vtpCode}
        </div>
        <div>
          <strong>Đối tác:</strong> {order.partner?.companyName || '-'}
        </div>
        <div>
          <strong>Người nhận:</strong> {order.receiverName}
        </div>
        <div>
          <strong>SĐT:</strong> {order.receiverPhone || '-'}
        </div>
        <div>
          <strong>Địa chỉ:</strong> {order.receiverAddress || '-'}
        </div>
        <div>
          <strong>Hàng hóa:</strong> {order.productInfo || '-'}
        </div>
        <div>
          <strong>Khối lượng:</strong> {order.weightKg != null ? `${order.weightKg} kg` : '-'}
        </div>
        <div>
          <strong>Trạng thái:</strong> <span className="status-badge">{order.currentStatus}</span>
        </div>
        <div>
          <strong>Cập nhật lúc:</strong> {new Date(order.currentStatusDate).toLocaleString('vi-VN')}
        </div>
      </div>

      <div className="label-actions">
        <select value={labelFormat} onChange={(e) => setLabelFormat(e.target.value)}>
          <option value="code128">Code128</option>
          <option value="qr">QR</option>
        </select>
        <button type="button" onClick={handlePrintLabel} disabled={labelLoading}>
          {labelLoading ? 'Đang tạo nhãn...' : 'In nhãn PDF'}
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}

      <h2>Lịch sử sự kiện</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Nguồn</th>
            <th>Loại sự kiện</th>
            <th>Vị trí</th>
            <th>Người thực hiện</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {order.events.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-cell">
                Chưa có sự kiện nào
              </td>
            </tr>
          )}
          {order.events.map((ev, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={idx}>
              <td>{new Date(ev.eventTime).toLocaleString('vi-VN')}</td>
              <td>{ev.source}</td>
              <td>{ev.eventType}</td>
              <td>{ev.location || '-'}</td>
              <td>{ev.actor?.displayName || ev.actor?.publicId || '-'}</td>
              <td>{ev.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
