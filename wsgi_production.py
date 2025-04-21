import sys
import os
import logging

# Configure logging
logging.basicConfig(
    filename='/tmp/wsgi_error.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

try:
    logging.info("Starting WSGI script")
    
    # Add project path
    path = '/home/tymeer/chat'
    if path not in sys.path:
        sys.path.insert(0, path)
    
    logging.info(f"Added path: {path}")
    
    # Set environment variables
    os.environ['FLASK_ENV'] = 'production'
    os.environ['PYTHONANYWHERE_HOST'] = 'tymeer.pythonanywhere.com'
    
    # Import Flask application - note the new import from app package
    from app import create_app
    application = create_app()
    
    logging.info("Flask application successfully imported")
    
except Exception as e:
    logging.error(f"Error initializing WSGI: {str(e)}")
    import traceback
    logging.error(traceback.format_exc())
    
    def application(environ, start_response):
        status = '200 OK'
        output = b'WSGI error! Check logs at /tmp/wsgi_error.log'
        response_headers = [('Content-type', 'text/plain'),
                           ('Content-Length', str(len(output)))]
        start_response(status, response_headers)
        return [output]
