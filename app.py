from flask import Flask, json, request, render_template, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
import logging
import os
import git

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)

# Инициализация приложения Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'ваш_секретный_ключ'  # Измените это в продакшне
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация базы данных
from models.user import db, User
db.init_app(app)

# Создание таблиц базы данных
@app.before_first_request
def create_tables():
    db.create_all()

# Маршруты для автообновления PythonAnywhere
@app.route('/update_server', methods=['POST'])
def webhook():
    if request.method == 'POST':
        try:
            repo = git.Repo("chat")
            origin = repo.remotes.origin
            origin.pull()
            return 'Updated PythonAnywhere successfully', 200
        except Exception as e:
            logging.error(f"Error during pull: {str(e)}")
            return 'Update failed', 500
    return 'Method not allowed', 405

# Главный маршрут
@app.route('/')
def hello_world():
    if 'user_id' in session:
        return redirect(url_for('main'))
    return redirect(url_for('login'))

# Маршруты авторизации
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['user_name'] = user.name
            return redirect(url_for('main'))
        else:
            flash('Неверный email или пароль')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Проверка существования пользователя
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Email уже зарегистрирован')
            return render_template('register.html')
            
        # Создание нового пользователя
        new_user = User(name=name, email=email)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Регистрация успешна! Пожалуйста, войдите.')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    return redirect(url_for('login'))

@app.route('/main')
def main():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('main.html')

if __name__ == '__main__':
    app.run(debug=True)