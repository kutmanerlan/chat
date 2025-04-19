from flask import Flask, json, request, render_template, redirect, url_for, flash, session, jsonify, make_response, make_response
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
    # Полностью очищаем всю сессию вместо удаления отдельных ключей
    session.clear()
    # Добавляем сообщение для пользователя
    flash('Вы успешно вышли из аккаунта', 'info')ляем cookies
    return redirect(url_for('login'))n'))
    # Установка cookie с уже истекшим сроком действия для его удаления
@app.route('/main')okie('session', '', expires=0)
def main():
    if 'user_id' not in session:льзователя
        return redirect(url_for('login')) 'info')
    # Проверяем, существует ли пользователь в базе данных
    user = User.query.get(session['user_id'])
    if user is None:
        # Пользователь не найден в базе, очищаем сессию
        session.clear() session:
        flash('Ваша сессия была завершена, так как пользователь не найден в базе данных', 'info')
        return redirect(url_for('login'))
    return render_template('dashboard.html')в базе данных
    user = User.query.get(session['user_id'])
# Добавим маршрут для проверки работоспособности
@app.route('/ping')ель не найден в базе, очищаем сессию
def ping():sion.clear()
    return 'pong'ша сессия была завершена, так как пользователь не найден в базе данных', 'info')
        return redirect(url_for('login'))
@app.route('/profile')
def profile():м данные пользователя в сессии для уверенности
    if 'user_id' not in session:name
        return redirect(url_for('login'))
    user = User.query.get(session['user_id'])
    if not user:ake_response(render_template('dashboard.html'))
        flash('Пользователь не найден', 'error')e, no-cache, must-revalidate, max-age=0'
        return redirect(url_for('login'))e'
    return render_template('profile.html', user=user)
    return response
# Маршрут для запроса сброса пароля
@app.route('/reset-password-request', methods=['GET', 'POST'])
def reset_password_request():
    if 'user_id' in session:
        return redirect(url_for('main'))
    
    # Выводим отладочную информацию при обработке запроса
    logging.info("Запрошена страница сброса пароля")
    if 'user_id' not in session:
    # Определяем, является ли запрос AJAX-запросом
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    if not user:
    if request.method == 'POST':айден', 'error')
        email = request.form.get('email', '').strip()
        logging.info(f"Получен POST-запрос на сброс пароля для email: {email}")
        
        if not email: сброса пароля
            if is_ajax:word-request', methods=['GET', 'POST'])
                return jsonify({
                    'success': False,
                    'message': 'Пожалуйста, введите email'
                })
            else:адочную информацию при обработке запроса
                flash('Пожалуйста, введите email', 'error')
                return render_template('reset_password_request.html')
            ляем, является ли запрос AJAX-запросом
        if not is_email_valid(email):Requested-With') == 'XMLHttpRequest'
            if is_ajax:
                return jsonify({
                    'success': False,il', '').strip()
                    'message': 'Пожалуйста, введите корректный email' {email}")
                })
            else:ail:
                flash('Пожалуйста, введите корректный email', 'error')
                return render_template('reset_password_request.html')
                    'success': False,
        user = User.query.filter_by(email=email).first()l'
                })
        # Генерируем токен даже если пользователь не найден (для безопасности)
        reset_token = generate_confirmation_token()'error')
        token_expiration = datetime.datetime.now() + datetime.timedelta(hours=1)
            
        if user:s_email_valid(email):
            # Сохраняем токен в базе данных только для существующего пользователя
            user.confirmation_token = reset_token
            user.token_expiration = token_expiration
                    'message': 'Пожалуйста, введите корректный email'
            try:})
                db.session.commit()
                # Отправляем письмо с ссылкой на сброс пароля 'error')
                logging.info(f"Отправка письма для сброса пароля на {email}")
                result = send_reset_password_email(email, reset_token)
                ser.query.filter_by(email=email).first()
                if is_ajax:
                    return jsonify({ пользователь не найден (для безопасности)
                        'success': True,ion_token()
                        'message': 'Инструкции по сбросу пароля отправлены на ваш email'
                    })
                else:
                    if result:в базе данных только для существующего пользователя
                        logging.info(f"Письмо для сброса пароля успешно отправлено на {email}")
                        flash('Инструкции по сбросу пароля отправлены на ваш email', 'success')
                    else:
                        logging.error(f"Не удалось отправить письмо для сброса пароля на {email}")
                        flash('Произошла ошибка при отправке email. Пожалуйста, попробуйте позже.', 'error')
            except Exception as e:о с ссылкой на сброс пароля
                db.session.rollback()ка письма для сброса пароля на {email}")
                logging.error(f"Ошибка при сбросе пароля: {str(e)}")n)
                
                if is_ajax:
                    return jsonify({
                        'success': False,
                        'message': 'Произошла ошибка. Пожалуйста, попробуйте позже.'ail'
                    })
                else:
                    flash('Произошла ошибка. Пожалуйста, попробуйте позже.', 'error')
        else:           logging.info(f"Письмо для сброса пароля успешно отправлено на {email}")
            # Для безопасности не сообщаем, существует ли пользовательна ваш email', 'success')
            if is_ajax:e:
                return jsonify({error(f"Не удалось отправить письмо для сброса пароля на {email}")
                    'success': True,ошла ошибка при отправке email. Пожалуйста, попробуйте позже.', 'error')
                    'message': 'Если указанный email зарегистрирован в системе, вы получите инструкции по сбросу пароля'
                }).session.rollback()
            else:ogging.error(f"Ошибка при сбросе пароля: {str(e)}")
                flash('Если указанный email зарегистрирован в системе, вы получите инструкции по сбросу пароля', 'info')
                if is_ajax:
        if not is_ajax:urn jsonify({
            return redirect(url_for('login'))
                        'message': 'Произошла ошибка. Пожалуйста, попробуйте позже.'
    # Только для GET запросов отдаем HTML-шаблон
    if request.method == 'GET':
        logging.info("Отдаем шаблон reset_password_request.html")те позже.', 'error')
        return render_template('reset_password_request.html')
            # Для безопасности не сообщаем, существует ли пользователь
    # Для всех других случаев отдаем JSON-ответ для AJAX
    return jsonify({rn jsonify({
        'success': True,cess': True,
        'message': 'Обработка запроса сброса пароля' зарегистрирован в системе, вы получите инструкции по сбросу пароля'
    })          })
            else:
# Маршрут для непосредственного сброса пароляарегистрирован в системе, вы получите инструкции по сбросу пароля', 'info')
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if 'user_id' in session:url_for('login'))
        return redirect(url_for('main'))
    # Только для GET запросов отдаем HTML-шаблон
    # Проверка токена == 'GET':
    user = User.query.filter_by(confirmation_token=token).first()
    if not user or datetime.datetime.now() > user.token_expiration:
        flash('Ссылка для сброса пароля недействительна или срок её действия истек', 'error')
        return redirect(url_for('login'))-ответ для AJAX
    return jsonify({
    if request.method == 'POST':
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        
        if not password:венного сброса пароля
            flash('Пожалуйста, введите новый пароль', 'error')
            return render_template('reset_password.html', token=token)
        user_id' in session:
        if password != confirm_password:
            flash('Пароли не совпадают', 'error')
            return render_template('reset_password.html', token=token)
         = User.query.filter_by(confirmation_token=token).first()
        # Обновляем парольe.datetime.now() > user.token_expiration:
        user.set_password(password)роля недействительна или срок её действия истек', 'error')
        user.confirmation_token = None'))
        user.token_expiration = None
        equest.method == 'POST':
        try:word = request.form.get('password', '').strip()
            db.session.commit()est.form.get('confirm_password', '').strip()
            flash('Ваш пароль успешно изменен. Теперь вы можете войти в систему.', 'success')
        except Exception as e:
            db.session.rollback()едите новый пароль', 'error')
            logging.error(f"Ошибка при обновлении пароля: {str(e)}")n)
            flash('Произошла ошибка при обновлении пароля.', 'error')
        if password != confirm_password:
        return redirect(url_for('login'))'error')
            return render_template('reset_password.html', token=token)
    return render_template('reset_password.html', token=token)
        # Обновляем пароль
if __name__ == '__main__':ния информации о текущем пользователеpassword)
    # Инициализация базы данных в контексте приложения
    with app.app_context()::on = None
        create_tables() session:
    # Временно отключаем SERVER_NAME для локального запуска
    app.config.pop('SERVER_NAME', None)
    # Устанавливаем host='0.0.0.0', чтобы приложение было доступно извнеs')
    app.run(debug=True, host='0.0.0.0')_id'])
