import os
import sys
import argparse
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
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
    from models.user import db, User, Contact, Message, Block
    HAS_DELETED_CHAT = False
    # Try to import DeletedChat if it exists
    try:
        from models.user import DeletedChat
        HAS_DELETED_CHAT = True
    except ImportError:
        logger.info("DeletedChat model not found. This is normal if you removed this feature.")
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
        
        # Display Deleted Chats if the model exists
        if HAS_DELETED_CHAT:
            try:
                deleted_chats = DeletedChat.query.all()
                print("\n-- Deleted Chats --")
                print(f"{'ID':<5} {'User ID':<8} {'Chat With User ID':<15} {'Deleted At':<20}")
                print("-" * 55)
                for chat in deleted_chats:
                    deleted_at = chat.deleted_at.strftime("%Y-%m-%d %H:%M:%S") if chat.deleted_at else "N/A"
                    print(f"{chat.id:<5} {chat.user_id:<8} {chat.chat_with_user_id:<15} {deleted_at:<20}")
            except Exception as e:
                logger.error(f"Error displaying deleted chats: {str(e)}")
        
        print("\n=== End of Database Contents ===")
    except Exception as e:
        logger.error(f"Error showing database data: {str(e)}")

def delete_users(keep_test_user=False):
    """Delete all users or all except test user"""
    try:
        if keep_test_user:
            num_deleted = User.query.filter(User.email != 'test@example.com').delete()
            db.session.commit()
            logger.info(f"Successfully deleted {num_deleted} users (kept test user)")
        else:
            num_deleted = User.query.delete()
            db.session.commit()
            logger.info(f"Successfully deleted all {num_deleted} users")

        # Create a test user if we're supposed to keep it but it doesn't exist
        if keep_test_user and User.query.filter_by(email='test@example.com').first() is None:
            test_user = User(name='Test User', email='test@example.com')
            test_user.set_password('password123')
            test_user.email_confirmed = True
            db.session.add(test_user)
            db.session.commit()
            logger.info("Created test user (test@example.com / password123)")
            
        return num_deleted
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting users: {str(e)}")
        return 0

def clear_deleted_chats():
    """Remove all entries from the DeletedChat table (if it exists)"""
    if not HAS_DELETED_CHAT:
        logger.info("DeletedChat table not found, skipping")
        return 0
    
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

def full_reset(keep_test_user=False):
    """Reset all data in the database"""
    total = 0
    
    # Delete records that have foreign key constraints first
    total += reset_messages()
    total += reset_contacts_and_blocks()
    if HAS_DELETED_CHAT:
        total += clear_deleted_chats()
        
    # Finally delete users
    total += delete_users(keep_test_user)
    
    logger.info(f"Full reset completed. Total records deleted: {total}")
    return total

def purge_all_data(keep_test_user=False):
    """Delete all data from all tables but keep the structure"""
    try:
        # This uses SQL directly to empty all tables and reset sequences
        # Order is important to handle foreign key constraints
        with db.engine.connect() as connection:
            # Get all table names
            inspector = db.inspect(db.engine)
            table_names = inspector.get_table_names()
            
            # First delete from tables without foreign keys or tables that no other tables depend on
            delete_order = []
            
            # Known order based on typical dependencies
            if 'message' in table_names:
                delete_order.append('message')
                
            if 'contact' in table_names:
                delete_order.append('contact')
                
            if 'block' in table_names:
                delete_order.append('block')
                
            if 'deleted_chat' in table_names:
                delete_order.append('deleted_chat')
                
            # User should be last since other tables depend on it
            if 'user' in table_names:
                delete_order.append('user')
                
            # Add any remaining tables
            for table_name in table_names:
                if table_name not in delete_order:
                    # Add any other tables at the beginning, assuming they're independent
                    delete_order.insert(0, table_name)
            
            logger.info(f"Deleting data in this order: {', '.join(delete_order)}")
            
            # Now delete from each table
            for table_name in delete_order:
                # Convert to SQLAlchemy text object to make it executable
                if table_name == 'user' and keep_test_user:
                    # Delete all users except test user
                    connection.execute(text(f"DELETE FROM {table_name} WHERE email != 'test@example.com'"))
                else:
                    connection.execute(text(f"DELETE FROM {table_name}"))
                
                # Reset auto-increment counter for SQLite
                connection.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table_name}'"))
            
            connection.commit()
            
        # Recreate test user if needed
        if keep_test_user:
            with app.app_context():
                if User.query.filter_by(email='test@example.com').first() is None:
                    test_user = User(name='Test User', email='test@example.com')
                    test_user.set_password('password123')
                    test_user.email_confirmed = True
                    db.session.add(test_user)
                    db.session.commit()
                    logger.info("Created test user (test@example.com / password123)")
                    
        logger.info("Successfully purged all data from database while preserving table structure")
        return True
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error purging all data: {str(e)}")
        return False

def report_database_status():
    """Print a report of table record counts"""
    try:
        user_count = User.query.count()
        message_count = Message.query.count()
        contact_count = Contact.query.count()
        block_count = Block.query.count()
        
        print("\n=== Database Status ===")
        print(f"Users: {user_count}")
        print(f"Messages: {message_count}")
        print(f"Contacts: {contact_count}")
        print(f"Blocks: {block_count}")
        
        # Check for deleted chats
        if HAS_DELETED_CHAT:
            try:
                deleted_chat_count = DeletedChat.query.count()
                print(f"Deleted Chats: {deleted_chat_count}")
            except Exception:
                print("Deleted Chats: Table exists but couldn't be queried")
        
        print("======================\n")
    except Exception as e:
        logger.error(f"Error reporting database status: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="Database cleanup utility")
    parser.add_argument('--deleted-chats', action='store_true', help="Clear only deleted chats (least destructive)")
    parser.add_argument('--relationships', action='store_true', help="Reset contacts and blocks")
    parser.add_argument('--messages', action='store_true', help="Delete all messages")
    parser.add_argument('--users', action='store_true', help="Delete all users")
    parser.add_argument('--all', action='store_true', help="Perform a full reset (all of the above)")
    parser.add_argument('--purge', action='store_true', help="Purge ALL data from ALL tables (preserves structure)")
    parser.add_argument('--keep-test', action='store_true', help="Keep test user when deleting users")
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
        
        if args.purge:
            print("WARNING: This will delete ALL data from ALL tables!")
            confirmation = input("Are you sure you want to continue? (yes/no): ").strip().lower()
            if confirmation == 'yes':
                purge_all_data(args.keep_test)
            else:
                print("Operation canceled.")
                return
        elif args.all:
            full_reset(args.keep_test)
        else:
            if args.deleted_chats:
                clear_deleted_chats()
            if args.relationships:
                reset_contacts_and_blocks()
            if args.messages:
                reset_messages()
            if args.users:
                delete_users(args.keep_test)
        
        # Show final status
        report_database_status()
        print("Database cleanup completed!")

if __name__ == "__main__":
    main()
