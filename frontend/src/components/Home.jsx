import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  useLoginMutation, 
  useRegisterMutation,
  useForgotPasswordMutation,
  useResendVerificationEmailMutation,
  useVerifyEmailMutation
} from '../redux/apiSlice';
import './Home.css';

const Home = ({ onLogin }) => {
  // RTK Query mutations
  const [login] = useLoginMutation();
  const [register] = useRegisterMutation();
  const [forgotPassword] = useForgotPasswordMutation();
  const [resendVerification] = useResendVerificationEmailMutation();
  const [verifyEmail] = useVerifyEmailMutation();
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginMode, setLoginMode] = useState('user'); // 'user' or 'admin'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  // Load saved data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('registrationData');
    if (savedData) {
      const { username: savedUsername, email: savedEmail } = JSON.parse(savedData);
      setUsername(savedUsername || '');
      setEmail(savedEmail || '');
    }
  }, []);

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Must contain at least one lowercase letter';
    if (!/\d/.test(password)) return 'Must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Must contain at least one special character';
    return '';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Only validate password in register mode
    if (authMode === 'register') {
      setPasswordError(validatePassword(newPassword));
      
      if (confirmPassword && newPassword !== confirmPassword) {
        setError('Passwords do not match');
      } else {
        setError('');
      }
    } else {
      // Clear any existing errors in login mode
      setError('');
    }
  };
  
  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    
    if (password !== newConfirmPassword) {
      setError('Passwords do not match');
    } else {
      setError('');
    }
  };
  
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  const toggleAuthMode = () => setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  const toggleLoginMode = () => setLoginMode(prev => prev === 'user' ? 'admin' : 'user');

  // Handle email verification from URL token
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      const verifyEmailToken = async () => {
        try {
          const response = await verifyEmail(token).unwrap();
          if (response.success) {
            setSuccess('Your email has been verified successfully. You can now log in.');
            setAuthMode('login');
          }
        } catch (error) {
          setError(error.data?.message || 'Failed to verify email. The link may have expired.');
        }
      };
      verifyEmailToken();
    }
  }, [searchParams, verifyEmail]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Only check if password is provided, no validation
    if (!password) {
      setError('Password is required');
      return;
    }

    try {
      setIsLoading(true);
      const credentials = {
        username: username.trim(),
        password,
        role: loginMode
      };
      
      console.log('Login attempt:', { ...credentials, password: '***' });
      
      const response = await login(credentials).unwrap();
      
      if (response.user) {
        console.log('Login successful, user:', response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        onLogin?.(response.user);
        navigate('/main');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.data?.error || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validate password
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setError(passwordValidation);
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const userData = { username, email, password };
      const response = await register(userData).unwrap();
      
      if (response.message) {
        // Show verification popup with the registered email
        setVerificationEmail(email);
        setShowVerificationMessage(true);
        
        // Save registration data to localStorage
        localStorage.setItem('registrationData', JSON.stringify({ username, email }));
        
        // Clear form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setIsLoading(true);
      await forgotPassword({ email }).unwrap();
      setSuccess('Password reset instructions have been sent to your email.');
      setError('');
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.data?.error || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Email is required to resend verification');
      return;
    }
    
    try {
      setIsLoading(true);
      await resendVerification({ email }).unwrap();
      setSuccess('Verification email has been resent. Please check your inbox.');
      setError('');
    } catch (error) {
      console.error('Resend verification error:', error);
      setError(error.data?.error || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseVerificationMessage = () => {
    setShowVerificationMessage(false);
    // Optionally switch to login mode
    setAuthMode('login');
  };

  // Render the component
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    opacity: showVerificationMessage ? 1 : 0,
    visibility: showVerificationMessage ? 'visible' : 'hidden',
    transition: 'all 0.3s ease-in-out',
    backdropFilter: 'blur(4px)',
  };

  const modalContentStyle = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    transform: showVerificationMessage ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.3s ease-in-out',
    textAlign: 'center',
  };

  return (
    <div className="home-container">
      <div className="auth-container">
        <div className="auth-header">
          <img 
            src="/logo/logo.png" 
            alt="Logo" 
            style={{
              width: '20%',
              height: '25%',
              // objectFit: 'cover'
            }}
          />
          <h1>AltarMaker</h1>
          <p>Create Beautiful Spaces</p>
        </div>

        <div className="auth-box">
          <div className="auth-tabs">
            <button 
              className={`tab ${loginMode === 'user' ? 'active' : ''}`}
              onClick={() => setLoginMode('user')}
            >
              User {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
            <button 
              className={`tab ${loginMode === 'admin' ? 'active' : ''}`}
              onClick={() => setLoginMode('admin')}
            >
              Admin {authMode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </div>

          <div className="auth-form">
            <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}
            
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={authMode === 'login' ? 'Username or email' : 'Choose a username'}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    required
                    minLength={authMode === 'register' ? 8 : undefined}
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {authMode === 'register' && passwordError && (
                  <div className="password-hint">{passwordError}</div>
                )}
              </div>

                {/* Forgot password link (login mode only) */}
                {authMode === 'login' && (
                  <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (!email && !username) {
                          setEmail('');
                        }
                        setAuthMode('forgot');
                      }}
                      style={{ color: '#BC4034', fontSize: '15px', fontFamily: 'Montserrat', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      Forgot password?
                    </a>
                  </div>
                )}
              
              {authMode === 'register' && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      placeholder="Confirm your password"
                      required
                      minLength={8}
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={toggleConfirmPasswordVisibility}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  
                </div>
              )}
              
              <button 
                type="submit" 
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="loading-spinner"></span>
                    {authMode === 'login' ? 'Signing In...' : 'Creating Account...'}
                  </div>
                ) : (
                  authMode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
              
              <div className="auth-footer">
                {authMode === 'login' ? (
                  <>
                    <p>
                      Don't have an account?{' '}
                      <a href="#" onClick={(e) => {
                        e.preventDefault();
                        setAuthMode('register');
                        setError('');
                        setSuccess('');
                      }}>
                        Sign up
                      </a>
                    </p>
                  </>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <a href="#" onClick={(e) => {
                      e.preventDefault();
                      setAuthMode('login');
                      setError('');
                      setSuccess('');
                    }}>
                      Sign in
                    </a>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Verification Email Popup */}
      <div style={modalOverlayStyle} onClick={handleCloseVerificationMessage}>
        <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#e8f5e9',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            border: '3px solid #c8e6c9'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#2e7d32" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          
          <h3 style={{
            color: '#2e7d32',
            marginBottom: '0.75rem',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            Check Your Email
          </h3>
          
          <p style={{
            color: '#555',
            marginBottom: '1.5rem',
            lineHeight: '1.6',
            fontSize: '1rem'
          }}>
            We've sent a verification link to <strong style={{ color: '#2e7d32' }}>{verificationEmail}</strong>.
            Please check your inbox and click the link to verify your account.
          </p>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginTop: '1.5rem'
          }}>
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              style={{
                backgroundColor: '#2e7d32',
                color: 'white',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.8 : 1
              }}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </button>
            
            <button
              onClick={handleCloseVerificationMessage}
              style={{
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Close
            </button>
          </div>
          
          <p style={{
            fontSize: '0.85rem',
            color: '#888',
            textAlign: 'center',
            marginTop: '1.5rem',
            marginBottom: '0',
            fontStyle: 'italic'
          }}>
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
