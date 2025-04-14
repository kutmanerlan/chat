import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
import datetime
from flask import url_for
import re
import os

def generate_confirmation_token():
    """Генерирует уникальный токен для подтверждения email"""
    return secrets.token_urlsafe(32)

def send_confirmation_email(user_email, token):
    """Отправка письма с подтверждением на email пользователя"""
    
    # Настройки для SMTP-сервера (лучше хранить в переменных окружения)
    SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "your_email@gmail.com")
    SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "your_password")
    
    # Настройка сообщения
    message = MIMEMultipart("alternative")
    message["Subject"] = "Подтверждение регистрации"
    message["From"] = SENDER_EMAIL
    message["To"] = user_email
    
    # Создаем ссылку для подтверждения
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
        # Соединение с SMTP-сервером и отправка сообщения
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, user_email, message.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Ошибка отправки email: {e}")
        return False

def is_email_valid(email):
    """Простая проверка формата email"""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email))
