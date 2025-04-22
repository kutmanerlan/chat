from flask import Flask, json, request, render_template, redirect, url_for, flash, session, jsonify, make_response
import logging
import os
from werkzeug.security import generate_password_hash, check_password_hash
from email_utils import generate_confirmation_token, send_confirmation_email, is_email_valid, send_reset_password_email
import datetime
from sqlalchemy import func, or_, and_  # Add missing SQLAlchemy imports

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
app.jinja_env.globals.update(hasattr=hasattr)
app.config['SECRET_KEY'] = 'ваш_секретный_ключ'  # Измените это в продакшне
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "chat.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Настройка SERVER_NAME
# Не используем app.config.pop() - это может вызвать KeyError, если ключа нет
# Вместо этого явно устанавливаем или не устанавливаем значение
if os.environ.get('FLASK_ENV') == 'production':
    # Для PythonAnywhere определяем SERVER_NAME из переменной окружения
    if 'PYTHONANYWHERE_HOST' in os.environ:  # Fixed 'ос' to 'os'
        app.config['SERVER_NAME'] = os.environ['PYTHONANYWHERE_HOST']
    # Иначе не устанавливаем SERVER_NAME для продакшена
else:
    # Для локальной разработки используем localhost:5000
    app.config['SERVER_NAME'] = 'localhost:5000'

# Инициализация базы данных
from models.user import db, User, Contact, Message, Block, DeletedChat  # Ensure DeletedChat is imported
db.init_app(app)

