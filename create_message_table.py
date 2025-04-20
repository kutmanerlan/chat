"""
Simple migration script to ensure the Message table is created
"""
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a minimal Flask app
app = Flask(__name__)

# Configure the database
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "chat.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database
db = SQLAlchemy(app)

# Import models - make sure this comes after db initialization
from models.user import User, Contact, Message

def create_message_table():
    with app.app_context():
        try:
            # Check if the Message table exists
            if not Message.__table__.exists(db.engine):
                logger.info("Creating Message table...")
                Message.__table__.create(db.engine)
                logger.info("Message table created successfully!")
            else:
                logger.info("Message table already exists.")
            
            # Verify the table was created
            if Message.__table__.exists(db.engine):
                logger.info("Verified: Message table exists.")
            else:
                logger.error("Failed to create Message table!")
                
            return True
        except Exception as e:
            logger.error(f"Error creating Message table: {str(e)}")
            return False

if __name__ == "__main__":
    result = create_message_table()
    sys.exit(0 if result else 1)
