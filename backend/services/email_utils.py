from flask import url_for, current_app
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer
from datetime import datetime, timedelta
from configs.extensions import mail
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_verification_token(email):
    """Generate a secure token for email verification"""
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return serializer.dumps(email, salt='email-verification-salt')

def verify_token(token, expiration=86400):
    """Verify the token and return the email if valid"""
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt='email-verification-salt',
            max_age=expiration
        )
        return email
    except Exception as e:
        current_app.logger.error(f"Token verification failed: {str(e)}")
        return None

def send_verification_email(recipient_email, token):
    """Send verification email with the provided token"""
    try:
        # Log the configuration being used (without sensitive data)
        current_app.logger.info("Email Configuration:")
        current_app.logger.info(f"MAIL_SERVER: {current_app.config.get('MAIL_SERVER')}")
        current_app.logger.info(f"MAIL_PORT: {current_app.config.get('MAIL_PORT')}")
        current_app.logger.info(f"MAIL_USE_TLS: {current_app.config.get('MAIL_USE_TLS')}")
        current_app.logger.info(f"MAIL_DEFAULT_SENDER: {current_app.config.get('MAIL_DEFAULT_SENDER')}")

        # Check if we have the required configuration
        required_configs = ['MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'APP_URL']
        missing_configs = [config for config in required_configs if not current_app.config.get(config)]

        if missing_configs:
            error_msg = f"Missing email configuration: {', '.join(missing_configs)}"
            current_app.logger.error(error_msg)
            return False

        # Generate verification URL
        verification_url = f"{current_app.config['APP_URL']}/verify-email?token={token}"

        # Create message with explicit sender format
        sender_name = current_app.config.get('EMAIL_SENDER_NAME', 'AltarMaker')
        sender_email = current_app.config.get('MAIL_DEFAULT_SENDER')
        sender = f"{sender_name} <{sender_email}>"

        # Create the email message
        msg = Message(
            'Verify Your Email - AltarMaker',
            sender=f"{sender_name} <{sender_email}>",
            recipients=[recipient_email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to AltarMaker!</h2>
                <p>Please click the button below to verify your email address:</p>
                <a href="{verification_url}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; 
                   color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                    Verify Email
                </a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{verification_url}</p>
                <p>If you did not create an account with us, please ignore this email.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    This is an automated message, please do not reply directly to this email.
                </p>
            </div>
            """
        )

        current_app.logger.info(f"Attempting to send verification email to {recipient_email}")
        current_app.logger.info(f"Using SMTP server: {current_app.config.get('MAIL_SERVER')}:{current_app.config.get('MAIL_PORT')}")
        current_app.logger.info(f"Authentication: {current_app.config.get('MAIL_USERNAME')}")

        # Initialize mail with current app context
        mail = current_app.extensions.get('mail')
        if not mail:
            from extensions import init_mail
            init_mail(current_app)
            mail = current_app.extensions.get('mail')

        # Debug: Print mail server configuration (without password)
        current_app.logger.info(f"SMTP Configuration - Server: {mail.server}, Port: {mail.port}, TLS: {mail.use_tls}, SSL: {mail.use_ssl}")

        # Send the email with error handling
        try:
            with mail.connect() as conn:
                conn.send(msg)
            current_app.logger.info(f"Successfully sent verification email to {recipient_email}")
            return True
        except Exception as send_error:
            error_msg = f"Failed to send verification email to {recipient_email}"
            current_app.logger.error(error_msg, exc_info=True)
            
            # Log SMTP specific errors if available
            smtp_errors = []
            if hasattr(send_error, 'smtp_error'):
                smtp_errors.append(f"SMTP Error: {send_error.smtp_error}")
            if hasattr(send_error, 'smtp_code'):
                smtp_errors.append(f"SMTP Code: {send_error.smtp_code}")
            if hasattr(send_error, 'smtp_error'):
                smtp_errors.append(f"SMTP Response: {getattr(send_error, 'smtp_error', '')}")
            
            if smtp_errors:
                current_app.logger.error("\n".join(["SMTP Error Details:"] + smtp_errors))
            
            # Common SMTP error codes and suggested actions
            smtp_code = getattr(send_error, 'smtp_code', '')
            if smtp_code == 535:
                current_app.logger.error("Authentication failed. Please check your email username and password.")
                current_app.logger.error("For Gmail, make sure to use an App Password if 2FA is enabled.")
            elif smtp_code in [421, 450, 451, 452]:
                current_app.logger.error("Temporary SMTP server issue. Please try again later.")
            
            # For debugging in development
            if current_app.debug:
                current_app.logger.info("\n" + "="*50)
                current_app.logger.info("DEBUG: Email sending failed. Details:")
                current_app.logger.info(f"Recipient: {recipient_email}")
                current_app.logger.info(f"From: {msg.sender}")
                current_app.logger.info(f"SMTP Server: {current_app.config.get('MAIL_SERVER')}")
                current_app.logger.info(f"SMTP Port: {current_app.config.get('MAIL_PORT')}")
                current_app.logger.info(f"Using TLS: {current_app.config.get('MAIL_USE_TLS')}")
                current_app.logger.info("="*50 + "\n")
                
            return False

    except Exception as e:
        error_msg = f"Failed to send verification email to {recipient_email}: {str(e)}"
        current_app.logger.error(error_msg, exc_info=True)  # Include full stack trace
        logger.error(f"ERROR: {error_msg}", exc_info=True)  # Also log to root logger
        return False

def send_welcome_email(recipient_email, username):
    """Send welcome email after successful verification"""
    app_url = current_app.config.get('APP_URL', '#')
    msg = Message(
        "🎉 Welcome to AltarMaker!",
        sender=current_app.config.get('MAIL_DEFAULT_SENDER', current_app.config.get('MAIL_USERNAME')),
        recipients=[recipient_email],
        html=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #4A90E2;">🎉 Welcome to <strong>AltarMaker</strong>, {username}!</h1>
            
            <p>Your email has been successfully verified, and we're thrilled to have you join our creative community. 🎨✨</p>
            
            <p>With AltarMaker, you can:</p>
            <ul style="line-height: 1.8;">
                <li>🖼 <strong>Design & customize</strong> stunning altars with frames, stickers, and text.</li>
                <li>🎯 <strong>Drag, resize, and personalize</strong> every element with ease.</li>
                <li>💾 <strong>Save & share</strong> your creations anytime, anywhere.</li>
            </ul>
            
            <p>We can't wait to see what you create! 🌟</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{app_url}" 
                   style="background-color: #4CAF50; 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          font-size: 16px; 
                          font-weight: bold;
                          display: inline-block;
                          margin: 10px 0;">
                    🎨 Start Creating
                </a>
            </div>
            
            <p>If you ever have questions or need help, just reply to this email — our team is always happy to assist.</p>
            
            <p style="margin-top: 30px;">Happy Creating,<br>
            — <em>The AltarMaker Team</em></p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                <p>AltarMaker | Create beautiful digital altars with ease</p>
            </div>
        </div>
        """
    )
    
    try:
        mail.send(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send welcome email: {str(e)}")
        return False