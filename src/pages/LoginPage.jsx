import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to="/orders" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const loggedInUser = await login(username, password);
      toast.success(`Xin chào, ${loggedInUser?.displayName || loggedInUser?.username || ''}`);
      const redirectTo = location.state?.from?.pathname || '/orders';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vtp-login-page">
      {/* Left Column: Blue Gradient Banner */}
      <div className="vtp-login-banner">
        <div className="vtp-login-banner-content">
          <h1 className="vtp-login-brand-title">VTP Partner</h1>
          <p className="vtp-login-brand-subtitle">Quản lý đơn hàng vận chuyển</p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="vtp-login-form-wrapper">
        <div className="vtp-login-form-container">
          <h2 className="vtp-login-form-title">Đăng nhập</h2>
          <p className="vtp-login-form-subtitle">Nhập thông tin tài khoản của bạn</p>

          <form onSubmit={handleSubmit} className="vtp-login-form">
            <div className="vtp-input-group">
              <label className="vtp-input-label">Tên đăng nhập</label>
              <input
                type="text"
                className="vtp-form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="vtp-input-group">
              <label className="vtp-input-label">Mật khẩu</label>
              <input
                type="password"
                className="vtp-form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="vtp-login-submit-btn" disabled={submitting}>
              {submitting && <span className="vtp-spinner vtp-spinner-light" />}
              {submitting ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
