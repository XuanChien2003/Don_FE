import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchLabelPdf, getOrderDetail } from '../api/orders';
import { getStatusBadgeInfo } from './OrdersListPage';
import { useToast } from '../components/Toast';

function openPdfBlob(blob, targetWindow) {
  const url = URL.createObjectURL(blob);
  if (targetWindow) {
    targetWindow.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function OrderDetailPage() {
  const { internalCode } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [labelLoading, setLabelLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    getOrderDetail(internalCode)
      .then((res) => {
        setOrder(res);
      })
      .catch((err) => {
        setError(err.message || 'Không tìm thấy đơn hàng');
      })
      .finally(() => setLoading(false));
  }, [internalCode]);

  async function handlePrintLabel() {
    // Open the tab synchronously, still inside the click's user-activation window - opening it
    // only after `await fetchLabelPdf` resolves is what browsers silently popup-block (no error,
    // nothing visibly happens), especially once network/cold-start latency is involved.
    // Keep a window handle created during the click.  Passing `noopener` here
    // makes Chrome return null, which causes the later (async) PDF popup to be
    // blocked as an unsolicited popup.
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) pdfWindow.opener = null;
    setLabelLoading(true);
    try {
      const blob = await fetchLabelPdf(internalCode, 'code128');
      openPdfBlob(blob, pdfWindow);
    } catch (err) {
      if (pdfWindow) pdfWindow.close();
      toast.error(err.message || 'Không tạo được nhãn PDF');
    } finally {
      setLabelLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="vtp-page-loading">
        <span className="vtp-spinner vtp-spinner-lg" />
        <span>Đang tải chi tiết đơn hàng...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: '24px' }}>
        <Link to="/orders" className="vtp-back-link">
          &larr; Quay lại danh sách
        </Link>
        <div className="vtp-alert-error">{error || 'Không tìm thấy thông tin đơn hàng'}</div>
      </div>
    );
  }

  const code = order.internalCode || internalCode;
  const statusLabel = order.currentStatus || '-';
  const badgeInfo = getStatusBadgeInfo(statusLabel);

  const serviceText = order.serviceName || order.productInfo || '-';
  const weightText = order.weightKg != null ? `${(order.weightKg * (order.weightKg < 100 ? 1000 : 1)).toLocaleString('vi-VN')}g` : '-';
  const codText = order.cod != null ? `${order.cod.toLocaleString('vi-VN')}đ` : '-';
  const feeText = order.shippingFee != null ? `${order.shippingFee.toLocaleString('vi-VN')}đ` : '-';
  const vatText = order.vat != null ? `${order.vat.toLocaleString('vi-VN')}đ` : '-';
  const totalText = order.totalAmount != null ? `${order.totalAmount.toLocaleString('vi-VN')}đ` : '-';
  const payText = order.paymentType || '-';

  const receiverName = order.receiverName || '-';
  const receiverPhone = order.receiverPhone || '-';
  const actorName = order.actorName || '-';
  const actorPhone = order.actorPhone || '-';

  const eventsList = order.events || [];

  return (
    <div>
      {/* Top back navigation link */}
      <Link to="/orders" className="vtp-back-link">
        &larr; Quay lại danh sách
      </Link>

      {/* Main Grid: Left Details Cards + Right Timeline Card */}
      <div className="vtp-detail-grid">
        {/* Left Column */}
        <div>
          {/* Card 1: THÔNG TIN ĐƠN */}
          <div className="vtp-card" style={{ marginBottom: '16px' }}>
            <div className="vtp-detail-section-title">THÔNG TIN ĐƠN</div>

            <div className="vtp-info-rows">
              {/* Row 1 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Mã đơn</span>
                  <span className="vtp-info-value">{code}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Trạng thái</span>
                  <span className={`vtp-badge ${badgeInfo.className}`}>{statusLabel}</span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Dịch vụ</span>
                  <span className="vtp-info-value">{serviceText}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Trọng lượng</span>
                  <span className="vtp-info-value">{weightText}</span>
                </div>
              </div>

              {/* Row 3 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">COD</span>
                  <span className="vtp-info-value">{codText}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Tổng phí VC</span>
                  <span className="vtp-info-value">{feeText}</span>
                </div>
              </div>

              {/* Row 4 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">VAT</span>
                  <span className="vtp-info-value">{vatText}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Tổng tiền</span>
                  <span className="vtp-info-value">{totalText}</span>
                </div>
              </div>

              {/* Row 5 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Thanh toán</span>
                  <span className="vtp-info-value">{payText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: NGƯỜI NHẬN & NHÂN VIÊN */}
          <div className="vtp-card">
            <div className="vtp-detail-section-title">NGƯỜI NHẬN & NHÂN VIÊN</div>

            <div className="vtp-info-rows">
              {/* Row 1 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Người nhận</span>
                  <span className="vtp-info-value">{receiverName}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">SĐT</span>
                  <span className="vtp-info-value">{receiverPhone}</span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">NV xử lý</span>
                  <span className="vtp-info-value">{actorName}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">SĐT NV</span>
                  <span className="vtp-info-value">{actorPhone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div style={{ marginTop: '16px' }}>
            <button type="button" className="vtp-btn-outline" onClick={handlePrintLabel} disabled={labelLoading}>
              {labelLoading && <span className="vtp-spinner" />}
              {labelLoading ? 'Đang tạo nhãn...' : 'In nhãn PDF'}
            </button>
          </div>
        </div>

        {/* Right Column: TIMELINE */}
        <div className="vtp-card">
          <div className="vtp-detail-section-title">TIMELINE</div>

          <div className="vtp-timeline">
            {eventsList.length === 0 ? (
              <div className="vtp-timeline-empty">
                Chưa có lịch sử sự kiện nào.
              </div>
            ) : (
              eventsList.map((item, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={idx} className="vtp-timeline-item">
                  <div className={`vtp-timeline-node ${idx === 0 ? 'filled' : ''}`} />
                  <div className="vtp-timeline-time">{new Date(item.eventTime).toLocaleString('vi-VN')}</div>
                  <div className="vtp-timeline-title">{item.eventType || item.source || 'Sự kiện'}</div>
                  {item.location && <div className="vtp-timeline-subtext">{item.location}</div>}
                  {item.note && <div className="vtp-timeline-subtext">{item.note}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer descriptor tag */}
      <div className="vtp-page-descriptor">
        <span>📄</span> Chi tiết đơn + timeline lịch sử
      </div>
    </div>
  );
}
