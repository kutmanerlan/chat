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
    
    # Добавляем недостающие поля, которые используются в app.py
    email_confirmed = db.Column(db.Boolean, default=False)
    confirmation_token = db.Column(db.String(100), nullable=True)
    token_expiration = db.Column(db.DateTime, nullable=True)
    
    # Добавляем поле для хранения пути к аватарке
    avatar_path = db.Column(db.String(255), nullable=True)
    
    # Новое поле для хранения информации о пользователе
    bio = db.Column(db.String(500), nullable=True)
    
    # Определение отношения для контактов
    contacts = db.relationship('Contact', 
                              foreign_keys='Contact.user_id',
                              backref=db.backref('owner', lazy='joined'),
                              lazy='dynamic',
                              cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    # Метод для получения URL аватарки или стандартного аватара
    def get_avatar(self):
        if self.avatar_path:
            return self.avatar_path
        return None  # Вернется стандартный аватар с инициалами
    
    # Метод для авторизации пользователя
    @classmethod
    def authenticate(cls, email, password):
        user = cls.query.filter_by(email=email).first()
        if user and user.check_password(password):
            return user
        return None

# Модель для хранения контактов пользователей
class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Связь с пользователем-контактом
    contact_user = db.relationship('User', foreign_keys=[contact_id], lazy='joined')
    
    # Индекс для быстрого поиска и уникальности
    __table_args__ = (db.UniqueConstraint('user_id', 'contact_id', name='_user_contact_uc'),)