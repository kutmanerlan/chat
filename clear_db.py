import os
import sys
import argparse
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a simple Flask app for database access
app = Flask(__name__)

# Get the absolute path to the project directory
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')

# Configure the SQLAlchemy database URI
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "chat.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Import models
try:
    from models.user import db, User, Contact, Message, Block, DeletedChat
except ImportError:
    logger.error("Failed to import database models. Make sure you're running this script from the project root.")
    sys.exit(1)

# Initialize the app with the database
db.init_app(app)

def clear_deleted_chats():
    """Remove all entries from the DeletedChat table"""
    try:
        num_deleted = DeletedChat.query.delete()
        db.session.commit()
        logger.info(f"Successfully deleted {num_deleted} records from DeletedChat table")
        return num_deleted
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing DeletedChat table: {str(e)}")
        return 0

def reset_contacts_and_blocks():
    """Remove all contacts and blocks relationships"""
    try:
        num_contacts = Contact.query.delete()
        num_blocks = Block.query.delete()
        db.session.commit()
        logger.info(f"Successfully deleted {num_contacts} contacts and {num_blocks} blocks")
        return num_contacts + num_blocks
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error resetting contacts and blocks: {str(e)}")
        return 0

def reset_messages():
    """Delete all messages"""
    try:
        num_messages = Message.query.delete()
        db.session.commit()
        logger.info(f"Successfully deleted {num_messages} messages")
        return num_messages
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting messages: {str(e)}")
        return 0

def full_reset():
    """Reset all data in the database except users"""
    total = 0
    total += clear_deleted_chats()
    total += reset_contacts_and_blocks()
    total += reset_messages()
    logger.info(f"Full reset completed. Total records deleted: {total}")
    return total

def report_database_status():
    """Print a report of table record counts"""
    try:
        user_count = User.query.count()
        message_count = Message.query.count()
        contact_count = Contact.query.count()
        block_count = Block.query.count()
        deleted_chat_count = DeletedChat.query.count()
        
        print("\n=== Database Status ===")
        print(f"Users: {user_count}")
        print(f"Messages: {message_count}")
        print(f"Contacts: {contact_count}")
        print(f"Blocks: {block_count}")
        print(f"Deleted Chats: {deleted_chat_count}")
        print("======================\n")
    except Exception as e:
        logger.error(f"Error reporting database status: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="Database cleanup utility")
    parser.add_argument('--deleted-chats', action='store_true', help="Clear only deleted chats (least destructive)")
    parser.add_argument('--relationships', action='store_true', help="Reset contacts and blocks")
    parser.add_argument('--messages', action='store_true', help="Delete all messages")
    parser.add_argument('--all', action='store_true', help="Perform a full reset (all of the above)")
    parser.add_argument('--status', action='store_true', help="Show database status without making changes")
    
    args = parser.parse_args()
    
    # If no arguments provided, show help and status
    if not any(vars(args).values()):
        parser.print_help()
        with app.app_context():
            report_database_status()
        return
    
    with app.app_context():
        if args.status:
            report_database_status()
            return
            
        print("Starting database cleanup...")
        
        if args.all:
            full_reset()
        else:
            if args.deleted_chats:
                clear_deleted_chats()
            if args.relationships:
                reset_contacts_and_blocks()
            if args.messages:
                reset_messages()
        
        # Show final status
        report_database_status()
        print("Database cleanup completed!")

if __name__ == "__main__":
    main()
