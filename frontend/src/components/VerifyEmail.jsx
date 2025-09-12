import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useVerifyEmailMutation, useResendVerificationEmailMutation } from '../redux/apiSlice';
import './VerifyEmail.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'expired'
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();
  const [verifyEmail] = useVerifyEmailMutation();
  const [resendVerification] = useResendVerificationEmailMutation();

  useEffect(() => {
    const verifyEmailToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        const response = await verifyEmail(token).unwrap();
        setStatus('success');
        setMessage(response.message || 'Your email has been verified successfully! You can now log in.');
        setEmail(response.email || '');
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus(error.data?.code === 'VERIFICATION_LINK_EXPIRED' ? 'expired' : 'error');
        setMessage(error.data?.message || 'Failed to verify email. The link may be invalid or expired.');
        setEmail(error.data?.email || '');
      }
    };

    verifyEmailToken();
  }, [searchParams, verifyEmail]);

  const handleResendVerification = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendSuccess(false);
    
    try {
      await resendVerification({ email }).unwrap();
      setResendSuccess(true);
      setMessage(`A new verification link has been sent to ${email}. Please check your inbox.`);
    } catch (error) {
      console.error('Error resending verification:', error);
      setMessage(error.data?.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login', { state: { email } });
  };

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        <div className="logo-container">
          <img src="/logo/logo.png" alt="AltarMaker Logo" className="logo" />
          <h1>AltarMaker</h1>
        </div>
        
        <h2>Email Verification</h2>
        
        <div className={`status-message ${status}`}>
          {status === 'verifying' && (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Verifying your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="success-message">
              <svg viewBox="0 0 24 24" className="success-icon">
                <path fill="currentColor" d="M12,0A12,12,0,1,0,24,12,12,12,0,0,0,12,0ZM10.75,16.518,6.25,12.2l1.4-1.435L10.724,13.38l5.105-5.218L17.25,9.892Z"/>
              </svg>
              <p>{message}</p>
            </div>
          )}
          
          {(status === 'error' || status === 'expired') && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" className="error-icon">
                <path fill="currentColor" d="M12,2C6.47,2,2,6.47,2,12s4.47,10,10,10s10-4.47,10-10S17.53,2,12,2z M16.7,14.3c0.39,0.39,0.39,1.02,0,1.41c-0.39,0.39-1.02,0.39-1.41,0L12,13.41l-3.3,3.3c-0.39,0.39-1.02,0.39-1.41,0c-0.39-0.39-0.39-1.02,0-1.41L10.59,12l-3.3-3.3c-0.39-0.39-0.39-1.02,0-1.41c0.39-0.39,1.02-0.39,1.41,0L12,10.59l3.3-3.3c0.39-0.39,1.02-0.39,1.41,0c0.39,0.39,0.39,1.02,0,1.41L13.41,12L16.7,15.3z"/>
              </svg>
              <p>{message}</p>
            </div>
          )}
        </div>
        
        {status === 'success' && (
          <button 
            onClick={handleLoginClick} 
            className="login-button"
          >
            Continue to Login
          </button>
        )}
        
        {(status === 'error' || status === 'expired') && (
          <div className="error-actions">
            {email && (
              <button
                onClick={handleResendVerification}
                disabled={isResending || resendSuccess}
                className="resend-button"
              >
                {isResending ? 'Sending...' : resendSuccess ? 'Sent!' : 'Resend Verification Email'}
              </button>
            )}
            
            <div className="help-links">
              <Link to="/contact" className="help-link">Need help? Contact Support</Link>
              <span className="divider">•</span>
              <Link to="/login" className="help-link">Back to Login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;