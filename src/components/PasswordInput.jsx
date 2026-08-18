import { useId, useState } from 'react';

export function PasswordInput({ className = '', id, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="vtp-password-input">
      <input {...props} id={inputId} type={visible ? 'text' : 'password'} className={`vtp-form-input vtp-password-input-field ${className}`.trim()} />
      <button type="button" className="vtp-password-toggle" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible} title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9.3 5.2 9.8 6-.4.7-1.5 2.2-3.1 3.5" /><path d="M6.6 6.6C4.5 8 3 10.2 2.2 11.9c.9 1.8 4.4 8.1 9.8 8.1 1.7 0 3.1-.5 4.3-1.2" /></svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.2 12S5.8 4 12 4s9.8 8 9.8 8-3.6 8-9.8 8-9.8-8-9.8-8Z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}
