"""
Diagnostic script to debug message saving issues in the chat application
"""
import os
import sys
import logging
from datetime import datetime
from flask import Flask
from sqlalchemy import inspect, text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a minimal Flask app
app = Flask(__name__)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True)
db_path = os.path.join(instance_path, 'chat.db')

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Import models after app configuration
from models.user import db, User, Message

def check_database_file():
    """Check if the database file exists and has appropriate permissions"""
    logger.info(f"Checking database file at: {db_path}")
    
    if not os.path.exists(db_path):
        logger.error(f"Database file does not exist at {db_path}")
        return False
    
    try:
        # Check file permissions
        readable = os.access(db_path, os.R_OK)
        writable = os.access(db_path, os.W_OK)
        logger.info(f"Database file permissions: Readable: {readable}, Writable: {writable}")
        
        if not readable or not writable:
            logger.error("Database file lacks proper permissions")
            return False
        
        # Check file size
        size = os.path.getsize(db_path)
        logger.info(f"Database file size: {size} bytes")
        
        return True
    except Exception as e:
        logger.error(f"Error checking database file: {str(e)}")
        return False

def check_database_schema():
    """Check if all required tables exist in the database"""
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            logger.info(f"Database tables: {', '.join(tables)}")
            
            # Check for required tables
            required_tables = ['user', 'message', 'contact']
            for table in required_tables:
                if table not in tables:
                    logger.error(f"Missing required table: {table}")
                    return False
            
            # If Message table exists, check its columns
            if 'message' in tables:
                columns = [column['name'] for column in inspector.get_columns('message')]
                logger.info(f"Message table columns: {', '.join(columns)}")
                
                required_columns = ['id', 'sender_id', 'recipient_id', 'content', 'timestamp', 'is_read']
                for column in required_columns:
                    if column not in columns:
                        logger.error(f"Missing required column in Message table: {column}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"Error checking database schema: {str(e)}")
            return False

def test_message_creation():
    """Test creating a message in the database"""
    with app.app_context():
        try:
            # First check if we have at least two users to work with
            user_count = User.query.count()
            if user_count < 2:
                logger.error("Need at least 2 users in the database to test messaging")
                return False
            
            # Get two users
            user1 = User.query.first()
            user2 = User.query.filter(User.id != user1.id).first()
            
            logger.info(f"Testing message from User {user1.id} to User {user2.id}")
            
            # Create a test message
            test_message = Message(
                sender_id=user1.id,
                recipient_id=user2.id,
                content=f"Test message sent at {datetime.now().isoformat()}"
            )
            
            # Try to save it
            db.session.add(test_message)
            db.session.commit()
            
            # Verify it was saved
            message_id = test_message.id
            logger.info(f"Message created with ID: {message_id}")
            
            # Verify we can retrieve it
            saved_message = Message.query.get(message_id)
            if saved_message:
                logger.info(f"Message successfully retrieved: {saved_message.to_dict()}")
                return True
            else:
                logger.error(f"Failed to retrieve saved message with ID {message_id}")
                return False
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating test message: {str(e)}")
            return False

def check_existing_messages():
    """Check if there are any existing messages in the database"""
    with app.app_context():
        try:
            message_count = Message.query.count()
            logger.info(f"Number of messages in database: {message_count}")
            
            if message_count > 0:
                # Show a few recent messages
                recent_messages = Message.query.order_by(Message.timestamp.desc()).limit(5).all()
                logger.info("Recent messages:")
                for msg in recent_messages:
                    logger.info(f"ID: {msg.id}, From: {msg.sender_id}, To: {msg.recipient_id}, Content: {msg.content[:30]}...")
            
            return message_count > 0
        except Exception as e:
            logger.error(f"Error checking existing messages: {str(e)}")
            return False

def run_diagnostics():
    """Run all diagnostic checks"""
    logger.info("=== STARTING MESSAGE DIAGNOSTICS ===")
    
    # Initialize the app and database
    with app.app_context():
        db.init_app(app)
    
    # Run checks
    file_ok = check_database_file()
    if not file_ok:
        logger.error("Database file check failed. Fix this issue before continuing.")
        return False
    
    schema_ok = check_database_schema()
    if not schema_ok:
        logger.error("Database schema check failed. The Message table might be missing or incomplete.")
        return False
    
    has_messages = check_existing_messages()
    if not has_messages:
        logger.warning("No existing messages found in the database.")
    
    test_ok = test_message_creation()
    if not test_ok:
        logger.error("Failed to create test message. Check the error logs above.")
        return False
    
    logger.info("=== DIAGNOSTICS COMPLETED SUCCESSFULLY ===")
    logger.info("The database appears to be working correctly for message storage.")
    return True

if __name__ == "__main__":
    success = run_diagnostics()
    sys.exit(0 if success else 1)