else:f not user:       db.session.rollback()
    # Для запуска через WSGI (PythonAnywhere)und'}), 404ении пароля: {str(e)}")
    try:flash('Произошла ошибка при обновлении пароля.', 'error')
        with app.app_context():ормацию о пользователе
            logging.basicConfig(filename='/tmp/flask_app_error.log', level=logging.DEBUG)
            logging.info("Запускаем приложение через WSGI")
            try:me': user.name,r_template('reset_password.html', token=token)
                # Проверяем существование таблиц и создаем если нужно
                if not db.engine.dialect.has_table(db.engine, 'user'):
                    create_tables()
                logging.info("Приложение успешно запущено на PythonAnywhere")
            except Exception as e:контексте приложения
                logging.error(f"Ошибка при запуске приложения: {str(e)}")
    except Exception as e:ME', None)
        import traceback SERVER_NAME для локального запуска='0.0.0.0', чтобы приложение было доступно извне
        with open('/tmp/flask_startup_error.log', 'w') as f:
            f.write(f"Критическая ошибка: {str(e)}\n")ыло доступно извне
            f.write(traceback.format_exc())


















            f.write(traceback.format_exc())            f.write(f"Критическая ошибка: {str(e)}\n")        with open('/tmp/flask_startup_error.log', 'w') as f:        import traceback    except Exception as e:                logging.error(f"Ошибка при запуске приложения: {str(e)}")            except Exception as e:                logging.info("Приложение успешно запущено на PythonAnywhere")                    create_tables()                if not db.engine.dialect.has_table(db.engine, 'user'):                # Проверяем существование таблиц и создаем если нужно            try:            logging.info("Запускаем приложение через WSGI")            logging.basicConfig(filename='/tmp/flask_app_error.log', level=logging.DEBUG)        with app.app_context():    try:    # Для запуска через WSGI (PythonAnywhere)else:    try:
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