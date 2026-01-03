import { useState } from 'react';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

const Login = ({ onLogin }) => {
    const [loginType, setLoginType] = useState(''); // '', 'admin', 'student'
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
        loginId: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLogin(data.user, data.token);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Network error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    const selectLoginType = (type) => {
        setLoginType(type);
        setError('');
        if (type === 'admin') {
            setCredentials({ username: 'admin', password: '', loginId: '' });
        } else if (type === 'student') {
            setCredentials({ username: '', password: 'student123', loginId: '' });
        }
    };

    const selectBranchLogin = (branchLogin) => {
        setCredentials({ username: branchLogin, password: 'student123', loginId: '' });
    };

    const goBack = () => {
        setLoginType('');
        setCredentials({ username: '', password: '', loginId: '' });
        setError('');
    };

    // Initial login type selection screen
    if (!loginType) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '1rem'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '1rem',
                    padding: '2rem',
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            width: '60px',
                            height: '60px',
                            borderRadius: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem auto'
                        }}>
                            <LogIn size={30} color="white" />
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                            Attendance System
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                            Choose your login type
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <button
                            onClick={() => selectLoginType('admin')}
                            style={{
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            👨‍💼 Admin Login
                        </button>
                        <button
                            onClick={() => selectLoginType('student')}
                            style={{
                                padding: '1rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontSize: '1rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            🎓 Student Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Login form screen
    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '1rem',
                padding: '2rem',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: loginType === 'admin' 
                            ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        width: '60px',
                        height: '60px',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto'
                    }}>
                        {loginType === 'admin' ? '👨‍💼' : '🎓'}
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
                        {loginType === 'admin' ? 'Admin Login' : 'Student Login'}
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                        {loginType === 'admin' ? 'Enter admin credentials' : 'Select your branch'}
                    </p>
                </div>

                {/* Back Button */}
                <button
                    onClick={goBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        marginBottom: '1rem',
                        padding: '0.25rem 0'
                    }}
                >
                    ← Back to login type selection
                </button>

                {/* Error Message */}
                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <AlertCircle size={16} color="#dc2626" />
                        <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                    {loginType === 'admin' && (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.875rem', 
                                    fontWeight: '500', 
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Username
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User 
                                        size={18} 
                                        color="#9ca3af" 
                                        style={{ 
                                            position: 'absolute', 
                                            left: '0.75rem', 
                                            top: '50%', 
                                            transform: 'translateY(-50%)' 
                                        }} 
                                    />
                                    <input
                                        type="text"
                                        name="username"
                                        value={credentials.username}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.5rem',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                        placeholder="Enter admin username"
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.875rem', 
                                    fontWeight: '500', 
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock 
                                        size={18} 
                                        color="#9ca3af" 
                                        style={{ 
                                            position: 'absolute', 
                                            left: '0.75rem', 
                                            top: '50%', 
                                            transform: 'translateY(-50%)' 
                                        }} 
                                    />
                                    <input
                                        type="password"
                                        name="password"
                                        value={credentials.password}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.5rem',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'border-color 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                        placeholder="Enter admin password"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {loginType === 'student' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ 
                                display: 'block', 
                                fontSize: '0.875rem', 
                                fontWeight: '500', 
                                color: '#374151',
                                marginBottom: '0.75rem'
                            }}>
                                Select Your Branch
                            </label>
                            
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {[
                                    { login: 'CSE_2K26', branch: 'CSE', color: '#6366f1' },
                                    { login: 'AIML_2K26', branch: 'AIML', color: '#8b5cf6' },
                                    { login: 'CSD_2K26', branch: 'CSD', color: '#06b6d4' },
                                    { login: 'ECE_2K26', branch: 'ECE', color: '#10b981' },
                                    { login: 'MCA_2K26', branch: 'MCA', color: '#f59e0b' }
                                ].map(({ login, branch, color }) => (
                                    <button
                                        key={login}
                                        type="button"
                                        onClick={() => selectBranchLogin(login)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            background: credentials.username === login ? color : 'white',
                                            color: credentials.username === login ? 'white' : color,
                                            border: `2px solid ${color}`,
                                            borderRadius: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (credentials.username !== login) {
                                                e.target.style.background = color;
                                                e.target.style.color = 'white';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (credentials.username !== login) {
                                                e.target.style.background = 'white';
                                                e.target.style.color = color;
                                            }
                                        }}
                                    >
                                        <span>{branch} Branch</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                            {login}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            
                            {credentials.username && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    padding: '0.75rem',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#166534'
                                }}>
                                    ✓ Selected: {credentials.username} (Password: student123)
                                </div>
                            )}
                            
                            <p style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280', 
                                marginTop: '0.75rem',
                                textAlign: 'center'
                            }}>
                                All branches use the same password: <strong>student123</strong>
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (loginType === 'student' && !credentials.username)}
                        style={{
                            width: '100%',
                            background: loading || (loginType === 'student' && !credentials.username) ? '#9ca3af' : 
                                loginType === 'admin' 
                                    ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: '500',
                            cursor: loading || (loginType === 'student' && !credentials.username) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Demo credentials */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                    {loginType === 'admin' && (
                        <p style={{ 
                            fontSize: '0.875rem', 
                            color: '#6b7280', 
                            textAlign: 'center', 
                            marginBottom: '1rem' 
                        }}>
                            Demo Credentials: admin / admin123
                        </p>
                    )}
                    {loginType === 'student' && (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ 
                                fontSize: '0.875rem', 
                                color: '#6b7280', 
                                marginBottom: '0.5rem' 
                            }}>
                                Permanent Student Logins:
                            </p>
                            <p style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280',
                                lineHeight: '1.4'
                            }}>
                                CSE_2K26 • AIML_2K26 • CSD_2K26 • ECE_2K26 • MCA_2K26
                                <br />
                                <strong>Password: student123</strong>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;