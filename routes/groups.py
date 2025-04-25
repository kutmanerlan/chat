from flask import Blueprint, request, render_template, redirect, url_for, flash, session, jsonify
from models.user import db, User, GroupMember, Group, GroupMessage, Contact
import logging
import datetime

# Create blueprint for group routes - create without URL prefix
groups_bp = Blueprint('groups', __name__)

# Ensure this route matches what frontend expects
@groups_bp.route('/get_user_groups')
def get_user_groups():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get groups where the user is a member
        member_records = GroupMember.query.filter_by(
            user_id=session['user_id'],
            invitation_status='accepted'
        ).all()
        
        groups = []
        for member in member_records:
            group = member.group
            
            # Count members
            member_count = GroupMember.query.filter_by(
                group_id=group.id,
                invitation_status='accepted'
            ).count()
            
            # Get last message
            last_message = GroupMessage.query.filter_by(
                group_id=group.id
            ).order_by(GroupMessage.timestamp.desc()).first()
            
            # Calculate unread messages
            # This needs a way to track last read timestamp per user-group
            unread_count = 0
            
            # Check if user is admin
            is_admin = member.role == 'admin'
            
            group_info = {
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'member_count': member_count,
                'is_admin': is_admin,
                'unread_count': unread_count
            }
            
            # Add last message info if exists
            if last_message:
                sender = User.query.get(last_message.sender_id)
                group_info['last_message'] = {
                    'content': last_message.content,
                    'timestamp': last_message.timestamp.isoformat(),
                    'sender_id': last_message.sender_id,
                    'sender_name': sender.name if sender else 'Unknown'
                }
            
            groups.append(group_info)
        
        # Sort by last message time, newest first
        groups.sort(
            key=lambda g: g.get('last_message', {}).get('timestamp', ''),
            reverse=True
        )
        
        return jsonify({'success': True, 'groups': groups})
    except Exception as e:
        logging.error(f"Error getting user groups: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

# Import Contact for the users_for_group function
@groups_bp.route('/get_users_for_group')
def get_users_for_group():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get users from contacts
        contacts = Contact.query.filter_by(user_id=session['user_id']).all()
        users = []
        
        for contact in contacts:
            user = User.query.get(contact.contact_id)
            if user:
                users.append({
                    'id': user.id,
                    'name': user.name,
                    'avatar_path': user.avatar_path if hasattr(user, 'avatar_path') else None
                })
        
        return jsonify({'success': True, 'users': users})
    except Exception as e:
        logging.error(f"Error getting users for group: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

@groups_bp.route('/get_group_info')
def get_group_info():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    group_id = request.args.get('group_id')
    if not group_id:
        return jsonify({'error': 'Group ID is required'}), 400
    
    try:
        # Get the group
        group = Group.query.get(group_id)
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        # Check if user is a member
        member = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=session['user_id'],
            invitation_status='accepted'
        ).first()
        
        if not member:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        # Get all accepted members
        members_query = GroupMember.query.filter_by(
            group_id=group_id,
            invitation_status='accepted'
        ).all()
        
        members = []
        for member_record in members_query:
            user = User.query.get(member_record.user_id)
            if user:
                members.append({
                    'id': user.id,
                    'name': user.name,
                    'avatar_path': user.avatar_path if hasattr(user, 'avatar_path') else None,
                    'role': member_record.role
                })
        
        # Get group info
        group_info = {
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'creator_id': group.creator_id,
            'members': members,
            'member_count': len(members),
            'is_admin': member.role == 'admin'
        }
        
        return jsonify({'success': True, 'group': group_info})
    except Exception as e:
        logging.error(f"Error getting group info: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

@groups_bp.route('/get_group_messages')
def get_group_messages():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    group_id = request.args.get('group_id')
    if not group_id:
        return jsonify({'error': 'Group ID is required'}), 400
    
    try:
        # Check if user is a member
        member = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=session['user_id'],
            invitation_status='accepted'
        ).first()
        
        if not member:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        # Get messages for the group
        messages_query = GroupMessage.query.filter_by(
            group_id=group_id
        ).order_by(GroupMessage.timestamp.asc())
        
        messages = [message.to_dict() for message in messages_query.all()]
        
        # Get all group members for displaying names
        members_query = GroupMember.query.filter_by(
            group_id=group_id,
            invitation_status='accepted'
        ).all()
        
        members = []
        for member_record in members_query:
            user = User.query.get(member_record.user_id)
            if user:
                members.append({
                    'id': user.id,
                    'name': user.name
                })
        
        return jsonify({
            'success': True,
            'messages': messages,
            'members': members
        })
    except Exception as e:
        logging.error(f"Error getting group messages: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

@groups_bp.route('/send_group_message', methods=['POST'])
def send_group_message():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        group_id = data.get('group_id')
        content = data.get('content')
        
        if not group_id or not content:
            return jsonify({'error': 'Group ID and content are required'}), 400
        
        # Check if user is a member
        member = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=session['user_id'],
            invitation_status='accepted'
        ).first()
        
        if not member:
            return jsonify({'error': 'You are not a member of this group'}), 403
        
        # Create new message
        new_message = GroupMessage(
            group_id=group_id,
            sender_id=session['user_id'],
            content=content
        )
        
        db.session.add(new_message)
        db.session.commit()
        
        # Get sender info for response
        sender = User.query.get(session['user_id'])
        
        # Return the message with sender info
        message_dict = new_message.to_dict()
        message_dict['sender_name'] = sender.name if sender else 'Unknown'
        
        return jsonify({
            'success': True,
            'message': message_dict
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error sending group message: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

@groups_bp.route('/edit_group_message', methods=['POST'])
def edit_group_message():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'}), 401
    try:
        data = request.get_json()
        message_id = data.get('message_id')
        content = data.get('content')
        
        if not message_id or not content or not content.strip():
            return jsonify({'success': False, 'error': 'Message ID and content are required'}), 400
        
        # Find the message
        message = GroupMessage.query.get(message_id)
        if not message:
            return jsonify({'success': False, 'error': 'Message not found'}), 404
        
        # Check if user is the sender
        if message.sender_id != session['user_id']:
            return jsonify({'success': False, 'error': 'You can only edit your own messages'}), 403
        
        # Update message
        message.content = content
        message.is_edited = True
        message.edited_at = datetime.datetime.now()
        
        db.session.commit()
        
        # Return updated message
        updated_message = message.to_dict()
        # Add sender name
        sender = User.query.get(session['user_id'])
        updated_message['sender_name'] = sender.name if sender else 'Unknown'
        
        return jsonify({
            'success': True,
            'message': updated_message
        })
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error editing group message: {str(e)}")
        return jsonify({'success': False, 'error': 'Server error'}), 500
