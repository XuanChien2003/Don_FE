import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { changePassword } from '../api/auth';
import { useToast } from '../components/Toast';
import { PasswordInput } from '../components/PasswordInput';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };
const PASSWORD_COMPLEXITY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const ROLE_LABEL = { admin: 'Quản trị viên', partner: 'Đối tác', scanner: 'Nhân viên quét mã' };

export function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.newPassword.length < 8 || !PASSWORD_COMPLEXITY_RE.test(form.newPassword)) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Đã đổi mật khẩu thành công');
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="vtp-page-header">
        <h2 className="vtp-page-title">Trang cá nhân</h2>
        <p className="vtp-page-subtitle">Thông tin tài khoản và đổi mật khẩu đăng nhập.</p>
      </div>

      <div className="vtp-card" style={{ marginBottom: '16px' }}>
        <div className="vtp-detail-section-title">THÔNG TIN TÀI KHOẢN</div>
        <div className="vtp-info-rows">
          <div className="vtp-info-row">
            <div className="vtp-info-item">
              <span className="vtp-info-label">Tên đăng nhập</span>
              <span className="vtp-info-value">{user?.username || '-'}</span>
            </div>
            <div className="vtp-info-item">
              <span className="vtp-info-label">Vai trò</span>
              <span className="vtp-info-value">{ROLE_LABEL[user?.role] || user?.role || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="vtp-card">
        <div className="vtp-detail-section-title">ĐỔI MẬT KHẨU</div>
        <form onSubmit={handleSubmit} className="vtp-form-stack">
          <div className="vtp-input-group">
            <label className="vtp-input-label">Mật khẩu hiện tại</label>
            <PasswordInput
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="vtp-form-row-2">
            <div className="vtp-input-group">
              <label className="vtp-input-label">Mật khẩu mới</label>
              <PasswordInput
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                minLength={8}
                required
              />
            </div>
            <div className="vtp-input-group">
              <label className="vtp-input-label">Xác nhận mật khẩu mới</label>
              <PasswordInput
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>
          <p className="vtp-input-hint">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.</p>
          <div>
            <button type="submit" className="vtp-btn-primary" disabled={submitting}>
              {submitting && <span className="vtp-spinner vtp-spinner-light" />}
              {submitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
