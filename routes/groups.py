from flask import Blueprint, request, render_template, redirect, url_for, flash, session, jsonify, current_app
from models.user import db, User, GroupMember, Group, GroupMessage, Contact
import logging
import datetime
import os
from werkzeug.utils import secure_filename
import traceback

# Create blueprint for group routes
groups_bp = Blueprint('groups', __name__)

# Helper function to check allowed file extensions
def allowed_file(filename):
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

@groups_bp.route('/create_group', methods=['GET', 'POST'])
def create_group():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        try:
            logging.debug("Processing group creation request")
            
            # Check if request has form data or JSON data
            if request.content_type and 'multipart/form-data' in request.content_type:
                # Get group details from form data
                name = request.form.get('name', '').strip()
                description = request.form.get('description', '').strip()
                members = request.form.getlist('members')
                
                # Handle avatar file
                avatar_path = None
                if 'avatar' in request.files:
                    avatar_file = request.files['avatar']
                    if avatar_file and avatar_file.filename and avatar_file.filename != '':
                        if allowed_file(avatar_file.filename):
                            # Create a unique filename
                            filename = secure_filename(avatar_file.filename)
                            unique_filename = f"group_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                            
                            # Get file path
                            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
                            
                            # Save the file
                            avatar_file.save(file_path)
                            logging.debug(f"Saved avatar to {file_path}")
                            
                            # Store the path relative to static folder
                            avatar_path = f"avatars/{unique_filename}"
                        else:
                            logging.warning(f"Invalid file extension: {avatar_file.filename}")
            else:
                # Process JSON data
                data = request.get_json()
                name = data.get('name', '').strip()
                description = data.get('description', '').strip()
                members = data.get('members', [])
                avatar_path = None
            
            # Validate input
            if not name:
                logging.warning("Group name is required")
                if request.content_type and 'multipart/form-data' in request.content_type:
                    flash('Group name is required', 'error')
                    return render_template('create_group.html')
                else:
                    return jsonify({'success': False, 'error': 'Group name is required'}), 400
            
            logging.debug(f"Creating group: {name}, with {len(members)} members")
            
            # Create the group
            new_group = Group(
                name=name,
                description=description,
                creator_id=session['user_id'],
                avatar_path=avatar_path
            )
            db.session.add(new_group)
            db.session.flush()  # Flush to get the group ID
            
            # Add creator as admin
            creator_member = GroupMember(
                group_id=new_group.id,
                user_id=session['user_id'],
                role='admin',
                invitation_status='accepted'
            )
            db.session.add(creator_member)
            
            # Add other members
            for member_id in members:
                try:
                    member_id = int(member_id)
                    if member_id != session['user_id']:  # Skip creator, already added
                        member = GroupMember(
                            group_id=new_group.id,
                            user_id=member_id,
                            role='member',
                            invitation_status='invited'  # Set as invited initially
                        )
                        db.session.add(member)
                except (ValueError, TypeError) as e:
                    logging.warning(f"Invalid member ID: {member_id}, error: {str(e)}")
                    continue
            
            db.session.commit()
            logging.debug(f"Group created successfully with ID: {new_group.id}")
            
            if request.content_type and 'multipart/form-data' in request.content_type:
                flash('Group created successfully', 'success')
                return redirect(url_for('main'))
            else:
                return jsonify({'success': True, 'group_id': new_group.id})
            
        except Exception as e:
            db.session.rollback()
            error_msg = f"Error creating group: {str(e)}"
            logging.error(error_msg)
            logging.error(traceback.format_exc())
            
            if request.content_type and 'multipart/form-data' in request.content_type:
                flash('Failed to create group', 'error')
                return render_template('create_group.html')
            else:
                return jsonify({'success': False, 'error': error_msg}), 500
    
    # GET request - display the form
    return render_template('create_group.html')

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
            
            # Include last message info
            last_message_data = None
            if last_message:
                sender = User.query.get(last_message.sender_id)
                sender_name = sender.name if sender else "Unknown"
                last_message_data = {
                    'content': last_message.content,
                    'sender_name': sender_name,
                    'sender_id': last_message.sender_id,
                    'timestamp': last_message.timestamp.isoformat()  # Include timestamp
                }
            
            # Add group to list
            groups.append({
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'member_count': member_count,
                'is_admin': member.role == 'admin',
                'unread_count': 0,  # TODO: Implement unread messages count
                'avatar_path': group.avatar_path,
                'last_message': last_message_data
            })
        
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
            'is_admin': member.role == 'admin',
            'avatar_path': group.avatar_path  # Make sure to include avatar_path in response
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
