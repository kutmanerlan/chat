from app import app, db
from models.user import User

def clear_database():
    print("Начинаем очистку базы данных...")
    try:
        with app.app_context():
            # Удаление всех пользователей
            num_users = User.query.delete()
            print(f"Удалено пользователей: {num_users}")
            
            # Если в проекте есть другие модели, их также можно удалить здесь
            # например: Message.query.delete()
            
            # Сохраняем изменения
            db.session.commit()
            print("База данных успешно очищена")
    
    except Exception as e:
        print(f"Ошибка при очистке базы данных: {str(e)}")
        db.session.rollback()

if __name__ == "__main__":
    clear_database()
