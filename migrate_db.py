from app import app, db
import os
import sqlite3

def migrate_database():
    # Путь к базе данных
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_path = os.path.join(basedir, 'instance')
    db_path = os.path.join(instance_path, 'chat.db')
    
    # Проверяем существование базы данных
    if not os.path.exists(db_path):
        print("База данных не найдена.")
        return

    try:
        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверяем наличие столбцов
        cursor.execute("PRAGMA table_info(user)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # Добавляем отсутствующие столбцы
        if 'email_confirmed' not in column_names:
            cursor.execute("ALTER TABLE user ADD COLUMN email_confirmed BOOLEAN DEFAULT 0")
            print("Столбец email_confirmed добавлен")
        
        if 'confirmation_token' not in column_names:
            cursor.execute("ALTER TABLE user ADD COLUMN confirmation_token VARCHAR(100)")
            print("Столбец confirmation_token добавлен")
        
        if 'token_expiration' not in column_names:
            cursor.execute("ALTER TABLE user ADD COLUMN token_expiration DATETIME")
            print("Столбец token_expiration добавлен")
        
        conn.commit()
        conn.close()
        print("Миграция базы данных завершена успешно")
        
    except Exception as e:
        print(f"Ошибка при миграции базы данных: {str(e)}")

if __name__ == "__main__":
    migrate_database()
