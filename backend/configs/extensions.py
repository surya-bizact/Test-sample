from flask_mail import Mail
import logging

# Initialize Flask-Mail extension
mail = Mail()

def init_mail(app):
    """Initialize the mail instance with the Flask app"""
    try:
        # Check if we're in development mode and email is not configured
        if app.config.get('ENV') == 'development' and not app.config.get('MAIL_SERVER'):
            app.config['MAIL_SUPPRESS_SEND'] = True
            app.config['MAIL_DEBUG'] = True
            mail.init_app(app)
            app.logger.info("Running in development mode with email sending suppressed")
            return
            
        # Configure mail settings for SMTP
        mail_settings = {
            'MAIL_SERVER': app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
            'MAIL_PORT': app.config.get('MAIL_PORT', 587),  # Default SMTP port with TLS
            'MAIL_USE_TLS': app.config.get('MAIL_USE_TLS', True),
            'MAIL_USE_SSL': app.config.get('MAIL_USE_SSL', False),
            'MAIL_USERNAME': app.config.get('MAIL_USERNAME'),
            'MAIL_PASSWORD': app.config.get('MAIL_PASSWORD'),
            'MAIL_DEFAULT_SENDER': app.config.get('MAIL_DEFAULT_SENDER'),
            'MAIL_DEBUG': app.config.get('MAIL_DEBUG', True),
            'MAIL_TIMEOUT': 10,  # Reduced timeout to 10 seconds
            'MAIL_SUPPRESS_SEND': app.config.get('MAIL_SUPPRESS_SEND', False)
        }
        
        # Update app config with mail settings
        app.config.update(mail_settings)
        
        # Initialize mail with app
        mail.init_app(app)
        
        # Log the configuration (without sensitive data)
        app.logger.info(f"Mail server configured for {app.config.get('MAIL_SERVER')}:{app.config.get('MAIL_PORT')}")
        app.logger.info(f"Using sender: {app.config.get('MAIL_DEFAULT_SENDER')}")
        
        # Test connection in development
        if not app.testing and app.debug:
            with app.app_context():
                try:
                    with mail.connect() as conn:
                        app.logger.info("Successfully connected to mail server")
                except Exception as e:
                    app.logger.error(f"Mail server connection test failed: {str(e)}")
        
    except Exception as e:
        app.logger.error(f"Error initializing mail: {str(e)}", exc_info=True)
        # Don't raise the exception to allow the app to start
        app.logger.warning("Continuing without mail functionality")