# Функция для создания таблиц базы данных
from sqlalchemy import inspect, text
def create_tables():
    try:
        logging.info("Начало проверки и обновления схемы базы данных")
        # Используем inspect для проверки существования таблицы
        inspector = inspect(db.engine)
        
        # Проверяем, существует ли таблица user
        if 'user' not in inspector.get_table_names():
            logging.info("Таблица user не найдена. Создаем таблицы...")
            # Если таблицы нет, создаем её
            db.create_all()
            logging.info('Таблицы созданы')
            
            # Создаем тестового пользователя
            if not User.query.filter_by(email='test@example.com').first():
                test_user = User(name='Test User', email='test@example.com')
                test_user.set_password('password123')
                db.session.add(test_user)
                db.session.commit()
                logging.info('Тестовый пользователь создан')
        else:
            logging.info("Таблица user существует. Проверяем наличие колонки avatar_path...")
            # Если таблица существует, проверяем наличие новых колонок
            columns = [column['name'] for column in inspector.get_columns('user')]
            
            # Проверяем, есть ли колонка avatar_path
            if 'avatar_path' not in columns:
                logging.info('Добавляем колонку avatar_path в таблицу user')
                try:
                    # Используем raw SQL для добавления колонки (безопаснее через try/except)
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE user ADD COLUMN avatar_path VARCHAR(255)"))
                        connection.commit()
                    logging.info('Колонка avatar_path успешно добавлена')
                except Exception as column_error:
                    logging.error(f"Ошибка при добавлении колонки: {str(column_error)}")
                    # Продолжаем работу даже если колонка не добавлена
            
            # Проверяем, есть ли колонка bio
            if 'bio' not in columns:
                logging.info('Добавляем колонку bio в таблицу user')
                try:
                    # Используем raw SQL для добавления колонки
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE user ADD COLUMN bio VARCHAR(500)"))
                        connection.commit()
                    logging.info('Колонка bio успешно добавлена')
                except Exception as column_error:
                    logging.error(f"Ошибка при добавлении колонки bio: {str(column_error)}")
        
        # Проверяем, существует ли таблица contact
        if 'contact' not in inspector.get_table_names():
            logging.info("Таблица contact не найдена. Создаем...")
            # Если таблица не существует, создаем её
            db.create_all()
            logging.info('Таблица contact создана')
            
        # Check if message table exists
        if 'message' in inspector.get_table_names():
            logging.info("Проверяем наличие новых колонок в таблице message...")
            message_columns = [column['name'] for column in inspector.get_columns('message')]
            
            # Check for is_edited column
            if 'is_edited' not in message_columns:
                logging.info('Adding is_edited column to message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE message ADD COLUMN is_edited BOOLEAN DEFAULT FALSE"))
                        connection.commit()
                    logging.info('is_edited column added successfully')
                except Exception as column_error:
                    logging.error(f"Error adding is_edited column: {str(column_error)}")
            
            # Check for edited_at column
            if 'edited_at' not in message_columns:
                logging.info('Adding edited_at column to message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE message ADD COLUMN edited_at TIMESTAMP"))
                        connection.commit()
                    logging.info('edited_at column added successfully')
                except Exception as column_error:
                    logging.error(f"Error adding edited_at column: {str(column_error)}")
        
        # Check if block table exists
        if 'block' not in inspector.get_table_names():
            logging.info("Таблица block не найдена. Создаем...")
            # Create the block table
            db.create_all()
            logging.info('Таблица block создана')
        
        logging.info("Схема базы данных проверена и обновлена")
        return True
    except Exception as e:
        db.session.rollback()
        logging.error(f'Ошибка при обновлении схемы базы данных: {str(e)}')
        return False

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
    
    try:
        # Запрашиваем актуальную информацию из базы данных
        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Проверяем наличие атрибута avatar_path безопасным способом
        avatar_path = None
        try:
            if hasattr(user, 'avatar_path') and user.avatar_path:
                avatar_path = user.avatar_path
        except Exception as avatar_error:
            logging.warning(f"Ошибка при получении avatar_path: {str(avatar_error)}")
        
        # Возвращаем актуальную информацию о пользователе
        return jsonify({
            'user_id': user.id,
            'user_name': user.name,
            'email': user.email,
            'avatar_path': avatar_path,
            'bio': user.bio if hasattr(user, 'bio') else None
        })
    except Exception as e:
        logging.error(f"Ошибка в get_current_user_info: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Новый маршрут для поиска пользователей
@app.route('/search_users', methods=['GET'])
def search_users():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    query = request.args.get('query', '').strip()
    
    if not query or len(query) < 2:
        return jsonify({'users': []})
    
    try:
        # Поиск пользователей по имени (частичное совпадение)
        # Исключаем текущего пользователя из результатов
        users = User.query.filter(
            User.name.ilike(f'%{query}%'),
            User.id != session['user_id']
        ).limit(10).all()
        
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'name': user.name,
                'avatar_path': user.avatar_path if hasattr(user, 'avatar_path') else None,
                'bio': user.bio if hasattr(user, 'bio') else None
            })
        
        return jsonify({'users': results})
    except Exception as e:
        logging.error(f"Ошибка при поиске пользователей: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Маршрут для получения информации о пользователе
@app.route('/get_user_info')
def get_user_info():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400
    
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        return jsonify({
            'id': user.id,
            'name': user.name,
            'avatar_path': user.avatar_path if hasattr(user, 'avatar_path') else None,
            'bio': user.bio if hasattr(user, 'bio') else None
        })
    except Exception as e:
        logging.error(f"Ошибка при получении информации о пользователе: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Маршрут для проверки, является ли пользователь контактом
@app.route('/check_contact', methods=['POST'])
def check_contact():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        contact_id = data.get('contact_id')
        
        if not contact_id:
            return jsonify({'error': 'Contact ID is required'}), 400
        
        # Проверяем, добавлен ли пользователь уже в контакты
        existing_contact = Contact.query.filter_by(
            user_id=session['user_id'],
            contact_id=contact_id
        ).first()
        
        return jsonify({
            'is_contact': existing_contact is not None
        })
    except Exception as e:
        logging.error(f"Ошибка при проверке контакта: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Маршрут для удаления пользователя из контактов
@app.route('/remove_contact', methods=['POST'])
def remove_contact():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        contact_id = data.get('contact_id')
        
        if not contact_id:
            return jsonify({'error': 'Contact ID is required'}), 400
        
        # Проверяем, существует ли пользователь
        contact_user = User.query.get(contact_id)
        if not contact_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Удаляем контакт если он существует
        contact = Contact.query.filter_by(
            user_id=session['user_id'],
            contact_id=contact_id
        ).first()
        
        if contact:
            db.session.delete(contact)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Contact removed successfully'
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Ошибка при удалении контакта: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

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
            if (existing_user):
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
    
    # Добавляем аватар в сессию, если он существует
    if hasattr(user, 'avatar_path') and user.avatar_path:
        session['avatar_path'] = user.avatar_path
    
    # Добавляем антикэширующие заголовки
    response = make_response(render_template('dashboard.html', user=user))
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
    
    try:
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
            
            # Создаем папку, если её нет
            try:
                if not os.path.exists(app.config['UPLOAD_FOLDER']):
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    logging.info(f"Создана папка для аватаров: {app.config['UPLOAD_FOLDER']}")
            except Exception as mkdir_error:
                logging.error(f"Ошибка при создании папки для аватаров: {str(mkdir_error)}")
                return jsonify({'success': False, 'error': 'Upload directory error'})
            
            # Путь для сохранения
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Сохраняем файл
            try:
                file.save(filepath)
                logging.info(f"Файл сохранен: {filepath}")
            except Exception as save_error:
                logging.error(f"Ошибка при сохранении файла: {str(save_error)}")
                return jsonify({'success': False, 'error': 'File save error'})
            
            # Получаем пользователя и обновляем путь к аватарке
            user = User.query.get(session['user_id'])
            if user:
                try:
                    # Проверяем, есть ли атрибут avatar_path
                    if not hasattr(user, 'avatar_path'):
                        logging.warning('Колонка avatar_path отсутствует в модели User')
                        return jsonify({'success': False, 'error': 'Schema error'})
                    
                    # Относительный путь для URL
                    relative_path = os.path.join('static', 'avatars', filename).replace('\\', '/')
                    user.avatar_path = relative_path
                    
                    db.session.commit()
                    logging.info(f"Обновлен avatar_path для пользователя {user.id}: {relative_path}")
                    return jsonify({
                        'success': True, 
                        'avatar_path': relative_path,
                        'message': 'Avatar uploaded successfully'
                    })
                except Exception as db_error:
                    db.session.rollback()
                    logging.error(f"Ошибка при обновлении в БД: {str(db_error)}")
                    return jsonify({'success': False, 'error': 'Database error'})
            
            return jsonify({'success': False, 'error': 'User not found'})
        
        return jsonify({'success': False, 'error': 'File type not allowed'})
    except Exception as e:
        logging.error(f"Неожиданная ошибка в upload_avatar: {str(e)}")
        return jsonify({'success': False, 'error': 'Server error'})

# Добавляем маршрут для обновления информации о пользователе
@app.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    try:
        # Получаем данные из формы
        name = request.form.get('name', '').strip()
        bio = request.form.get('bio', '').strip()
        
        # Проверяем корректность данных
        if not name:
            return jsonify({'success': False, 'error': 'Имя не может быть пустым'}), 400
        
        # Получаем пользователя из БД
        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'success': False, 'error': 'Пользователь не найден'}), 404
        
        # Обновляем данные
        user.name = name
        user.bio = bio
        
        # Сохраняем в БД
        try:
            db.session.commit()
            
            # Обновляем данные в сессии
            session['user_name'] = user.name
            
            return jsonify({
                'success': True,
                'user_name': user.name,
                'bio': user.bio or 'Нет информации',
                'avatar_path': user.avatar_path  # Make sure to include the avatar path
            })
        except Exception as db_error:
            db.session.rollback()
            logging.error(f"Ошибка при обновлении профиля в БД: {str(db_error)}")
            return jsonify({'success': False, 'error': 'Ошибка базы данных'}), 500
            
    except Exception as e:
        logging.error(f"Неожиданная ошибка в update_profile: {str(e)}")
        return jsonify({'success': False, 'error': 'Ошибка сервера'}), 500

# Маршрут для получения списка контактов пользователя
@app.route('/get_contacts')
def get_contacts():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    try:
        # Получаем все контакты текущего пользователя
        contacts_query = Contact.query.filter_by(user_id=session['user_id']).all()
        
        contacts = []
        for contact in contacts_query:
            contact_user = contact.contact_user
            contact_data = {
                'id': contact_user.id,
                'name': contact_user.name,
                'bio': contact_user.bio if hasattr(contact_user, 'bio') else None,
                'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None
            }
            contacts.append(contact_data)
        
        return jsonify({
            'success': True,
            'contacts': contacts
        })
    except Exception as e:
        logging.error(f"Ошибка при получении контактов: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to retrieve contacts'}), 500

# Маршрут для получения списка чатов пользователя
@app.route('/get_chat_list')
def get_chat_list():
    """Get list of users the current user has chats with"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'})
    
    current_user_id = session['user_id']
    
    try:
        # Log the request for debugging
        app.logger.info(f"User {current_user_id} requesting chat list")
        
        # SIMPLIFIED QUERY APPROACH:
        # 1. First get ALL users who have exchanged messages with the current user
        message_partners_query = db.session.query(
            User
        ).filter(
            User.id != current_user_id,
            or_(
                and_(
                    Message.sender_id == User.id,
                    Message.recipient_id == current_user_id
                ),
                and_(
                    Message.recipient_id == User.id,
                    Message.sender_id == current_user_id
                )
            )
        ).distinct()
        
        # Get the list of deleted chat user IDsn't want to filter these anymore
        deleted_chat_ids_query = db.session.query(ng by deleted status
            DeletedChat.chat_with_user_idrs_query.all()
        ).filter(
            DeletedChat.user_id == current_user_idr
        )pp.logger.info(f"Found {len(message_partners)} chat partners for user {current_user_id}")
        deleted_chat_ids = [row[0] for row in deleted_chat_ids_query.all()]
        # Prepare the chat list
        # Filter out deleted chats - do this in Python rather than complex SQL
        message_partners = [
            user for user in message_partners_query.all() 
            if user.id not in deleted_chat_ids
        ]   Contact.contact_id
        ).filter(
        # Log how many users we found for this user
        app.logger.info(f"Found {len(message_partners)} chat partners for user {current_user_id}")
        contact_ids = [row[0] for row in contact_ids_query.all()]
        # Prepare the chat list
        chat_list = []atus
        blocked_ids_query = db.session.query(
        # Get contact statuser_id
        contact_ids_query = db.session.query(
            Contact.contact_idurrent_user_id
        ).filter(
            Contact.user_id == current_user_ided_ids_query.all()]
        )
        contact_ids = [row[0] for row in contact_ids_query.all()]
            Block.user_id
        # Get block status
        blocked_ids_query = db.session.query(user_id
            Block.blocked_user_id
        ).filter(y_ids = [row[0] for row in blocked_by_ids_query.all()]
            Block.user_id == current_user_id
        ) Process each chat partner
        blocked_ids = [row[0] for row in blocked_ids_query.all()]
            # Get last message
        blocked_by_ids_query = db.session.query(y(
            Block.user_id
        ).filter(ter(
            Block.blocked_user_id == current_user_id
        )           and_(Message.sender_id == current_user_id, Message.recipient_id == user.id),
        blocked_by_ids = [row[0] for row in blocked_by_ids_query.all()]ge.sender_id == user.id)
                )
        # Process each chat partnerstamp.desc()).first()
        for user in message_partners:
            # Get last messageges were found (shouldn't happen, but just to be safe)
            last_message_query = db.session.query(
                Messagee
            ).filter(
                or_(unread messages
                    and_(Message.sender_id == current_user_id, Message.recipient_id == user.id),
                    and_(Message.recipient_id == current_user_id, Message.sender_id == user.id)
                )ter(
            ).order_by(Message.timestamp.desc()).first()
                Message.recipient_id == current_user_id,
            # In case no messages were found (shouldn't happen, but just to be safe)
            if not last_message_query:
                continue
                d chat to the list
            # Count unread messages
            unread_count_query = db.session.query(
                func.count(Message.id)
            ).filter(ar_path': user.avatar_path,
                Message.sender_id == user.id,query.content,
                Message.recipient_id == current_user_id,timestamp.isoformat(),
                Message.is_read == Falseount_query,
            ).scalar()ntact': user.id in contact_ids,
                'is_blocked_by_you': user.id in blocked_ids,
            # Add chat to the list user.id in blocked_by_ids
            chat_list.append({
                'user_id': user.id,
                'name': user.name,e
                'avatar_path': user.avatar_path,sage_time'], reverse=True)
                'last_message': last_message_query.content,
                'last_message_time': last_message_query.timestamp.isoformat(),
                'unread_count': unread_count_query,
                'is_contact': user.id in contact_ids,
                'is_blocked_by_you': user.id in blocked_ids,)
                'has_blocked_you': user.id in blocked_by_ids
            })
            я получения списка чатов пользователя
        # Sort by last message timeeted')
        chat_list.sort(key=lambda x: x['last_message_time'], reverse=True)
        user_id' not in session:
        return jsonify({'success': True, 'chats': chat_list})d in'})
    
    except Exception as e:ion['user_id']
        app.logger.error(f"Error in get_chat_list: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
        # Get the list of users the current user has deleted chats with
# Маршрут для получения списка чатов пользователяby(user_id=current_user_id).with_entities(DeletedChat.chat_with_user_id).all()
@app.route('/get_chat_list_with_deleted')h_user_id for chat in deleted_chats]
def get_chat_list_filtered():
    if 'user_id' not in session:nversations with the current user
        return jsonify({'success': False, 'error': 'Not logged in'})ats
        users_with_conversations = db.session.query(User).join(
    current_user_id = session['user_id']
            or_(
    try:        and_(Message.sender_id == User.id, Message.recipient_id == current_user_id),
        # Get the list of users the current user has deleted chats with == current_user_id)
        deleted_chats = DeletedChat.query.filter_by(user_id=current_user_id).with_entities(DeletedChat.chat_with_user_id).all()
        deleted_user_ids = [chat.chat_with_user_id for chat in deleted_chats]er_ids)).distinct().all()
        
        # Get users that have conversations with the current user
        # Filter out users with whom the current user has deleted chats()
        users_with_conversations = db.session.query(User).join(ts]
            Message, 
            or_(ocks
                and_(Message.sender_id == User.id, Message.recipient_id == current_user_id),
                and_(Message.recipient_id == User.id, Message.sender_id == current_user_id)
            )
        ).filter(User.id != current_user_id).filter(User.id.notin_(deleted_user_ids)).distinct().all()
        blocked_by_ids = [block.user_id for blocks in blocks_received]
        # Get contacts of the current user
        contacts = Contact.query.filter_by(user_id=current_user_id).all()
        contact_ids = [contact.contact_id for contact in contacts]
        
        # Get blocksusers_with_conversations:
        blocks_made = Block.query.filter_by(user_id=current_user_id).all()
        blocks_received = Block.query.filter_by(blocked_user_id=current_user_id).all()
                or_(
        blocked_ids = [block.blocked_user_id for blocks in blocks_made]recipient_id == user.id),
        blocked_by_ids = [block.user_id for blocks in blocks_received]age.sender_id == user.id)
                )
        # Prepare chat listage.timestamp.desc()).first()
        chat_list = []
            # Count unread messages
        for user in users_with_conversations:er_by(
            # Get the last message between the users
            last_message = Message.query.filter(
                or_(ead=False
                    and_(Message.sender_id == current_user_id, Message.recipient_id == user.id),
                    and_(Message.recipient_id == current_user_id, Message.sender_id == user.id)
                ) user to chat list
            ).order_by(Message.timestamp.desc()).first()
                'user_id': user.id,
            # Count unread messages
            unread_count = Message.query.filter_by(
                sender_id=user.id,st_message.content if last_message else '',
                recipient_id=current_user_id,sage.timestamp.isoformat() if last_message else '',
                is_read=False': unread_count,
            ).count()ontact': user.id in contact_ids,
                'is_blocked_by_you': user.id in blocked_ids,
            # Add user to chat listuser.id in blocked_by_ids
            chat_list.append({
                'user_id': user.id,
                'name': user.name,e
                'avatar_path': user.avatar_path,sage_time'], reverse=True)
                'last_message': last_message.content if last_message else '',
                'last_message_time': last_message.timestamp.isoformat() if last_message else '',
                'unread_count': unread_count,
                'is_contact': user.id in contact_ids,
                'is_blocked_by_you': user.id in blocked_ids,
                'has_blocked_you': user.id in blocked_by_ids
            })
        т для добавления пользователя в контакты
        # Sort by last message time['POST'])
        chat_list.sort(key=lambda x: x['last_message_time'], reverse=True)
        user_id' not in session:
        return jsonify({'success': True, 'chats': chat_list})
    
    except Exception as e:
        logging.error(f"Error getting chat list: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
        
# Маршрут для добавления пользователя в контакты
@app.route('/add_contact', methods=['POST'])t ID is required'}), 400
def add_contact():
    if 'user_id' not in session:ли пользователь
        return jsonify({'error': 'Unauthorized'}), 401
        if not contact_user:
    try:    return jsonify({'error': 'User not found'}), 404
        data = request.get_json()
        contact_id = data.get('contact_id')атель добавить сам себя
        if int(contact_id) == session['user_id']:
        if not contact_id:({'error': 'Cannot add yourself as a contact'}), 400
            return jsonify({'error': 'Contact ID is required'}), 400
        # Проверяем, не добавлен ли уже этот контакт
        # Проверяем, существует ли пользователь_by(
        contact_user = User.query.get(contact_id)
        if not contact_user:ct_id
            return jsonify({'error': 'User not found'}), 404
        
        # Проверяем, не пытается ли пользователь добавить сам себя
        if int(contact_id) == session['user_id']:пех (идемпотентность)
            return jsonify({'error': 'Cannot add yourself as a contact'}), 400
                'success': True,
        # Проверяем, не добавлен ли уже этот контакт
        existing_contact = Contact.query.filter_by(
            user_id=session['user_id'],id,
            contact_id=contact_idct_user.name,
        ).first()   'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
                    'bio': contact_user.bio if hasattr(contact_user, 'bio') else None
        if existing_contact:
            # Контакт уже добавлен, возвращаем успех (идемпотентность)
            return jsonify({
                'success': True,онтакта
                'message': 'Contact already exists',
                'contact': {'user_id'],
                    'id': contact_user.id,
                    'name': contact_user.name,
                    'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
                    'bio': contact_user.bio if hasattr(contact_user, 'bio') else None
                }n.commit()
            })
        return jsonify({
        # Создаем новую запись контакта
        new_contact = Contact(t added successfully',
            user_id=session['user_id'],
            contact_id=contact_idr.id,
        )       'name': contact_user.name,
                'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
        db.session.add(new_contact).bio if hasattr(contact_user, 'bio') else None
        db.session.commit()
        })
        return jsonify({e:
            'success': True,)
            'message': 'Contact added successfully',та: {str(e)}")
            'contact': {'error': 'Server error'}), 500
                'id': contact_user.id,
                'name': contact_user.name,
                'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
                'bio': contact_user.bio if hasattr(contact_user, 'bio') else None
            }id' not in session:
        })turn jsonify({'success': False, 'error': 'Not logged in'}), 401
    except Exception as e:
        db.session.rollback()
        logging.error(f"Ошибка при добавлении контакта: {str(e)}")
        return jsonify({'error': 'Server error'}), 500
        content = data.get('content')
# Route for sending a message
@app.route('/send_message', methods=['POST'])
def send_message():jsonify({'success': False, 'error': 'Missing required fields'}), 400
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'}), 401
        recipient = User.query.get(recipient_id)
    try:if not recipient:
        data = request.get_json()ess': False, 'error': 'Recipient not found'}), 404
        recipient_id = data.get('recipient_id')
        content = data.get('content')ocked the other
        blocked_by_sender = Block.query.filter_by(
        if not recipient_id or not content:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        ).first()
        # Verify the recipient exists
        recipient = User.query.get(recipient_id)r_by(
        if not recipient:ient_id,
            return jsonify({'success': False, 'error': 'Recipient not found'}), 404
        ).first()
        # Check if either user has blocked the other
        blocked_by_sender = Block.query.filter_by(
            user_id=session['user_id'],False, 'error': 'You cannot send messages to this user because you have blocked them'}), 403
            blocked_user_id=recipient_id
        ).first()d_by_recipient:
            return jsonify({'success': False, 'error': 'You cannot send messages to this user because they have blocked you'}), 403
        blocked_by_recipient = Block.query.filter_by(
            user_id=recipient_id,
            blocked_user_id=session['user_id']
        ).first()r_id=session['user_id'],
            recipient_id=recipient_id,
        if blocked_by_sender:
            return jsonify({'success': False, 'error': 'You cannot send messages to this user because you have blocked them'}), 403
        )
        if blocked_by_recipient:
            return jsonify({'success': False, 'error': 'You cannot send messages to this user because they have blocked you'}), 403
        db.session.commit()
        # Create new message
        new_message = Message(sage data
            sender_id=session['user_id'],
            recipient_id=recipient_id,
            content=content,essage.to_dict()
            is_read=False
        )t Exception as e:
        db.session.rollback()
        db.session.add(new_message)ng message: {str(e)}")
        db.session.commit()ccess': False, 'error': 'Server error'}), 500
        
        # Return formatted message dataween two users
        return jsonify({s')
            'success': True,
            'message': new_message.to_dict()
        })essage_id = request.args.get('last_message_id', 0, type=int)
    except Exception as e:t('page', 1, type=int)
        db.session.rollback()'limit', 30, type=int)  # Default to 30 messages per page
        logging.error(f"Error sending message: {str(e)}")
        return jsonify({'success': False, 'error': 'Server error'}), 500
    if limit > 50:
# Route for getting message history between two users
@app.route('/get_messages')
def get_messages():
    user_id = request.args.get('user_id') 'error': 'User ID is required'})
    last_message_id = request.args.get('last_message_id', 0, type=int)
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)  # Default to 30 messages per page
    
    # Cap the limit to prevent performance issues
    if limit > 50:
        limit = 50
        # Get block status
    if not user_id: = Block.query.filter(
        return jsonify({'success': False, 'error': 'User ID is required'})= user_id)) |
            ((Block.user_id == user_id) & (Block.blocked_user_id == current_user_id))
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'})
        # Get messages - only new ones if last_message_id is provided
    current_user_id = session['user_id']
            (
    try:        (Message.sender_id == current_user_id) & 
        # Get block statusecipient_id == user_id)
        block_query = Block.query.filter(
            ((Block.user_id == current_user_id) & (Block.blocked_user_id == user_id)) |
            ((Block.user_id == user_id) & (Block.blocked_user_id == current_user_id))
        ).first()Message.recipient_id == current_user_id)
            )
        # Get messages - only new ones if last_message_id is provided
        query = Message.query.filter(
            (st_message_id > 0:
                (Message.sender_id == current_user_id) & e_id is provided
                (Message.recipient_id == user_id)t_message_id)
            ) | 
            ( Apply pagination for regular message loads
                (Message.sender_id == user_id) & fset for pagination
                (Message.recipient_id == current_user_id)())
            )
        )   # Calculate offset
            offset = (page - 1) * limit
        if last_message_id > 0:t(offset).limit(limit)
            # Filter for only new messages if last_message_id is provided
            query = query.filter(Message.id > last_message_id)
        else:st_message_id > 0:
            # Apply pagination for regular message loads
            # Order by most recent first, then offset for pagination
            query = query.order_by(Message.timestamp.desc())
            # For pagination - get messages and reverse to chronological order
            # Calculate offsetll()
            offset = (page - 1) * limit# Reverse the list
            query = query.offset(offset).limit(limit)
        # Convert messages to dict format
        # Get messages [message.to_dict() for message in messages]
        if last_message_id > 0:
            # For polling - keep in chronological order
            messages = query.order_by(Message.timestamp).all()
        else:f message.recipient_id == current_user_id and not message.is_read:
            # For pagination - get messages and reverse to chronological order
            messages = query.all()
            messages = messages[::-1]  # Reverse the list
        
        # Convert messages to dict format
        message_list = [message.to_dict() for message in messages]
            'messages': message_list,
        # Mark received messages as read
        for message in messages:age_list) >= limit
            if message.recipient_id == current_user_id and not message.is_read:
                message.is_read = True
        pt Exception as e:
        db.session.commit()or getting messages: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
        return jsonify({
            'success': True,onversations (users you've messaged with)
            'messages': message_list,')
            'page': page,ons():
            'has_more': len(message_list) >= limit
        })turn jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
    except Exception as e:
        logging.error(f"Error getting messages: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
        # Get users this user has exchanged messages with
# Route for getting recent conversations (users you've messaged with) them and the current user
@app.route('/get_recent_conversations')
def get_recent_conversations():, u.avatar_path, u.bio, m.content as last_message, m.timestamp, 
    if 'user_id' not in session:(*) FROM message 
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401_read = 0) as unread_count
            FROM user u
    try:    JOIN (
        user_id = session['user_id']
                    CASE 
        # Get users this user has exchanged messages withcipient_id 
        # This query finds all users where there are messages between them and the current user
        query = """ END as user_id,
            SELECT u.id, u.name, u.avatar_path, u.bio, m.content as last_message, m.timestamp, 
                   (SELECT count(*) FROM message 
                    WHERE sender_id = u.id AND recipient_id = :user_id AND is_read = 0) as unread_count
            FROM user uY user_id
            JOIN (st ON latest.user_id = u.id
                SELECT e m ON ((m.sender_id = u.id AND m.recipient_id = :user_id) OR 
                    CASE      (m.sender_id = :user_id AND m.recipient_id = u.id)) 
                        WHEN sender_id = :user_id THEN recipient_id 
                        ELSE sender_id 
                    END as user_id,
                    MAX(timestamp) as max_time
                FROM messageexecute(text(query), {'user_id': user_id})
                WHERE sender_id = :user_id OR recipient_id = :user_id
                GROUP BY user_id
            ) latest ON latest.user_id = u.id
            JOIN message m ON ((m.sender_id = u.id AND m.recipient_id = :user_id) OR 
                              (m.sender_id = :user_id AND m.recipient_id = u.id)) 
                         AND m.timestamp = latest.max_time
            ORDER BY m.timestamp DESC
        """     'avatar_path': row.avatar_path,
                'bio': row.bio,
        result = db.session.execute(text(query), {'user_id': user_id})
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
        conversations = []unt': row.unread_count
        for row in result:
            # Format the data for the frontend
            conversations.append({
                'user_id': row.id,
                'name': row.name,ersations
                'avatar_path': row.avatar_path,
                'bio': row.bio,
                'last_message': row.last_message,ersations: {str(e)}")
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                'unread_count': row.unread_count
            })ute for editing messages
        te('/edit_message', methods=['POST'])
        return jsonify({
            'success': True,ion:
            'conversations': conversationsized'}), 401
        })
    except Exception as e:
        logging.error(f"Error getting recent conversations: {str(e)}")
        return jsonify({'success': False, 'error': 'Server error'}), 500
        new_content = data.get('content')
# Add a new route for editing messages
@app.route('/edit_message', methods=['POST'])
def edit_message():jsonify({'error': 'Message ID and content are required'}), 400
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        message = Message.query.get(message_id)
    try:
        data = request.get_json()
        message_id = data.get('message_id')ge not found'}), 404
        new_content = data.get('content')
        # Check if user is the sender
        if not message_id or not new_content:_id']:
            return jsonify({'error': 'Message ID and content are required'}), 400
        
        # Get the messageage
        message = Message.query.get(message_id)
        
        if not message:new columns exist before trying to use them
            return jsonify({'error': 'Message not found'}), 404
            message.is_edited = True
        # Check if user is the sender
        if message.sender_id != session['user_id']:
            return jsonify({'error': 'You can only edit your own messages'}), 403
        
        # Update the message
        message.content = new_content
        return jsonify({
        # Check if the new columns exist before trying to use them
        if hasattr(message, 'is_edited'):
            message.is_edited = True
            
        if hasattr(message, 'edited_at'):
            message.edited_at = datetime.datetime.now()
        logging.error(f"Error editing message: {str(e)}")
        db.session.commit()ror': 'Server error'}), 500
        
        return jsonify({tatus
            'success': True,tus', methods=['POST'])
            'message': message.to_dict()
        })er_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'}), 401
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error editing message: {str(e)}")
        return jsonify({'error': 'Server error'}), 500
        
# Route to check block status
@app.route('/check_block_status', methods=['POST'])r': 'User ID required'}), 400
def check_block_status():
    if 'user_id' not in session:ser has blocked the target user
        return jsonify({'success': False, 'error': 'Not logged in'}), 401
            user_id=session['user_id'],
    try:    blocked_user_id=user_id
        data = request.get_json()
        user_id = data.get('user_id')
        # Check if the target user has blocked the current user
        if not user_id: = Block.query.filter_by(
            return jsonify({'success': False, 'error': 'User ID required'}), 400
            blocked_user_id=session['user_id']
        # Check if the current user has blocked the target user
        is_blocked_by_you = Block.query.filter_by(
            user_id=session['user_id'],
            blocked_user_id=user_id
        ).first() is not Noneu': is_blocked_by_you,
            'has_blocked_you': has_blocked_you
        # Check if the target user has blocked the current user
        has_blocked_you = Block.query.filter_by(
            user_id=user_id,r checking block status: {str(e)}")
            blocked_user_id=session['user_id']or': 'Failed to check block status'}), 500
        ).first() is not None
        to block a user
        return jsonify({, methods=['POST'])
            'success': True,
            'is_blocked_by_you': is_blocked_by_you,
            'has_blocked_you': has_blocked_youor': 'Not logged in'}), 401
        })
    except Exception as e:
        logging.error(f"Error checking block status: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to check block status'}), 500
        
# Route to block a user
@app.route('/block_user', methods=['POST'])e, 'error': 'User ID required'}), 400
def block_user():
    if 'user_id' not in session: exists
        return jsonify({'success': False, 'error': 'Not logged in'}), 401
        if not user_to_block:
    try:    return jsonify({'success': False, 'error': 'User not found'}), 404
        data = request.get_json()
        user_id = data.get('user_id')
        existing_block = Block.query.filter_by(
        if not user_id:sion['user_id'],
            return jsonify({'success': False, 'error': 'User ID required'}), 400
        ).first()
        # Validate that the user exists
        user_to_block = User.query.get(user_id)
        if not user_to_block:success': True, 'message': 'User already blocked'})
            return jsonify({'success': False, 'error': 'User not found'}), 404
        # Create new block record
        # Check if already blockedsession['user_id'], blocked_user_id=user_id)
        existing_block = Block.query.filter_by(
            user_id=session['user_id'],
            blocked_user_id=user_idoth directions - user_id is the contact of current user
        ).first()= Contact.query.filter_by(
            user_id=session['user_id'],
        if existing_block:r_id
            return jsonify({'success': True, 'message': 'User already blocked'})
        
        # Create new block record
        new_block = Block(user_id=session['user_id'], blocked_user_id=user_id)
        db.session.add(new_block)
        # current user is the contact of user_id
        # Remove from contacts in both directions - user_id is the contact of current user
        contact1 = Contact.query.filter_by(
            user_id=session['user_id'],']
            contact_id=user_id
        ).first()
        if contact2:
        if contact1:on.delete(contact2)
            db.session.delete(contact1)
        db.session.commit()
        # current user is the contact of user_id
        contact2 = Contact.query.filter_by(essage': 'User blocked successfully'})
            user_id=user_id,
            contact_id=session['user_id']
        ).first()rror(f"Error blocking user: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to block user'}), 500
        if contact2:
            db.session.delete(contact2)
        te('/unblock_user', methods=['POST'])
        db.session.commit()
        user_id' not in session:
        return jsonify({'success': True, 'message': 'User blocked successfully'})
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error blocking user: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to block user'}), 500
        
# Route to unblock a user
@app.route('/unblock_user', methods=['POST']) 'error': 'User ID required'}), 400
def unblock_user():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'}), 401
            user_id=session['user_id'],
    try:    blocked_user_id=user_id
        data = request.get_json()
        user_id = data.get('user_id')
        if block:
        if not user_id:delete(block)
            return jsonify({'success': False, 'error': 'User ID required'}), 400
            return jsonify({'success': True, 'message': 'User unblocked successfully'})
        # Find the block record
        block = Block.query.filter_by( True, 'message': 'User was not blocked'})
            user_id=session['user_id'],
            blocked_user_id=user_id
        ).first()rror(f"Error unblocking user: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to unblock user'}), 500
        if block:
            db.session.delete(block)
            db.session.commit()
            return jsonify({'success': True, 'message': 'User unblocked successfully'})
        else: = os.path.join(basedir, 'static', 'uploads')
            return jsonify({'success': True, 'message': 'User was not blocked'})
    except Exception as e:', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'}
        db.session.rollback() UPLOAD_FOLDER
        logging.error(f"Error unblocking user: {str(e)}")MB max
        return jsonify({'success': False, 'error': 'Failed to unblock user'}), 500
# Create folders if they don't exist
import uuid(MESSAGE_FILES_FOLDER, exist_ok=True)

# Add file upload configurations
UPLOAD_FOLDER = os.path.join(basedir, 'static', 'uploads')lower() in ALLOWED_EXTENSIONS
MESSAGE_FILES_FOLDER = os.path.join(UPLOAD_FOLDER, 'message_files')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'rar'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER['POST'])
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max
    if 'user_id' not in session:
# Create folders if they don't existalse, 'error': 'Not logged in'})
os.makedirs(MESSAGE_FILES_FOLDER, exist_ok=True)
    # Check if recipient ID is provided
def allowed_file(filename):form.get('recipient_id')
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
        return jsonify({'success': False, 'error': 'Recipient ID is required'})
# Route for uploading files in messages
@app.route('/upload_message_file', methods=['POST'])
def upload_message_file():st.files:
    if 'user_id' not in session:': False, 'error': 'No file provided'})
        return jsonify({'success': False, 'error': 'Not logged in'})
    file = request.files['file']
    # Check if recipient ID is provided
    recipient_id = request.form.get('recipient_id')
    if not recipient_id:'':
        return jsonify({'success': False, 'error': 'Recipient ID is required'})
    
    # Check if file is providedowed
    if 'file' not in request.files:ilename):
        return jsonify({'success': False, 'error': 'No file provided'})
        original_filename = secure_filename(file.filename)
    file = request.files['file']name.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}" if file_ext else f"{uuid.uuid4().hex}"
    # Check if file has a name
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'})
        file.save(file_path)
    # Check if file type is allowed
    if file and allowed_file(file.filename):atabase
        # Generate a unique filename('uploads', 'message_files', unique_filename).replace('\\', '/')
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}" if file_ext else f"{uuid.uuid4().hex}"
        try:
        # Save the file if this is an image
        file_path = os.path.join(MESSAGE_FILES_FOLDER, unique_filename)]
        file.save(file_path)
            # Create message content with file info
        # Get relative path for storage in databasenal_filename}:{is_image}"
        relative_path = os.path.join('uploads', 'message_files', unique_filename).replace('\\', '/')
            # Save message to database
        # Create a message with the file information
        sender_id = session['user_id']
        try:    recipient_id=recipient_id,
            # Determine if this is an image
            is_image = file_ext.lower() in ['jpg', 'jpeg', 'png', 'gif']
            db.session.add(new_message)
            # Create message content with file info
            content = f"FILE:{relative_path}:{original_filename}:{is_image}"
            # Return success response with message info
            # Save message to database
            new_message = Message(
                sender_id=sender_id,ge.to_dict(),
                recipient_id=recipient_id,ic', filename=relative_path),
                content=contentiginal_filename,
            )   'is_image': is_image
            db.session.add(new_message)
            db.session.commit()
            db.session.rollback()
            # Return success response with message infoile: {str(e)}")
            return jsonify({'success': False, 'error': str(e)})
                'success': True,
                'message': new_message.to_dict(),: 'File type not allowed'})
                'file_path': url_for('static', filename=relative_path),
                'file_name': original_filename,
                'is_image': is_imageds=['GET'])
            })debar():
        except Exception as e: to show current block/contact status"""
            db.session.rollback()
            logging.error(f"Error saving message with file: {str(e)}")
            return jsonify({'success': False, 'error': str(e)})
    else:nt_user_id = session['user_id']
        return jsonify({'success': False, 'error': 'File type not allowed'})
    try:
# Add or update this route
@app.route('/refresh_sidebar', methods=['GET'])_id)
def refresh_sidebar():
    """Force a sidebar refresh to show current block/contact status"""
    if 'user_id' not in session:data(current_user_id)
        return jsonify({'success': False, 'error': 'Not logged in'})
        return jsonify({
    current_user_id = session['user_id']
            'chats': chats,
    try:    'contacts': contacts
        # Get chats
        chats = get_chat_list_data(current_user_id)
        logging.error(f"Error refreshing sidebar: {str(e)}")
        # Get contacts({'success': False, 'error': str(e)})
        contacts = get_contacts_data(current_user_id)
        te('/delete_chat', methods=['POST'])
        return jsonify({
            'success': True,d for the current user"""
            'chats': chats,sion:
            'contacts': contacts': False, 'error': 'Not logged in'})
        })
    except Exception as e:ion['user_id']
        logging.error(f"Error refreshing sidebar: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
    if not data or 'user_id' not in data:
@app.route('/delete_chat', methods=['POST'])rror': 'User ID is required'})
def delete_chat():
    """Mark a chat as deleted for the current user"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'})
        # Check if table exists by trying to query it
    current_user_id = session['user_id']
    data = request.jsonDeletedChat.query.filter_by(
                user_id=current_user_id,
    if not data or 'user_id' not in data:
        return jsonify({'success': False, 'error': 'User ID is required'})
        except Exception as table_error:
    user_id = data['user_id']f"Error querying DeletedChat table: {str(table_error)}")
            # If table doesn't exist, let's try to create it on the fly
    try:    db.create_all()
        # Check if table exists by trying to query it
        try:
            existing = DeletedChat.query.filter_by(
                user_id=current_user_id,
                chat_with_user_id=user_id
            ).first()id=current_user_id,
        except Exception as table_error:d
            app.logger.error(f"Error querying DeletedChat table: {str(table_error)}")
            # If table doesn't exist, let's try to create it on the fly
            db.create_all()it()
            existing = None(f"Chat between {current_user_id} and {user_id} marked as deleted")
            
        # Now try to create the recorde})
        if not existing:
            deleted_chat = DeletedChat(
                user_id=current_user_id,
                chat_with_user_id=user_ide_chat: {str(e)}")
            )n jsonify({'success': False, 'error': str(e)})
            db.session.add(deleted_chat)
            db.session.commit()abase info (only available in development)
            app.logger.info(f"Chat between {current_user_id} and {user_id} marked as deleted")
        g_db_info():
        return jsonify({'success': True})
    if not app.debug:
    except Exception as e:rror': 'Only available in debug mode'}), 403
        db.session.rollback()
        app.logger.error(f"Error in delete_chat: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
        user_count = User.query.count()
# Debug endpoint to display database info (only available in development)
@app.route('/debug/db_info')act.query.count()
def debug_db_info():= Block.query.count()
    # Only allow if in debug modetedChat.query.count()
    if not app.debug:
        return jsonify({'error': 'Only available in debug mode'}), 403
        if 'user_id' in session:
    try:    user_id = session['user_id']
        # Get counts from various tablesquery.filter_by(user_id=user_id).all()
        user_count = User.query.count()
        message_count = Message.query.count()
        contact_count = Contact.query.count()
        block_count = Block.query.count()dc.chat_with_user_id,
        deleted_chat_count = DeletedChat.query.count()mat()
                }
        # Get deleted chat infoed_chats
        if 'user_id' in session:
            user_id = session['user_id']
            deleted_chats = DeletedChat.query.filter_by(user_id=user_id).all()
            deleted_chat_data = [
                {
                    'id': dc.id,
                    'chat_with_user_id': dc.chat_with_user_id,
                    'deleted_at': dc.deleted_at.isoformat()
                }users': user_count,
                for dc in deleted_chatsnt,
            ]   'contacts': contact_count,
        else:   'blocks': block_count,
            deleted_chat_data = []eleted_chat_count
            user_id = None
            'current_user_id': user_id,
        # Return database infoeleted_chat_data
        return jsonify({
            'counts': {
                'users': user_count,
                'messages': message_count,point: {str(e)}", exc_info=True)
                'contacts': contact_count, 500
                'blocks': block_count,
                'deleted_chats': deleted_chat_count
            },base():
            'current_user_id': user_id, state for the current user"""
            'deleted_chats': deleted_chat_data
        })turn jsonify({'error': 'Not logged in'}), 401
        
    except Exception as e:ion['user_id']
        logging.error(f"Error in debug endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
        # Check if user exists
@app.route('/debug/database')(current_user_id)
def debug_database():
    """Debug endpoint to check database state for the current user"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        sent_messages = Message.query.filter_by(sender_id=current_user_id).count()
    current_user_id = session['user_id']y.filter_by(recipient_id=current_user_id).count()
        
    try:# Check for deleted chats - FIX THE INDENTATION HERE
        # Check if user exists
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            # This line had the incorrect indentation
        # Check for any messages involving this user_by(user_id=current_user_id).all()
        sent_messages = Message.query.filter_by(sender_id=current_user_id).count()
        received_messages = Message.query.filter_by(recipient_id=current_user_id).count()
            app.logger.error(f"Error querying DeletedChat: {str(e)}")
        # Check for deleted chats - FIX THE INDENTATION HERE
        deleted_chats = []ve exchanged messages with this user
        deleted_chat_ids = []
        try:
        try:# First get all messages sent by current user
            # This line had the incorrect indentation User.name).join(
            deleted_chats = DeletedChat.query.filter_by(user_id=current_user_id).all()
            deleted_chat_ids = [dc.chat_with_user_id for dc in deleted_chats]
        except Exception as e:
            app.logger.error(f"Error querying DeletedChat: {str(e)}")
            received_from_users = db.session.query(User.id, User.name).join(
        # Get users who have exchanged messages with this user
        chat_users = []ssage.recipient_id == current_user_id).distinct().all()
        try:
            # First get all messages sent by current user
            sent_to_users = db.session.query(User.id, User.name).join(
                Message, Message.recipient_id == User.idceived_from_users:
            ).filter(Message.sender_id == current_user_id).distinct().all()
                
            # Then get all messages received by current useruser_id, name in user_dict.items() 
            received_from_users = db.session.query(User.id, User.name).join(
                Message, Message.sender_id == User.id
            ).filter(Message.recipient_id == current_user_id).distinct().all()
            
            # Combine the lists and remove duplicateshe MetaData
            user_dict = {}e.name for table in db.metadata.tables.values()]
            for user_id, user_name in sent_to_users + received_from_users:
                user_dict[user_id] = user_name
                sonify({
            chat_users = [{'id': user_id, 'name': name} for user_id, name in user_dict.items() 
                          if user_id != current_user_id]
        except Exception as e:tables
            app.logger.error(f"Error getting chat users: {str(e)}")
            'message_counts': {
        # Check if table exists by trying to access the MetaData
        all_tables = [table.name for table in db.metadata.tables.values()]
                'total': sent_messages + received_messages
        # Return the debug information
        return jsonify({ts': {
            'user_id': current_user_id,ats),
            'database_info': {leted_chat_ids
                'tables': all_tables
            },hat_users': {
            'message_counts': {at_users),
                'sent': sent_messages,
                'received': received_messages,
                'total': sent_messages + received_messages
            },eption as e:
            'deleted_chats': {or in debug endpoint: {str(e)}")
                'count': len(deleted_chats),00
                'user_ids': deleted_chat_ids
            },epair_tables', methods=['POST'])
            'chat_users': {
                'count': len(chat_users),"""
                'users': chat_users
            }n jsonify({'success': False, 'error': 'Not logged in'})
        })
    except Exception as e:
        app.logger.error(f"Error in debug endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500 database tables")
        
@app.route('/repair_tables', methods=['POST'])
def repair_tables():l()
    """Force recreation of missing tables"""ated/repaired successfully")
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'}) successfully'})
    except Exception as e:
    try:app.logger.error(f"Error repairing tables: {str(e)}")
        # Log the repair attempt': False, 'error': str(e)})
        app.logger.info(f"Attempting to repair database tables")
        e__ == '__main__':
        # Create all tables that don't existtion context
        db.create_all()t():
        app.logger.info("Database tables created/repaired successfully")
        mporarily disable SERVER_NAME for local execution
        return jsonify({'success': True, 'message': 'Tables repaired successfully'})
    except Exception as e:o make the application accessible from outside
        app.logger.error(f"Error repairing tables: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})
    # For WSGI execution (PythonAnywhere)
@app.route('/clear_deleted_chats', methods=['POST'])
def clear_deleted_chats():
    """Clear all deleted chat records - for admin use only"""nfig(
    if 'user_id' not in session:e='/tmp/flask_app_error.log', 
        return jsonify({'success': False, 'error': 'Not logged in'})
    - %(levelname)s - %(message)s'
    try:
        # Clear all deleted chat records for the current user onlyication via WSGI")
        DeletedChat.query.filter_by(user_id=session['user_id']).delete()       try:
        db.session.commit()_tables
                create_tables_success = create_tables()
        return jsonify({s_success:
            'success': True, ("Схема базы данных успешно обновлена")
            'message': 'Deleted chat records cleared successfully'
        })"Не удалось обновить схему базы данных, но приложение продолжит работу")
    except Exception as e:
        db.session.rollback()   # Проверка наличия папки для аватаров2
        app.logger.error(f"Error clearing deleted chats: {str(e)}")FOLDER']):
        return jsonify({'success': False, 'error': str(e)})    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
 для аватаров: {app.config['UPLOAD_FOLDER']}")
if __name__ == '__main__':
    # Initialize the database in the application contextуспешно запущено на PythonAnywhere")
    with app.app_context():
        create_tables()ng.error(f"Ошибка при запуске приложения: {str(e)}")
    # Temporarily disable SERVER_NAME for local execution
    app.config['SERVER_NAME'] = Nonetion as e:
    # Set host='0.0.0.0' to make the application accessible from outside
    app.run(debug=True, host='0.0.0.0')
else:
    # For WSGI execution (PythonAnywhere)    try:        with app.app_context():            logging.basicConfig(                filename='/tmp/flask_app_error.log',                 level=logging.DEBUG,                format='%(asctime)s - %(levelname)s - %(message)s'            )            logging.info("Starting application via WSGI")            try:                # Защищенный вызов create_tables
                create_tables_success = create_tables()
                if create_tables_success:
                    logging.info("Схема базы данных успешно обновлена")
                else:
                    logging.warning("Не удалось обновить схему базы данных, но приложение продолжит работу")
                
                # Проверка наличия папки для аватаров2
                if not os.path.exists(app.config['UPLOAD_FOLDER']):
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    logging.info(f"Создана папка для аватаров: {app.config['UPLOAD_FOLDER']}")
                
                logging.info("Приложение успешно запущено на PythonAnywhere")
            except Exception as e:
                logging.error(f"Ошибка при запуске приложения: {str(e)}")
                logging.error("Приложение может работать некорректно!")
    except Exception as e:
        import traceback
        with open('/tmp/flask_startup_error.log', 'w') as f:
            f.write(f"Критическая ошибка: {str(e)}\n")
            f.write(traceback.format_exc())