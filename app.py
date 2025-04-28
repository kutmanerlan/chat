from flask import Flask, json, request, render_template, redirect, url_for, flash, session, jsonify, make_response, send_from_directory
import logging
import os
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
if os.environ.get('FLASK_ENV') == 'production':
    # Для PythonAnywhere определяем SERVER_NAME из переменной окружения
    if 'PYTHONANYWHERE_HOST' in os.environ:
        app.config['SERVER_NAME'] = os.environ['PYTHONANYWHERE_HOST']
else:
    # Для локальной разработки используем localhost:5000
    app.config['SERVER_NAME'] = 'localhost:5000'

# Добавляем конфигурацию для загрузки файлов
# UPLOAD_FOLDER теперь указывает на корень 'uploads' внутри 'static'
# Конкретные подпапки (avatars, group_files) будут создаваться по мере необходимости
UPLOAD_FOLDER = os.path.join(basedir, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Создаем корневую папку для загрузок, если её нет
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Инициализация базы данных
from models.user import db, User, Contact, Message, Block, Group, GroupMember, GroupMessage
from flask import send_from_directory # Import send_from_directory

db.init_app(app)

# Import database utility functions from utils
from utils.db_utils import create_tables

# Import and register blueprints
from routes.auth import auth_bp
from routes.user import user_bp
from routes.contacts import contacts_bp
from routes.messages import messages_bp
from routes.groups import groups_bp

# Register blueprints without URL prefixes
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(contacts_bp)
app.register_blueprint(messages_bp)
app.register_blueprint(groups_bp)

# --- NEW ROUTE TO SERVE UPLOADED FILES ---
@app.route('/uploads/<path:filepath>')
def serve_uploaded_file(filepath):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    logging.debug(f"Attempting to serve file: {filepath}")
    # Security Check: Basic check for path traversal
    if '..' in filepath or filepath.startswith('/'):
        logging.warning(f"Potential path traversal attempt: {filepath}")
        return jsonify({"error": "Forbidden"}), 403

    # More specific security for group files
    if filepath.startswith('group_files/'):
        try:
            # Extract group_id from the path (e.g., group_files/123/image.png -> 123)
            parts = filepath.split('/')
            if len(parts) < 3 or not parts[1].isdigit():
                 logging.warning(f"Invalid group file path format: {filepath}")
                 return jsonify({"error": "Not found"}), 404
            group_id = int(parts[1])
            
            # Check if current user is a member of this group
            is_member = GroupMember.query.filter_by(
                group_id=group_id,
                user_id=session['user_id'],
                invitation_status='accepted'
            ).first()
            
            if not is_member:
                logging.warning(f"User {session['user_id']} not member of group {group_id}, denied access to {filepath}")
                return jsonify({"error": "Forbidden"}), 403
                
            logging.debug(f"User {session['user_id']} is member of group {group_id}. Serving file: {filepath}")
        except Exception as e:
            logging.error(f"Error during group file access check for {filepath}: {e}")
            return jsonify({"error": "Server Error"}), 500
    # Add similar checks here for other sensitive directories if needed (e.g., private user files)
    elif filepath.startswith('avatars/'):
        # Avatars are generally considered public within the app, less strict check needed
        # You might still want basic validation or ensure the file exists
        logging.debug(f"Serving avatar: {filepath}")
    else:
        # Handle other potential paths or deny by default
        logging.warning(f"Attempt to access potentially restricted path: {filepath}")
        return jsonify({"error": "Forbidden"}), 403

    # Serve the file using send_from_directory
    # UPLOAD_FOLDER is the base directory (e.g., static/uploads)
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filepath, as_attachment=False)
    except FileNotFoundError:
         logging.error(f"File not found: {os.path.join(app.config['UPLOAD_FOLDER'], filepath)}")
         return jsonify({"error": "Not found"}), 404
    except Exception as e:
        logging.error(f"Error serving file {filepath}: {e}")
        return jsonify({"error": "Server error"}), 500
# --- END NEW ROUTE ---

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
    return redirect(url_for('auth.login'))

@app.route('/main')
def main():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    # Проверяем, существует ли пользователь в базе данных
    user = User.query.get(session['user_id'])
    if user is None:
        # Пользователь не найден в базе, очищаем сессию
        session.clear()
        flash('Ваша сессия была завершена, так как пользователь не найден в базе данных', 'info')
        return redirect(url_for('auth.login'))
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
        return redirect(url_for('auth.login'))
    user = User.query.get(session['user_id'])
    if not user:
        flash('Пользователь не найден', 'error')
        return redirect(url_for('auth.login'))
    return render_template('profile.html', user=user)

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
                format='%(asctime)s - %(level)s - %(message)s'
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
