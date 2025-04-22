import os
import sys
import argparse
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

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

def show_database_data():
    """Display all data from the database tables"""
    try:
        print("\n=== Database Contents ===")
        
        # Display Users
        users = User.query.all()
        print("\n-- Users --")
        print(f"{'ID':<5} {'Name':<20} {'Email':<30} {'Confirmed':<10}")
        print("-" * 70)
        for user in users:
            print(f"{user.id:<5} {user.name[:20]:<20} {user.email[:30]:<30} {'Yes' if user.email_confirmed else 'No':<10}")
        
        # Display Messages
        messages = Message.query.order_by(Message.timestamp.desc()).limit(50).all()
        print("\n-- Messages (last 50) --")
        print(f"{'ID':<5} {'From':<5} {'To':<5} {'Time':<20} {'Read':<5} {'Content':<40}")
        print("-" * 80)
        for msg in messages:
            # Truncate content for display
            content = msg.content if len(msg.content) < 40 else msg.content[:37] + "..."
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M:%S") if msg.timestamp else "N/A"
            print(f"{msg.id:<5} {msg.sender_id:<5} {msg.recipient_id:<5} {timestamp:<20} {'Yes' if msg.is_read else 'No':<5} {content:<40}")
        
        # Display Contacts
        contacts = Contact.query.all()
        print("\n-- Contacts --")
        print(f"{'ID':<5} {'User ID':<8} {'Contact ID':<10}")
        print("-" * 30)
        for contact in contacts:
            print(f"{contact.id:<5} {contact.user_id:<8} {contact.contact_id:<10}")
        
        # Display Blocks
        blocks = Block.query.all()
        print("\n-- Blocks --")
        print(f"{'ID':<5} {'User ID':<8} {'Blocked User ID':<15}")
        print("-" * 35)
        for block in blocks:
            print(f"{block.id:<5} {block.user_id:<8} {block.blocked_user_id:<15}")
        
        # Display Deleted Chats
        deleted_chats = DeletedChat.query.all()
        print("\n-- Deleted Chats --")
        print(f"{'ID':<5} {'User ID':<8} {'Chat With User ID':<15} {'Deleted At':<20}")
        print("-" * 55)
        for chat in deleted_chats:
            deleted_at = chat.deleted_at.strftime("%Y-%m-%d %H:%M:%S") if chat.deleted_at else "N/A"
            print(f"{chat.id:<5} {chat.user_id:<8} {chat.chat_with_user_id:<15} {deleted_at:<20}")
        
        print("\n=== End of Database Contents ===")
    except Exception as e:
        logger.error(f"Error showing database data: {str(e)}")

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
    parser.add_argument('--show-data', action='store_true', help="Show actual database contents (limited to 50 records per table)")
    
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
            
        if args.show_data:
            show_database_data()
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
