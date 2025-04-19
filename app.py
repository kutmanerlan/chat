from flask import Flask, json, request, render_template, redirect, url_for, flash, session, jsonify, make_response
import logging
import os
from werkzeug.security import generate_password_hash, check_password_hash
from email_utils import generate_confirmation_token, send_confirmation_email, is_email_valid, send_reset_password_email
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

# Настройка SERVER_NAME
# Не используем app.config.pop() - это может вызвать KeyError, если ключа нет
# Вместо этого явно устанавливаем или не устанавливаем значение
if os.environ.get('FLASK_ENV') == 'production':
    # Для PythonAnywhere определяем SERVER_NAME из переменной окружения
    if 'PYTHONANYWHERE_HOST' in os.environ:
        app.config['SERVER_NAME'] = os.environ['PYTHONANYWHERE_HOST']
    # Иначе не устанавливаем SERVER_NAME для продакшена
else:
    # Для локальной разработки используем localhost:5000
    app.config['SERVER_NAME'] = 'localhost:5000'

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
            # Fix: Use 'name' parameter instead of 'username'
            test_user = User(name='Test User', email='test@example.com')
            # Set password using the set_password method
            test_user.set_password('password123')
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

# Новый маршрут для получения информации о текущем пользователе
@app.route('/get_current_user_info')
def get_current_user_info():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Запрашиваем актуальную информацию из базы данных
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Возвращаем актуальную информацию о пользователе
    return jsonify({
        'user_id': user.id,
        'user_name': user.name,
        'email': user.email,
        'avatar_path': user.avatar_path if user.avatar_path else None
    })

# Главный маршрут
@app.route('/')
def hello_world():
    if 'user_id' in session:
        return redirect(url_for('main'))  # Исправлено с 'dashboard' на 'main'
    return redirect(url_for('login'))

# Остальные маршруты
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        # Добавляем логирование для отладки
        logging.info(f"Попытка входа для email: {email}")
        
        # Определяем, является ли запрос AJAX-запросом
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        user = User.query.filter_by(email=email).first()
        if not user:
            logging.info(f"Пользователь с email {email} не найден")
            message = 'Пользователь с таким email не найден. Проверьте правильность ввода или зарегистрируйтесь.'
            
            if is_ajax:
                return jsonify({
                    'success': False,
                    'message': message
                })
            else:
                flash(message, 'error')
                return render_template('login.html')
                
        if not user.email_confirmed:
            message = 'Пожалуйста, подтвердите ваш email перед входом в систему'
            
            if is_ajax:
                return jsonify({
                    'success': False,
                    'message': message
                })
            else:
                flash(message, 'error')
                return redirect(url_for('login'))
                
        # Исправление: используем правильный метод проверки пароля
        if user.check_password(password):
            # Успешная авторизация
            session['user_id'] = user.id
            session['user_name'] = user.name  # Добавляем имя в сессию
            
            if is_ajax:
                return jsonify({
                    'success': True,
                    'redirect': url_for('main')
                })
            else:
                return redirect(url_for('main'))
        else:
            message = 'Неверный пароль'
            
            if is_ajax:
                return jsonify({
                    'success': False,
                    'message': message
                })
            else:
                flash(message, 'error')
                
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
    # Полностью очищаем всю сессию
    session.clear()
    
    # Для надежного удаления информации также удаляем cookies
    response = redirect(url_for('login'))
    # Установка cookie с уже истекшим сроком действия для его удаления
    response.set_cookie('session', '', expires=0)
    
    # Добавляем сообщение для пользователя
    flash('Вы успешно вышли из аккаунта', 'info')
    return response

@app.route('/main')
def main():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    # Проверяем, существует ли пользователь в базе данных
    user = User.query.get(session['user_id'])
    if user is None:
        # Пользователь не найден в базе, очищаем сессию
        session.clear()
        flash('Ваша сессия была завершена, так как пользователь не найден в базе данных', 'info')
        return redirect(url_for('login'))
        
    # Обновляем данные пользователя в сессии для уверенности
    session['user_name'] = user.name
    
    # Добавляем антикэширующие заголовки
    response = make_response(render_template('dashboard.html'))
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Добавим маршрут для проверки работоспособности
@app.route('/ping')
def ping():
    return 'pong'

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = User.query.get(session['user_id'])
    if not user:
        flash('Пользователь не найден', 'error')
        return redirect(url_for('login'))
    return render_template('profile.html', user=user)

