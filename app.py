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
app.jinja_env.globals.update(hasattr=hasattr)
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
from models.user import db, User, Contact, Message
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
                'bio': user.bio or 'Нет информации'
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
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        user_id = session['user_id']
        
        # Запрашиваем контакты пользователя
        contacts_query = Contact.query.filter_by(user_id=user_id).join(
            Contact.contact_user
        ).order_by(User.name)
        
        contacts = []
        for contact in contacts_query.all():
            contact_user = contact.contact_user
            contacts.append({
                'id': contact_user.id,
                'name': contact_user.name,
                'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
                'bio': contact_user.bio if hasattr(contact_user, 'bio') else None,
                'added_at': contact.added_at.isoformat()
            })
        
        return jsonify({'contacts': contacts})
    except Exception as e:
        logging.error(f"Ошибка при получении контактов: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Маршрут для добавления пользователя в контакты
@app.route('/add_contact', methods=['POST'])
def add_contact():
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
        
        # Проверяем, не пытается ли пользователь добавить сам себя
        if int(contact_id) == session['user_id']:
            return jsonify({'error': 'Cannot add yourself as a contact'}), 400
        
        # Проверяем, не добавлен ли уже этот контакт
        existing_contact = Contact.query.filter_by(
            user_id=session['user_id'],
            contact_id=contact_id
        ).first()
        
        if existing_contact:
            # Контакт уже добавлен, возвращаем успех (идемпотентность)
            return jsonify({
                'success': True,
                'message': 'Contact already exists',
                'contact': {
                    'id': contact_user.id,
                    'name': contact_user.name,
                    'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
                    'bio': contact_user.bio if hasattr(contact_user, 'bio') else None
                }
            })
        
        # Создаем новую запись контакта
        new_contact = Contact(
            user_id=session['user_id'],
            contact_id=contact_id
        )
        
        db.session.add(new_contact)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Contact added successfully',
            'contact': {
                'id': contact_user.id,
                'name': contact_user.name,
                'avatar_path': contact_user.avatar_path if hasattr(contact_user, 'avatar_path') else None,
                'bio': contact_user.bio if hasattr(contact_user, 'bio') else None
            }
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Ошибка при добавлении контакта: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Route for sending a message
@app.route('/send_message', methods=['POST'])
def send_message():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        logging.info(f"Received message data: {data}")
        
        recipient_id = data.get('recipient_id')
        content = data.get('content')
        
        if not recipient_id or not content:
            logging.warning(f"Missing required fields. recipient_id: {recipient_id}, content length: {len(content) if content else 0}")
            return jsonify({'error': 'Recipient ID and content are required'}), 400
        
        # Verify the users exist
        sender = User.query.get(session['user_id'])
        recipient = User.query.get(recipient_id)
        
        if not sender:
            logging.error(f"Sender with ID {session['user_id']} not found")
            return jsonify({'error': 'Invalid sender'}), 400
            
        if not recipient:
            logging.error(f"Recipient with ID {recipient_id} not found")
            return jsonify({'error': 'Invalid recipient'}), 400
        
        logging.info(f"Creating message from {sender.name} to {recipient.name}")
        
        # Create a new message
        new_message = Message(
            sender_id=session['user_id'],
            recipient_id=recipient_id,
            content=content
        )
        
        # Add to session and commit with detailed logging
        db.session.add(new_message)
        logging.info(f"Message added to session, committing...")
        db.session.commit()
        logging.info(f"Message committed successfully with ID: {new_message.id}")
        
        # Convert to dictionary for response
        message_dict = new_message.to_dict()
        logging.info(f"Returning message: {message_dict}")
        
        return jsonify({
            'success': True,
            'message': message_dict
        })
    except Exception as e:
        db.session.rollback()
        error_msg = f"Error sending message: {str(e)}"
        logging.error(error_msg)
        logging.exception(e)  # This logs the full stack trace
        return jsonify({'error': error_msg}), 500

# Route for getting message history between two users
@app.route('/get_messages')
def get_messages():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        user_id = session['user_id']
        other_user_id = request.args.get('user_id')
        
        if not other_user_id:
            return jsonify({'error': 'Missing user_id parameter'}), 400
        
        # Query messages between the two users (in both directions)
        messages = Message.query.filter(
            ((Message.sender_id == user_id) & (Message.recipient_id == other_user_id)) |
            ((Message.sender_id == other_user_id) & (Message.recipient_id == user_id))
        ).order_by(Message.timestamp).all()
        
        # Mark messages as read if current user is the recipient
        unread_messages = Message.query.filter_by(
            recipient_id=user_id, 
            sender_id=other_user_id,
            is_read=False
        ).all()
        
        for msg in unread_messages:
            msg.is_read = True
        
        db.session.commit()
        
        # Convert messages to dictionaries
        message_list = [msg.to_dict() for msg in messages]
        
        return jsonify({
            'success': True,
            'messages': message_list
        })
    except Exception as e:
        logging.error(f"Error retrieving messages: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

# Route for getting recent conversations (users you've messaged with)
@app.route('/get_recent_conversations')
def get_recent_conversations():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        user_id = session['user_id']
        
        # This query finds the most recent message between the current user and each other user
        # using SQLAlchemy subqueries
        from sqlalchemy import func, distinct, desc
        
        # Get the unique users who have communicated with the current user
        users_subquery = db.session.query(
            # If sender is current user, we want recipient, else we want sender
            func.case([(Message.sender_id == user_id, Message.recipient_id)],
                     else_=Message.sender_id).label('user_id'),
            # Get the max ID (most recent message) for each conversation
            func.max(Message.id).label('max_id')
        ).filter(
            # Include only messages where current user is either sender or recipient 
            (Message.sender_id == user_id) | (Message.recipient_id == user_id)
        ).group_by(
            func.case([(Message.sender_id == user_id, Message.recipient_id)],
                     else_=Message.sender_id)
        ).subquery()
        
        # Join with messages to get the most recent message for each conversation
        recent_messages = db.session.query(
            users_subquery.c.user_id.label('user_id'),
            Message.content.label('last_message'),
            Message.timestamp
        ).join(
            Message, Message.id == users_subquery.c.max_id
        ).order_by(
            desc(Message.timestamp)
        ).limit(20).all()  # Limit to 20 most recent conversations
        
        # Count unread messages for each conversation
        unread_counts = {}
        for user_id_val in [row.user_id for row in recent_messages]:
            count = Message.query.filter_by(
                sender_id=user_id_val,
                recipient_id=user_id,
                is_read=False
            ).count()
            unread_counts[user_id_val] = count
        
        # Get user info for each conversation
        conversations = []
        for row in recent_messages:
            other_user = User.query.get(row.user_id)
            if other_user:
                conversations.append({
                    'user_id': other_user.id,
                    'name': other_user.name,
                    'avatar_path': other_user.avatar_path if hasattr(other_user, 'avatar_path') else None,
                    'last_message': row.last_message,
                    'timestamp': row.timestamp.isoformat(),
                    'unread_count': unread_counts.get(other_user.id, 0)
                })
        
        return jsonify({
            'success': True,
            'conversations': conversations
        })
    except Exception as e:
        logging.error(f"Error retrieving conversations: {str(e)}")
        logging.exception(e)
        return jsonify({
            'success': False,
            'error': 'Failed to load conversations'
        }), 500

if __name__ == '__main__':
    # Инициализация базы данных в контексте приложения
    with app.app_context():
        create_tables()
    # Временно отключаем SERVER_NAME для локального запуска
    app.config['SERVER_NAME'] = None
    # Устанавливаем host='0.0.0.0', чтобы приложение было доступно извне
    app.run(debug=True, host='0.0.0.0')
else:
    # Для запуска через WSGI (PythonAnywhere)
    try:
        with app.app_context():
            logging.basicConfig(
                filename='/tmp/flask_app_error.log', 
                level=logging.DEBUG,
                format='%(asctime)s - %(levelname)s - %(message)s'
            )
            logging.info("Запускаем приложение через WSGI")
            try:
                # Защищенный вызов create_tables
                create_tables_success = create_tables()
                if create_tables_success:
                    logging.info("Схема базы данных успешно обновлена")
                else:
                    logging.warning("Не удалось обновить схему базы данных, но приложение продолжит работу")
                
                # Проверка наличия папки для аватаров
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
