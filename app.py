from flask import Flask, json, request, render_template, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
import logging
import os

# Try to import git, but continue if it's not available
git_available = False
try:
    import git
    git_available = True
except ImportError:
    logging.warning("GitPython not installed. To use Git functionality, install with: pip install GitPython")

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)

# Убедитесь, что директория instance существует
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True)

# Инициализация приложения Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'ваш_секретный_ключ'  # Измените это в продакшне
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "chat.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация базы данных
from models.user import db, User
db.init_app(app)

# Функция для создания таблиц базы данных
def create_tables():
    try:
        db.create_all()
        # Создаем тестового пользователя, если его нет
        if not User.query.filter_by(email='test@example.com').first():
            test_user = User(name='Test User', email='test@example.com')
            test_user.set_password('password123')
            db.session.add(test_user)
            try:
                db.session.commit()
                logging.info('Тестовый пользователь создан')
            except Exception as e:
                db.session.rollback()
                logging.error(f'Ошибка при создании тестового пользователя: {str(e)}')
    except Exception as e:
        logging.error(f'Ошибка при создании таблиц базы данных: {str(e)}')

# Маршруты для автообновления PythonAnywhere
@app.route('/update_server', methods=['POST'])
def webhook():
    if request.method == 'POST':
        if not git_available:
            logging.error("Git functionality unavailable. Install GitPython with: pip install GitPython")
            return 'Git module not available', 500
        
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
    # Инициализация базы данных в контексте приложения
    with app.app_context():
        create_tables()
    
    # Устанавливаем host='0.0.0.0', чтобы приложение было доступно извне
    app.run(debug=True, host='0.0.0.0')