# Маршрут для запроса сброса пароля
@app.route('/reset-password-request', methods=['GET', 'POST'])
def reset_password_request():
    if 'user_id' in session:
        return redirect(url_for('main'))
    
    # Выводим отладочную информацию при обработке запроса
    logging.info("Запрошена страница сброса пароля")
    
    # Определяем, является ли запрос AJAX-запросом
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        logging.info(f"Получен POST-запрос на сброс пароля для email: {email}")
        
        if not email:
            if is_ajax:
                return jsonify({
                    'success': False,
                    'message': 'Пожалуйста, введите email'
                })
            else:
                flash('Пожалуйста, введите email', 'error')
                return render_template('reset_password_request.html')
            
        if not is_email_valid(email):
            if is_ajax:
                return jsonify({
                    'success': False,
                    'message': 'Пожалуйста, введите корректный email'
                })
            else:
                flash('Пожалуйста, введите корректный email', 'error')
                return render_template('reset_password_request.html')
        
        user = User.query.filter_by(email=email).first()
        
        # Генерируем токен даже если пользователь не найден (для безопасности)
        reset_token = generate_confirmation_token()
        token_expiration = datetime.datetime.now() + datetime.timedelta(hours=1)
        
        if user:
            # Сохраняем токен в базе данных только для существующего пользователя
            user.confirmation_token = reset_token
            user.token_expiration = token_expiration
            
            try:
                db.session.commit()
                # Отправляем письмо с ссылкой на сброс пароля
                logging.info(f"Отправка письма для сброса пароля на {email}")
                result = send_reset_password_email(email, reset_token)
                
                if is_ajax:
                    return jsonify({
                        'success': True,
                        'message': 'Инструкции по сбросу пароля отправлены на ваш email'
                    })
                else:
                    if result:
                        logging.info(f"Письмо для сброса пароля успешно отправлено на {email}")
                        flash('Инструкции по сбросу пароля отправлены на ваш email', 'success')
                    else:
                        logging.error(f"Не удалось отправить письмо для сброса пароля на {email}")
                        flash('Произошла ошибка при отправке email. Пожалуйста, попробуйте позже.', 'error')
            except Exception as e:
                db.session.rollback()
                logging.error(f"Ошибка при сбросе пароля: {str(e)}")
                
                if is_ajax:
                    return jsonify({
                        'success': False,
                        'message': 'Произошла ошибка. Пожалуйста, попробуйте позже.'
                    })
                else:
                    flash('Произошла ошибка. Пожалуйста, попробуйте позже.', 'error')
        else:
            # Для безопасности не сообщаем, существует ли пользователь
            if is_ajax:
                return jsonify({
                    'success': True,
                    'message': 'Если указанный email зарегистрирован в системе, вы получите инструкции по сбросу пароля'
                })
            else:
                flash('Если указанный email зарегистрирован в системе, вы получите инструкции по сбросу пароля', 'info')
        
        if not is_ajax:
            return redirect(url_for('login'))
    
    # Только для GET запросов отдаем HTML-шаблон
    if request.method == 'GET':
        logging.info("Отдаем шаблон reset_password_request.html")
        return render_template('reset_password_request.html')
    
    # Для всех других случаев отдаем JSON-ответ для AJAX
    return jsonify({
        'success': True,
        'message': 'Обработка запроса сброса пароля'
    })

# Маршрут для непосредственного сброса пароля
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if 'user_id' in session:
        return redirect(url_for('main'))
    
    # Проверка токена
    user = User.query.filter_by(confirmation_token=token).first()
    if not user or datetime.datetime.now() > user.token_expiration:
        flash('Ссылка для сброса пароля недействительна или срок её действия истек', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        
        if not password:
            flash('Пожалуйста, введите новый пароль', 'error')
            return render_template('reset_password.html', token=token)
        
        if password != confirm_password:
            flash('Пароли не совпадают', 'error')
            return render_template('reset_password.html', token=token)
        
        # Обновляем пароль
        user.set_password(password)
        user.confirmation_token = None
        user.token_expiration = None
        
        try:
            db.session.commit()
            flash('Ваш пароль успешно изменен. Теперь вы можете войти в систему.', 'success')
        except Exception as e:
            db.session.rollback()
            logging.error(f"Ошибка при обновлении пароля: {str(e)}")
            flash('Произошла ошибка при обновлении пароля.', 'error')
        
        return redirect(url_for('login'))
    
    return render_template('reset_password.html', token=token)

# Импортируем необходимые библиотеки для работы с файлами
from werkzeug.utils import secure_filename

# Добавляем конфигурацию для загрузки файлов
UPLOAD_FOLDER = os.path.join(basedir, 'static', 'avatars')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Создаем папку для загрузок, если её нет
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Функция для проверки разрешенных расширений файлов
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Маршрут для загрузки аватарки
@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    # Проверяем, есть ли файл в запросе
    if 'avatar' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'})
    
    file = request.files['avatar']
    
    # Если пользователь не выбрал файл
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'})
    
    # Если файл есть и имеет допустимое расширение
    if file and allowed_file(file.filename):
        # Безопасно сохраняем имя файла
        filename = secure_filename(file.filename)
        # Добавляем user_id к имени файла для уникальности
        filename = f"user_{session['user_id']}_{filename}"
        
        # Путь для сохранения
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Сохраняем файл
        file.save(filepath)
        
        # Получаем пользователя и обновляем путь к аватарке
        user = User.query.get(session['user_id'])
        if user:
            # Относительный путь для URL
            relative_path = os.path.join('static', 'avatars', filename).replace('\\', '/')
            user.avatar_path = relative_path
            
            try:
                db.session.commit()
                return jsonify({
                    'success': True, 
                    'avatar_path': relative_path,
                    'message': 'Avatar uploaded successfully'
                })
            except Exception as e:
                db.session.rollback()
                logging.error(f"Error updating avatar: {str(e)}")
                return jsonify({'success': False, 'error': 'Database error'})
        
        return jsonify({'success': False, 'error': 'User not found'})
    
    return jsonify({'success': False, 'error': 'File type not allowed'})

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