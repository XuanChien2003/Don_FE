import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { createPartner, listAllPartners, resetPartnerCredentials, updatePartner } from '../api/partners';
import { useToast } from '../components/Toast';

const EMPTY_FORM = { companyName: '', contactEmail: '', contactPhone: '' };

export function PartnersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAllPartners();
      setPartners(res.items || []);
    } catch (err) {
      toast.error(err.message || 'Không tải được danh sách đối tác');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (user && user.role !== 'admin') {
    return <Navigate to="/orders" replace />;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createPartner(form);
      if (res.emailSent) {
        toast.success(`Đã tạo đối tác "${form.companyName}" và gửi mật khẩu đến ${form.contactEmail}`);
      } else {
        // Creation itself succeeded (partner+user rows exist) - only the email step failed, so
        // this must not read as a failure toast or admins will retry with the same contactEmail
        // and hit a 409 on a partner that already exists.
        toast.info(`Đã tạo đối tác "${form.companyName}" (chưa gửi được email mật khẩu - hãy cấp mật khẩu thủ công, KHÔNG tạo lại)`);
      }
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.message || 'Tạo đối tác thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.publicId);
    setEditForm({ companyName: p.companyName, contactEmail: p.contactEmail, contactPhone: p.contactPhone });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(publicId) {
    setSavingId(publicId);
    try {
      await updatePartner(publicId, editForm);
      toast.success('Đã cập nhật thông tin đối tác');
      setEditingId(null);
      setEditForm(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setSavingId(null);
    }
  }

  async function resendCredentials(p) {
    setSavingId(p.publicId);
    try {
      const res = await resetPartnerCredentials(p.publicId);
      if (res.emailSent) {
        toast.success(`Đã gửi mật khẩu mới đến ${p.contactEmail}`);
      } else {
        toast.error(`Sinh mật khẩu mới thành công nhưng gửi email thất bại (${res.emailError || 'lỗi không rõ'})`);
      }
    } catch (err) {
      toast.error(err.message || 'Không gửi lại được mật khẩu');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleStatus(p) {
    const nextStatus = p.status === 'active' ? 'disabled' : 'active';
    setSavingId(p.publicId);
    try {
      await updatePartner(p.publicId, { status: nextStatus });
      toast.success(nextStatus === 'active' ? `Đã kích hoạt "${p.companyName}"` : `Đã vô hiệu hóa "${p.companyName}"`);
      load();
    } catch (err) {
      toast.error(err.message || 'Không đổi được trạng thái');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="vtp-page-header">
        <h2 className="vtp-page-title">Quản lý đối tác</h2>
        <p className="vtp-page-subtitle">Tạo tài khoản cho đối tác mới và quản lý thông tin, trạng thái các đối tác hiện có.</p>
      </div>

      <div className="vtp-card">
        <div className="vtp-detail-section-title">THÊM ĐỐI TÁC MỚI</div>
        <form onSubmit={handleCreate} className="vtp-form-stack">
          <div className="vtp-form-row-2">
            <div className="vtp-input-group">
              <label className="vtp-input-label">Tên công ty</label>
              <input
                className="vtp-form-input"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                required
              />
            </div>
            <div className="vtp-input-group">
              <label className="vtp-input-label">Email liên hệ</label>
              <input
                type="email"
                className="vtp-form-input"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="vtp-form-row-2">
            <div className="vtp-input-group">
              <label className="vtp-input-label">SĐT liên hệ</label>
              <input
                className="vtp-form-input"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                required
              />
            </div>
          </div>
          <p className="vtp-input-hint">Mật khẩu đăng nhập sẽ được tạo tự động và gửi qua email liên hệ ở trên.</p>
          <div>
            <button type="submit" className="vtp-btn-primary" disabled={submitting}>
              {submitting && <span className="vtp-spinner vtp-spinner-light" />}
              {submitting ? 'Đang tạo...' : 'Tạo đối tác'}
            </button>
          </div>
        </form>
      </div>

      <div className="vtp-card vtp-mt-lg">
        <div className="vtp-detail-section-title">DANH SÁCH ĐỐI TÁC ({partners.length})</div>
        <div className="vtp-table-wrapper">
          <table className="vtp-table">
            <thead>
              <tr>
                <th>Tên công ty</th>
                <th>Email</th>
                <th>SĐT</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="vtp-table-empty">
                    <span className="vtp-spinner" /> Đang tải danh sách đối tác...
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="vtp-table-empty">
                    Chưa có đối tác nào
                  </td>
                </tr>
              ) : (
                partners.map((p) => {
                  const isEditing = editingId === p.publicId;
                  const isSaving = savingId === p.publicId;
                  return (
                    <tr key={p.publicId}>
                      <td>
                        {isEditing ? (
                          <input
                            className="vtp-table-input"
                            value={editForm.companyName}
                            onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                          />
                        ) : (
                          p.companyName
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="email"
                            className="vtp-table-input"
                            value={editForm.contactEmail}
                            onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                          />
                        ) : (
                          p.contactEmail
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="vtp-table-input"
                            value={editForm.contactPhone}
                            onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                          />
                        ) : (
                          p.contactPhone
                        )}
                      </td>
                      <td>
                        <span className={`vtp-badge ${p.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                          {p.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="vtp-row-actions">
                            <button type="button" className="vtp-btn-primary" onClick={() => saveEdit(p.publicId)} disabled={isSaving}>
                              {isSaving && <span className="vtp-spinner vtp-spinner-light" />}
                              Lưu
                            </button>
                            <button type="button" className="vtp-btn-outline" onClick={cancelEdit} disabled={isSaving}>
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="vtp-row-actions">
                            <button type="button" className="vtp-btn-outline" onClick={() => startEdit(p)}>
                              Sửa
                            </button>
                            <button type="button" className="vtp-btn-outline" onClick={() => toggleStatus(p)} disabled={isSaving}>
                              {isSaving && <span className="vtp-spinner" />}
                              {p.status === 'active' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            </button>
                            <button type="button" className="vtp-btn-outline" onClick={() => resendCredentials(p)} disabled={isSaving}>
                              {isSaving && <span className="vtp-spinner" />}
                              Gửi lại mật khẩu
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
