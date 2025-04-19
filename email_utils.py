import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
import datetime
from flask import url_for
import re
import os
import uuid
import logging

def generate_confirmation_token():
    """Генерирует уникальный токен для подтверждения email"""
    return str(uuid.uuid4())

def send_confirmation_email(user_email, token):
    """Отправка письма с подтверждением на email пользователя"""
    
    # Gmail SMTP настройки
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SENDER_EMAIL = "erlan310706@gmail.com"  # Замените на ваш реальный Gmail
    SENDER_PASSWORD = "srtf zqdd qkzb diaz"  # 16-символьный пароль приложения
    USE_SSL = False  # Для Gmail с портом 587 используем TLS, а не SSL
    
    # Настройка логирования для отладки
    logging.info(f"Попытка отправки email на адрес: {user_email}")
    
    # Настройка сообщения
    message = MIMEMultipart("alternative")
    message["Subject"] = "Подтверждение регистрации"
    message["From"] = SENDER_EMAIL
    message["To"] = user_email
    
    # Определяем, находимся ли мы на PythonAnywhere
    is_pythonanywhere = 'PYTHONANYWHERE_DOMAIN' in os.environ or 'PYTHONANYWHERE_HOST' in os.environ
    
    # Создаем ссылку для подтверждения
    if is_pythonanywhere:
        # На PythonAnywhere используем абсолютную ссылку
        base_url = "https://tymeer.pythonanywhere.com"
        confirmation_url = f"{base_url}/confirm-email/{token}"
    else:
        # Локально используем url_for
        confirmation_url = url_for('confirm_email', token=token, _external=True)
    
    # Формируем тело письма
    text = f"""
    Здравствуйте!
    
    Для подтверждения вашего email пройдите по следующей ссылке:
    {confirmation_url}
    
    Если вы не регистрировались на нашем сайте, проигнорируйте это сообщение.
    
    С уважением,
    Команда сайта
    """
    
    html = f"""
    <html>
    <body>
        <p>Здравствуйте!</p>
        <p>Для подтверждения вашего email нажмите на следующую ссылку:</p>
        <p><a href="{confirmation_url}">Подтвердить email</a></p>
        <p>Если вы не регистрировались на нашем сайте, проигнорируйте это сообщение.</p>
        <p>С уважением,<br>Команда сайта</p>
    </body>
    </html>
    """
    
    # Добавляем текстовую и HTML-версии в сообщение
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    message.attach(part1)
    message.attach(part2)
    
    try:
        logging.info(f"Подключение к SMTP-серверу: {SMTP_SERVER}:{SMTP_PORT}")
        
        # Используем правильный способ подключения в зависимости от настроек
        if USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        
        logging.info("Аутентификация на SMTP-сервере")
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        
        logging.info("Отправка сообщения")
        server.sendmail(SENDER_EMAIL, user_email, message.as_string())
        server.quit()
        
        logging.info("Email успешно отправлен")
        return True
    except Exception as e:
        logging.error(f"Ошибка отправки email: {str(e)}")
        # Более подробное логирование для диагностики
        if "authentication failed" in str(e).lower():
            logging.error("Ошибка аутентификации: проверьте логин и пароль")
        elif "timed out" in str(e).lower():
            logging.error("Превышено время ожидания: проверьте настройки сервера и сетевое подключение")
        
        return False

def send_reset_password_email(user_email, token):
    """Отправка письма с ссылкой на сброс пароля"""
    
    # Gmail SMTP настройки
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SENDER_EMAIL = "erlan310706@gmail.com"  # Замените на ваш реальный Gmail
    SENDER_PASSWORD = "srtf zqdd qkzb diaz"  # 16-символьный пароль приложения
    USE_SSL = False  # Для Gmail с портом 587 используем TLS, а не SSL
    
    # Настройка логирования для отладки с повышенной детализацией
    logging.info(f"===============================================")
    logging.info(f"Начало отправки email для сброса пароля на адрес: {user_email}")
    logging.info(f"Токен: {token}")
    
    # Настройка сообщения
    message = MIMEMultipart("alternative")
    message["Subject"] = "Сброс пароля"
    message["From"] = SENDER_EMAIL
    message["To"] = user_email
    
    # Определяем, находимся ли мы на PythonAnywhere
    is_pythonanywhere = 'PYTHONANYWHERE_DOMAIN' in os.environ or 'PYTHONANYWHERE_HOST' in os.environ
    logging.info(f"Запуск на PythonAnywhere: {is_pythonanywhere}")
    
    # Создаем ссылку для сброса пароля
    if is_pythonanywhere:
        # На PythonAnywhere используем абсолютную ссылку
        base_url = "https://tymeer.pythonanywhere.com"
        reset_url = f"{base_url}/reset-password/{token}"
        logging.info(f"URL для сброса на PythonAnywhere: {reset_url}")
    else:
        # Локально создаем URL вручную, т.к. url_for может не работать в этом контексте
        reset_url = f"http://localhost:5000/reset-password/{token}"
        logging.info(f"URL для сброса локально: {reset_url}")
    
    # Формируем тело письма
    text = f"""
    Здравствуйте!
    
    Вы получили это письмо, потому что был запрошен сброс пароля для вашего аккаунта.
    
    Для сброса пароля перейдите по ссылке:
    {reset_url}
    
    Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.
    
    С уважением,
    Команда сайта
    """
    
    html = f"""
    <html>
    <body>
        <p>Здравствуйте!</p>
        <p>Вы получили это письмо, потому что был запрошен сброс пароля для вашего аккаунта.</p>
        <p>Для сброса пароля нажмите на следующую ссылку:</p>
        <p><a href="{reset_url}">Сбросить пароль</a></p>
        <p>Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.</p>
        <p>С уважением,<br>Команда сайта</p>
    </body>
    </html>
    """
    
    # Добавляем текстовую и HTML-версии в сообщение
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    message.attach(part1)
    message.attach(part2)
    
    try:
        logging.info(f"Подключение к SMTP-серверу: {SMTP_SERVER}:{SMTP_PORT}")
        
        # Используем правильный способ подключения в зависимости от настроек
        if USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
        
        logging.info("Аутентификация на SMTP-сервере")
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        
        logging.info("Отправка сообщения")
        server.sendmail(SENDER_EMAIL, user_email, message.as_string())
        server.quit()
        
        logging.info("Email для сброса пароля успешно отправлен")
        logging.info(f"===============================================")
        return True
    except Exception as e:
        logging.error(f"Ошибка отправки email для сброса пароля: {str(e)}")
        logging.error(f"Детали ошибки: {repr(e)}")
        logging.info(f"===============================================")
        return False

def is_email_valid(email):
    """Простая проверка формата email"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None
