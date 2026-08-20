import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchLabelBarcode, fetchLabelPdf, getOrderDetail } from '../api/orders';
import { getStatusBadgeInfo, scanEventLabel } from './OrdersListPage';
import { useToast } from '../components/Toast';

export function OrderDetailPage() {
  const { vtpCode: routeVtpCode } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [labelLoading, setLabelLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [barcodeUrl, setBarcodeUrl] = useState(null);
  const pdfUrlRef = useRef(null);
  const barcodeUrlRef = useRef(null);

  function closePdfPreview() {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    if (barcodeUrlRef.current) URL.revokeObjectURL(barcodeUrlRef.current);
    pdfUrlRef.current = null;
    barcodeUrlRef.current = null;
    setPdfUrl(null);
    setBarcodeUrl(null);
  }

  useEffect(() => () => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    if (barcodeUrlRef.current) URL.revokeObjectURL(barcodeUrlRef.current);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getOrderDetail(routeVtpCode)
      .then((res) => {
        setOrder(res);
      })
      .catch((err) => {
        setError(err.message || 'Không tìm thấy đơn hàng');
      })
      .finally(() => setLoading(false));
  }, [routeVtpCode]);

  async function handlePrintLabel() {
    setLabelLoading(true);
    try {
      const [pdfBlob, barcodeBlob] = await Promise.all([
        fetchLabelPdf(routeVtpCode, 'code128'),
        fetchLabelBarcode(routeVtpCode, 'code128'),
      ]);
      closePdfPreview();
      const nextPdfUrl = URL.createObjectURL(pdfBlob);
      const nextBarcodeUrl = URL.createObjectURL(barcodeBlob);
      pdfUrlRef.current = nextPdfUrl;
      barcodeUrlRef.current = nextBarcodeUrl;
      setPdfUrl(nextPdfUrl);
      setBarcodeUrl(nextBarcodeUrl);
    } catch (err) {
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

  const code = order.vtpCode || routeVtpCode;
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

  const eventsList = order.events || [];

  function downloadLabelPdf() {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${code}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <div>
      {/* Top back navigation link */}
      <Link to="/orders" className="vtp-back-link">
        &larr; Quay lại danh sách
      </Link>

      <div className="vtp-page-header">
        <h1 className="vtp-dashboard-title">Chi tiết đơn</h1>
      </div>

      {/* Main Grid: Vận đơn+Người nhận | Hàng hóa+Phí+NV | Hành trình đơn */}
      <div className="vtp-detail-grid vtp-detail-grid-3col">
        {/* Column 1: Vận đơn + Người nhận */}
        <div>
          <div className="vtp-card" style={{ marginBottom: '16px' }}>
            <div className="vtp-detail-section-title">THÔNG TIN VẬN ĐƠN</div>

            <div className="vtp-info-rows">
              <div className="vtp-info-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Mã VTP</span>
                  <span className="vtp-order-code-lg">{order.vtpCode || '-'}</span>
                </div>
              </div>
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Trạng thái</span>
                  <span className={`vtp-badge ${badgeInfo.className}`}>{badgeInfo.label}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Dịch vụ</span>
                  <span className="vtp-info-value">{serviceText}</span>
                </div>
              </div>
              <div className="vtp-info-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Ngày tạo</span>
                  <span className="vtp-info-value">{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vtp-card">
            <div className="vtp-detail-section-title">NGƯỜI NHẬN</div>

            <div className="vtp-info-rows">
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
              <div className="vtp-info-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Địa chỉ</span>
                  <span className="vtp-info-value">{order.receiverAddress || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <button type="button" className="vtp-btn-outline" onClick={handlePrintLabel} disabled={labelLoading}>
              {labelLoading && <span className="vtp-spinner" />}
              {labelLoading ? 'Đang tạo nhãn...' : 'In nhãn PDF'}
            </button>
          </div>
        </div>

        {/* Column 2: Hàng hóa + Phí & thanh toán + NV xử lý */}
        <div>
          <div className="vtp-card" style={{ marginBottom: '16px' }}>
            <div className="vtp-detail-section-title">THÔNG TIN HÀNG HÓA</div>

            <div className="vtp-info-rows">
              <div className="vtp-info-row">
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Hàng hóa</span>
                  <span className="vtp-info-value">{order.productInfo || '-'}</span>
                </div>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Trọng lượng</span>
                  <span className="vtp-info-value">{weightText}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vtp-card">
            <div className="vtp-detail-section-title">PHÍ & THANH TOÁN</div>

            <div className="vtp-info-rows">
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
              <div className="vtp-info-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="vtp-info-item">
                  <span className="vtp-info-label">Thanh toán</span>
                  <span className="vtp-info-value">{payText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: HÀNH TRÌNH ĐƠN */}
        <div className="vtp-card">
          <div className="vtp-detail-section-title">HÀNH TRÌNH ĐƠN</div>

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
                  <div className="vtp-timeline-title">
                    {item.source === 'scan_pda'
                      ? scanEventLabel(item.eventType)
                      : item.source === 'import'
                      ? 'Nhập đơn vào hệ thống'
                      : item.externalStatus || item.eventType || item.source || 'Sự kiện'}
                  </div>
                  {item.actor?.displayName && (
                    <div className="vtp-timeline-subtext">Nhân viên: {item.actor.displayName}</div>
                  )}
                  {item.location && <div className="vtp-timeline-subtext">Vị trí: {item.location}</div>}
                  {item.note && <div className="vtp-timeline-subtext">Ghi chú: {item.note}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {pdfUrl && barcodeUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shipping label"
          style={{ position: 'fixed', inset: 0, zIndex: 1001, overflowY: 'auto', padding: '24px 16px', background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div style={{ width: 'min(100%, 576px)', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
              <button type="button" className="vtp-btn-outline" onClick={downloadLabelPdf}>{'T\u1ea3i PDF'}</button>
              <button type="button" className="vtp-btn-outline" onClick={closePdfPreview}>{'\u0110\u00f3ng'}</button>
            </div>
            <section style={{ boxSizing: 'border-box', width: '100%', minHeight: '864px', padding: '42px 40px', background: '#fff', color: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
              <h1 style={{ margin: '0 0 26px', fontSize: '26px', fontWeight: 500, textAlign: 'center' }}>{'PHI\u1ebeU GIAO H\u00c0NG'}</h1>
              <div style={{ fontSize: '18px', lineHeight: 1.4 }}>
                <div>{'M\u00e3 VTP: '}{order.vtpCode || '-'}</div>
                <div>{'Ng\u01b0\u1eddi nh\u1eadn: '}{receiverName}</div>
                {order.receiverPhone && <div>{'S\u0110T: '}{order.receiverPhone}</div>}
                {order.receiverAddress && <div>{'\u0110\u1ecba ch\u1ec9: '}{order.receiverAddress}</div>}
                {order.productInfo && <div>{'H\u00e0ng h\u00f3a: '}{order.productInfo}</div>}
                {order.weightKg != null && <div>{'Kh\u1ed1i l\u01b0\u1ee3ng: '}{order.weightKg} kg</div>}
              </div>
              <div style={{ paddingTop: '360px' }}>
                <div style={{ border: '1px solid #cbd5e1', padding: '14px 0 18px' }}>
                  <div style={{ marginBottom: '12px', color: '#334155', fontSize: '14px', textAlign: 'center' }}>SCAN BARCODE</div>
                  <img src={barcodeUrl} alt={`Barcode ${order.vtpCode || code}`} style={{ display: 'block', width: '100%', height: 'auto' }} />
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {false && pdfUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước nhãn PDF"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, padding: '16px', background: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div style={{ height: '100%', maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
              <strong>Xem trước nhãn PDF</strong>
              <button type="button" className="vtp-btn-outline" onClick={closePdfPreview}>Đóng</button>
            </div>
            <iframe title="Nhãn PDF" src={pdfUrl} style={{ width: '100%', flex: 1, border: 0 }} />
          </div>
        </div>
      )}
    </div>
  );
}
