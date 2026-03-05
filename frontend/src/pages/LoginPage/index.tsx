import { useState, type FormEvent } from 'react';
import { useAuth, type LoginResponse } from '../../hooks/useAuth';
import './style.less';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const lockedRemaining = (() => {
    if (!lockedUntil) return null;
    const diff = new Date(lockedUntil).getTime() - Date.now();
    if (diff <= 0) return null;
    const mins = Math.ceil(diff / 60000);
    if (mins > 60) {
      const hrs = Math.ceil(mins / 60);
      return `${hrs}小时`;
    }
    return `${mins}分钟`;
  })();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result: LoginResponse = await login(username.trim(), password);
      if (!result.success) {
        setError(result.message || '登录失败');
        if (result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
        }
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1>Stock Monitor</h1>
          <p>个股监控系统</p>
        </div>
        <form className="login-card__form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          {lockedRemaining && (
            <div className="login-locked">账户已锁定，请 {lockedRemaining} 后再试</div>
          )}
          <button className="login-btn" type="submit" disabled={loading || !!lockedRemaining}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
