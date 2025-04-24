from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Add missing fields that are used in app.py
    email_confirmed = db.Column(db.Boolean, default=False)
    confirmation_token = db.Column(db.String(100), nullable=True)
    token_expiration = db.Column(db.DateTime, nullable=True)
    
    # Field for storing the avatar path
    avatar_path = db.Column(db.String(255), nullable=True)
    
    # Field for storing user information/bio
    bio = db.Column(db.String(500), nullable=True)
    
    # Define relationship for contacts
    contacts = db.relationship('Contact', 
                              foreign_keys='Contact.user_id',
                              backref=db.backref('owner', lazy='joined'),
                              lazy='dynamic',
                              cascade='all, delete-orphan')
    
    # Define relationships for blocks
    blocks_made = db.relationship('Block', 
                                 foreign_keys='Block.user_id',
                                 backref=db.backref('blocker', lazy='joined'),
                                 lazy='dynamic',
                                 cascade='all, delete-orphan')
    
    blocks_received = db.relationship('Block', 
                                     foreign_keys='Block.blocked_user_id',
                                     backref=db.backref('blocked', lazy='joined'),
                                     lazy='dynamic',
                                     cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    # Method for getting avatar URL or default avatar
    def get_avatar(self):
        if self.avatar_path:
            return self.avatar_path
        return None  # Will return default avatar with initials
    
    # Method for user authentication
    @classmethod
    def authenticate(cls, email, password):
        user = cls.query.filter_by(email=email).first()
        if user and user.check_password(password):
            return user
        return None

# Model for storing user contacts
class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship with the contact user
    contact_user = db.relationship('User', foreign_keys=[contact_id], lazy='joined')
    
    # Index for fast lookup and uniqueness
    __table_args__ = (db.UniqueConstraint('user_id', 'contact_id', name='_user_contact_uc'),)

# Model for storing messages between users
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    is_read = db.Column(db.Boolean, default=False)
    # Add fields for tracking edits
    is_edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime, nullable=True)
    
    # Define relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy='dynamic'))
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref=db.backref('received_messages', lazy='dynamic'))
    
    def to_dict(self):
        """Convert message to dictionary for JSON serialization"""
        message_dict = {
            'id': self.id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
            'is_read': self.is_read,
        }
        
        # Safely add new fields if they exist
        try:
            if hasattr(self, 'is_edited'):
                message_dict['is_edited'] = self.is_edited
            else:
                message_dict['is_edited'] = False
                
            if hasattr(self, 'edited_at') and self.edited_at:
                message_dict['edited_at'] = self.edited_at.isoformat()
            else:
                message_dict['edited_at'] = None
        except Exception as e:
            # If any error happens with these attributes, use defaults
            message_dict['is_edited'] = False
            message_dict['edited_at'] = None
            
        return message_dict

# Model for storing blocked users
class Block(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    blocked_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Index for fast lookup and uniqueness
    __table_args__ = (db.UniqueConstraint('user_id', 'blocked_user_id', name='_user_blocked_uc'),)