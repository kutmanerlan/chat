import xmlrpc.client
from models.user import Message
import logging

# Настройка логирования
logging.basicConfig(
    filename='odoo_sync.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Параметры подключения к Odoo
ODOO_URL = 'http://localhost:8069'  # URL вашего Odoo сервера
ODOO_DB = 'messenger_db'  # Имя базы данных Odoo
ODOO_USER = 'admin'  # Имя пользователя Odoo
ODOO_PASSWORD = 'admin'  # Пароль пользователя Odoo

def send_message_to_odoo(message):
    """
    Отправляет сообщение (объект Message) в Odoo через XML-RPC API.
    """
    try:
        common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
        if not uid:
            logging.error("Ошибка аутентификации в Odoo")
            return False
        models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

        vals = {
            'sender_id': message.sender_id,
            'sender_name': message.sender_name if hasattr(message, 'sender_name') else '',
            'recipient_id': message.recipient_id if hasattr(message, 'recipient_id') else '',
            'recipient_name': message.recipient_name if hasattr(message, 'recipient_name') else '',
            'group_ext_id': '',
            'group_name': '',
            'content': message.content,
            'timestamp': message.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'message_type': message.message_type,
            'is_read': False,
            'attachments_count': message.attachments_count if hasattr(message, 'attachments_count') else 0,
            'language': message.language if hasattr(message, 'language') else 'en'
        }

        message_id = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'messenger.message', 'create',
            [vals]
        )
        logging.info(f"Сообщение успешно отправлено в Odoo. ID: {message_id}")
        return True
    except Exception as e:
        logging.error(f"Ошибка при отправке сообщения в Odoo: {str(e)}")
        return False

def send_group_message_to_odoo(group_message):
    """
    Отправляет групповое сообщение (объект GroupMessage) в Odoo через XML-RPC API.
    """
    try:
        common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
        if not uid:
            logging.error("Ошибка аутентификации в Odoo")
            return False
        models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

        # Получаем название группы, если есть
        group_name = ''
        if hasattr(group_message, 'group_id') and group_message.group_id:
            from models.user import Group
            group = Group.query.get(group_message.group_id)
            group_name = group.name if group else ''

        vals = {
            'sender_id': group_message.sender_id,
            'sender_name': group_message.sender_name if hasattr(group_message, 'sender_name') else '',
            'recipient_id': '',
            'recipient_name': '',
            'group_ext_id': f'group_{group_message.group_id}' if hasattr(group_message, 'group_id') and group_message.group_id else '',
            'group_name': group_name,
            'content': group_message.content,
            'timestamp': group_message.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'message_type': group_message.message_type,
            'is_read': False,
            'attachments_count': group_message.attachments_count if hasattr(group_message, 'attachments_count') else 0,
            'language': group_message.language if hasattr(group_message, 'language') else 'en'
        }

        message_id = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'messenger.message', 'create',
            [vals]
        )
        logging.info(f"Групповое сообщение успешно отправлено в Odoo. ID: {message_id}")
        return True
    except Exception as e:
        logging.error(f"Ошибка при отправке группового сообщения в Odoo: {str(e)}")
        return False

def send_group_to_odoo(group, admin_users, member_users):
    """
    Отправляет/обновляет группу в Odoo через XML-RPC API.
    group — объект Group из вашей модели
    admin_users — список User-объектов (админы)
    member_users — список User-объектов (все участники)
    """
    try:
        common = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/common')
        uid = common.authenticate(ODOO_DB, ODOO_USER, ODOO_PASSWORD, {})
        if not uid:
            logging.error("Ошибка аутентификации в Odoo")
            return False
        models = xmlrpc.client.ServerProxy(f'{ODOO_URL}/xmlrpc/2/object')

        vals = {
            'group_ext_id': group.id,
            'name': group.name,
            'description': group.description,
            'creator_id': group.creator_id,
            'creator_name': group.creator.name if hasattr(group, 'creator') and group.creator else '',
            'admin_ids': ','.join(str(u.id) for u in admin_users),
            'admin_names': ','.join(u.name for u in admin_users),
            'member_ids': ','.join(str(u.id) for u in member_users),
            'member_names': ','.join(u.name for u in member_users),
            'members_count': len(member_users),
            'created_at': group.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(group, 'created_at') and group.created_at else '',
        }

        # Создать или обновить (по group_ext_id)
        group_ids = models.execute_kw(
            ODOO_DB, uid, ODOO_PASSWORD,
            'messenger.group', 'search',
            [[['group_ext_id', '=', group.id]]]
        )
        if group_ids:
            models.execute_kw(
                ODOO_DB, uid, ODOO_PASSWORD,
                'messenger.group', 'write',
                [group_ids, vals]
            )
            logging.info(f"Группа обновлена в Odoo. ID: {group_ids[0]}")
        else:
            group_id = models.execute_kw(
                ODOO_DB, uid, ODOO_PASSWORD,
                'messenger.group', 'create',
                [vals]
            )
            logging.info(f"Группа создана в Odoo. ID: {group_id}")
        return True
    except Exception as e:
        logging.error(f"Ошибка при отправке группы в Odoo: {str(e)}")
        return False