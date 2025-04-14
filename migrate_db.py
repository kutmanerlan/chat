from app import app, db
import os
import sqlite3
import argparse

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

def clear_database_tables(tables=None):
    """
    Очищает указанные таблицы или все таблицы, если список не указан
    """
    try:
        # Путь к базе данных
        basedir = os.path.abspath(os.path.dirname(__file__))
        instance_path = os.path.join(basedir, 'instance')
        db_path = os.path.join(instance_path, 'chat.db')
        
        if not os.path.exists(db_path):
            print("База данных не найдена.")
            return
            
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Если таблицы не указаны, получаем список всех таблиц
        if not tables:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            # Исключаем системную таблицу
            if 'sqlite_sequence' in tables:
                tables.remove('sqlite_sequence')
        
        # Очищаем каждую таблицу
        for table in tables:
            cursor.execute(f"DELETE FROM {table}")
            print(f"Таблица '{table}' очищена")
        
        conn.commit()
        conn.close()
        print("Очистка базы данных завершена успешно")
        
    except Exception as e:
        print(f"Ошибка при очистке базы данных: {str(e)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Инструменты для миграции и очистки базы данных")
    parser.add_argument('--migrate', action='store_true', help='Выполнить миграцию базы данных')
    parser.add_argument('--clear', action='store_true', help='Очистить все таблицы в базе данных')
    parser.add_argument('--tables', nargs='+', help='Список таблиц для очистки (по умолчанию - все)')
    
    args = parser.parse_args()
    
    if args.migrate:
        migrate_database()
    elif args.clear:
        clear_database_tables(args.tables)
    else:
        # По умолчанию запускаем миграцию
        migrate_database()
