from flask import Flask, json, request, render_template, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
import logging
import os
from werkzeug.security import generate_password_hash, check_password_hash
from email_utils import generate_confirmation_token, send_confirmation_email, is_email_valid
import datetime

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
app.config['SERVER_NAME'] = 'localhost:5000'

# Добавляем SERVER_NAME для правильной генерации URL в письмах
# НЕ ИСПОЛЬЗУЙТЕ SERVER_NAME для работы с PythonAnywhere
if os.environ.get('FLASK_ENV') == 'production':
    # Не устанавливаем SERVER_NAME для продакшена
    pass
else:
    # Не устанавливаем SERVER_NAME для разработки
    pass

# Инициализация базы данных
from models.user import db, User
db.init_app(app)

# Функция для создания таблиц базы данных
from sqlalchemy import inspect

def create_tables():
    try:
        # Используем inspect для проверки существования таблицы
        inspector = inspect(db.engine)
        if 'user' in inspector.get_table_names():
            db.drop_all()  # Удаляем существующие таблицы

        db.create_all()  # Создаем таблицы

        # Создаем тестового пользователя, если его нет
        if not User.query.filter_by(email='test@example.com').first():
            test_user = User(username='Test User', email='test@example.com', password='password123')
            db.session.add(test_user)
            db.session.commit()
            logging.info('Тестовый пользователь создан')
    except Exception as e:
        db.session.rollback()
        logging.error(f'Ошибка при создании таблиц базы данных: {str(e)}')

# Маршруты для автообновления PythonAnywhere
@app.route('/update_server', methods=['POST'])
def webhook():
    if request.method == 'POST':
        if not git_available:
            logging.error("Git functionality unavailable. Install GitPython with: pip install GitPython")
            return 'Git module not available', 500
        
        try:
            # Используем абсолютный путь или более надежный относительный путь
            repo_path = os.path.abspath(os.path.dirname(__file__))
            repo = git.Repo(repo_path)
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
        email = request.form['email']
        password = request.form['password']
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            flash('Пользователь с таким email не найден', 'error')
            return redirect(url_for('login'))
        
        if not user.email_confirmed:
            flash('Пожалуйста, подтвердите ваш email перед входом в систему', 'error')
            return redirect(url_for('login'))
        
        # Исправление: используем правильный метод проверки пароля
        if user.check_password(password):
            # Успешная авторизация
            session['user_id'] = user.id
            session['user_name'] = user.name  # Добавляем имя в сессию
            return redirect(url_for('main'))
        else:
            flash('Неверный пароль', 'error')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            name = request.form['name']
            email = request.form['email']
            password = request.form['password']
            
            logging.info(f"Попытка регистрации пользователя с email: {email}")
            
            # Проверка существования пользователя
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                flash('Пользователь с таким email уже зарегистрирован', 'error')
                return redirect(url_for('register'))
            
            # Проверка валидности email
            if not is_email_valid(email):
                flash('Указан некорректный email адрес', 'error')
                return redirect(url_for('register'))
            
            # Генерация токена для подтверждения
            confirmation_token = generate_confirmation_token()
            token_expiration = datetime.datetime.now() + datetime.timedelta(days=1)
            
            # Создание нового пользователя
            new_user = User(
                name=name,
                email=email,
                email_confirmed=False,
                confirmation_token=confirmation_token,
                token_expiration=token_expiration
            )
            
            # Устанавливаем пароль правильно через метод
            new_user.set_password(password)
            
            logging.info("Сохранение нового пользователя в базу данных")
            
            db.session.add(new_user)
            db.session.commit()
            
            # Отправка письма с подтверждением
            result = send_confirmation_email(email, confirmation_token)
            if result:
                flash('Регистрация прошла успешно! Пожалуйста, проверьте ваш email для подтверждения аккаунта', 'success')
            else:
                logging.error(f"Не удалось отправить email на адрес {email}")
                flash('Возникла ошибка при отправке email. Пожалуйста, свяжитесь с администратором', 'error')
                
        except Exception as e:
            db.session.rollback()
            logging.error(f"Ошибка при регистрации: {str(e)}")
            flash(f'Ошибка при создании аккаунта: {str(e)}', 'error')
        
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/confirm-email/<token>')
def confirm_email(token):
    # Поиск пользователя по токену
    user = User.query.filter_by(confirmation_token=token).first()
    
    if not user:
        flash('Недействительная ссылка для подтверждения', 'error')
        return redirect(url_for('login'))
    
    # Проверка не истек ли срок действия токена
    if datetime.datetime.now() > user.token_expiration:
        flash('Срок действия ссылки для подтверждения истек', 'error')
        return redirect(url_for('login'))
    
    # Подтверждаем email
    user.email_confirmed = True
    user.confirmation_token = None
    user.token_expiration = None
    
    try:
        db.session.commit()
        flash('Ваш email успешно подтвержден! Теперь вы можете войти в систему', 'success')
    except:
        db.session.rollback()
        flash('Произошла ошибка при подтверждении email', 'error')
    
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    flash('Вы успешно вышли из системы', 'success')
    return redirect(url_for('login'))

@app.route('/main')
def main():
    if 'user_id' not in session:
        logging.debug("Сессия не содержит user_id, перенаправляем на логин")
        return redirect(url_for('login'))
    
    user = User.query.get(session['user_id'])
    if user is None:
        logging.debug("Пользователь не найден в базе данных, очищаем сессию")
        session.clear()
        flash('Ваша сессия была завершена, так как пользователь не найден в базе данных', 'info')
        return redirect(url_for('login'))
    
    logging.debug(f"Пользователь найден: {user.name}")
    return render_template('main.html')

# Добавим маршрут для проверки работоспособности
@app.route('/ping')
def ping():
    return 'pong'

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        logging.debug("Сессия не содержит user_id, перенаправляем на логин")
        return redirect(url_for('login'))
        
    user = User.query.get(session['user_id'])
    if not user:
        logging.debug("Пользователь не найден в базе данных")
        flash('Пользователь не найден', 'error')
        return redirect(url_for('login'))
        
    logging.debug(f"Профиль пользователя: {user.name}")
    return render_template('profile.html', user=user)

if __name__ == '__main__':
    # Инициализация базы данных в контексте приложения
    with app.app_context():
        create_tables()
    
    # Временно отключаем SERVER_NAME для локального запуска
    app.config.pop('SERVER_NAME', None)
    
    # Устанавливаем host='0.0.0.0', чтобы приложение было доступно извне
    app.run(debug=True, host='0.0.0.0')
else:
    # Для запуска через WSGI (PythonAnywhere)
    try:
        with app.app_context():
            logging.basicConfig(filename='/tmp/flask_app_error.log', level=logging.DEBUG)
            logging.info("Запускаем приложение через WSGI")
            try:
                # Проверяем существование таблиц и создаем если нужно
                if not db.engine.dialect.has_table(db.engine, 'user'):
                    create_tables()
                logging.info("Приложение успешно запущено на PythonAnywhere")
            except Exception as e:
                logging.error(f"Ошибка при запуске приложения: {str(e)}")
    except Exception as e:
        import traceback
        with open('/tmp/flask_startup_error.log', 'w') as f:
            f.write(f"Критическая ошибка: {str(e)}\n")
            f.write(traceback.format_exc())