import logging
import datetime
from sqlalchemy import inspect, text
from models.user import db, User

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
            
            # Check for file columns in message table
            if 'file_path' not in message_columns:
                logging.info('Adding file_path column to message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE message ADD COLUMN file_path VARCHAR(255)"))
                        connection.commit()
                    logging.info('file_path column added successfully')
                except Exception as column_error:
                    logging.error(f"Error adding file_path column: {str(column_error)}")
            
            if 'mime_type' not in message_columns:
                logging.info('Adding mime_type column to message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE message ADD COLUMN mime_type VARCHAR(100)"))
                        connection.commit()
                    logging.info('mime_type column added successfully')
                except Exception as column_error:
                    logging.error(f"Error adding mime_type column: {str(column_error)}")
            
            if 'original_filename' not in message_columns:
                logging.info('Adding original_filename column to message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE message ADD COLUMN original_filename VARCHAR(255)"))
                        connection.commit()
                    logging.info('original_filename column added successfully')
                except Exception as column_error:
                    logging.error(f"Error adding original_filename column: {str(column_error)}")
            
            if 'message_type' not in message_columns:
                logging.info('Adding message_type column to message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE message ADD COLUMN message_type VARCHAR(50)"))
                        connection.commit()
                    logging.info('message_type column added successfully')
                except Exception as column_error:
                    logging.error(f"Error adding message_type column: {str(column_error)}")
        
        # Check if block table exists
        if 'block' not in inspector.get_table_names():
            logging.info("Таблица block не найдена. Создаем...")
            # Create the block table
            db.create_all()
            logging.info('Таблица block создана')
        
        # Check if group table exists
        if 'group' not in inspector.get_table_names():
            logging.info("Таблица group не найдена. Создаем...")
            # Create the group table
            db.create_all()
            logging.info('Таблица group создана')
        
        # Check if group_member table exists
        if 'group_member' not in inspector.get_table_names():
            logging.info("Таблица group_member не найдена. Создаем...")
            # Create the group_member table
            db.create_all()
            logging.info('Таблица group_member создана')
        
        # Check if group_message table exists
        if 'group_message' not in inspector.get_table_names():
            logging.info("Таблица group_message не найдена. Создаем...")
            # Create the group_message table
            db.create_all()
            logging.info('Таблица group_message создана')
        else:
            logging.info("Проверяем наличие новых колонок в таблице group_message...")
            group_message_columns = [column['name'] for column in inspector.get_columns('group_message')]
            
            # Check for file columns in group_message table
            if 'file_path' not in group_message_columns:
                logging.info('Adding file_path column to group_message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE group_message ADD COLUMN file_path VARCHAR(255)"))
                        connection.commit()
                    logging.info('file_path column added successfully to group_message')
                except Exception as column_error:
                    logging.error(f"Error adding file_path column to group_message: {str(column_error)}")
            
            if 'mime_type' not in group_message_columns:
                logging.info('Adding mime_type column to group_message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE group_message ADD COLUMN mime_type VARCHAR(100)"))
                        connection.commit()
                    logging.info('mime_type column added successfully to group_message')
                except Exception as column_error:
                    logging.error(f"Error adding mime_type column to group_message: {str(column_error)}")
            
            if 'original_filename' not in group_message_columns:
                logging.info('Adding original_filename column to group_message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE group_message ADD COLUMN original_filename VARCHAR(255)"))
                        connection.commit()
                    logging.info('original_filename column added successfully to group_message')
                except Exception as column_error:
                    logging.error(f"Error adding original_filename column to group_message: {str(column_error)}")
            
            if 'message_type' not in group_message_columns:
                logging.info('Adding message_type column to group_message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE group_message ADD COLUMN message_type VARCHAR(50)"))
                        connection.commit()
                    logging.info('message_type column added successfully to group_message')
                except Exception as column_error:
                    logging.error(f"Error adding message_type column to group_message: {str(column_error)}")
                    
            # Check for is_edited and edited_at in group_message
            if 'is_edited' not in group_message_columns:
                logging.info('Adding is_edited column to group_message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE group_message ADD COLUMN is_edited BOOLEAN DEFAULT FALSE"))
                        connection.commit()
                    logging.info('is_edited column added successfully to group_message')
                except Exception as column_error:
                    logging.error(f"Error adding is_edited column to group_message: {str(column_error)}")
            
            if 'edited_at' not in group_message_columns:
                logging.info('Adding edited_at column to group_message table')
                try:
                    with db.engine.connect() as connection:
                        connection.execute(text("ALTER TABLE group_message ADD COLUMN edited_at TIMESTAMP"))
                        connection.commit()
                    logging.info('edited_at column added successfully to group_message')
                except Exception as column_error:
                    logging.error(f"Error adding edited_at column to group_message: {str(column_error)}")
        
        logging.info("Схема базы данных проверена и обновлена")
        return True
    except Exception as e:
        db.session.rollback()
        logging.error(f'Ошибка при обновлении схемы базы данных: {str(e)}')
        return False
