/**
 * Handle loading and displaying contacts and conversation
 */

/**
 * Load and display sidebar chats and contacts
 */
function loadSidebar() {
  console.log('Loading sidebar data');
  const contactsList = document.getElementById('contactsList');
  
  if (!contactsList) {
    console.error('Contacts list container not found');
    return;
  }
  
  // Show loading indicator
  contactsList.innerHTML = '<div class="loading-sidebar">Loading chats...</div>';
  
  // Load chats
  fetch('/get_chat_list')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load chat list: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data.success) {
        throw new Error(data.error || 'Failed to load chats');
      }
      
      // Clear the container
      contactsList.innerHTML = '';
      
      // Process chats (there are no separate sections anymore - all in one list)
      const chatList = data.chats || [];
      
      if (chatList.length === 0) {
        // No chats found
        const noChatsMessage = document.createElement('div');
        noChatsMessage.className = 'no-items-message';
        noChatsMessage.textContent = 'No chats yet. Use search to find people.';
        contactsList.appendChild(noChatsMessage);
      } else {
        // Create and add chat items
        chatList.forEach(chat => {
          const chatItem = createChatItem(chat);
          contactsList.appendChild(chatItem);
        });
      }
    })
    .catch(error => {
      console.error('Error loading sidebar:', error);
      
      // Show error message
      contactsList.innerHTML = `
        <div class="sidebar-error">
          Failed to load chats. <a href="#" onclick="loadSidebar(); return false;">Retry</a>
        </div>
      `;
    });
}

/**
 * Create a chat item for the sidebar
 */
function createChatItem(chat) {
  const item = document.createElement('div');
  item.className = 'contact-item conversation-item';
  item.dataset.userId = chat.user_id;
  
  // Avatar (with image or initials)
  const avatar = document.createElement('div');
  avatar.className = 'contact-avatar';
  
  if (chat.avatar_path) {
    const img = document.createElement('img');
    img.src = chat.avatar_path;
    img.alt = chat.name;
    img.onerror = function() {
      this.remove();
      const initials = document.createElement('div');
      initials.className = 'avatar-initials';
      initials.textContent = getInitials(chat.name);
      avatar.appendChild(initials);
    };
    avatar.appendChild(img);
  } else {
    const initials = document.createElement('div');
    initials.className = 'avatar-initials';
    initials.textContent = getInitials(chat.name);
    avatar.appendChild(initials);
  }
  
  // Contact info
  const info = document.createElement('div');
  info.className = 'contact-info';
  
  const name = document.createElement('div');
  name.className = 'contact-name';
  name.textContent = chat.name;
  
  // Last message
  const lastMessage = document.createElement('div');
  lastMessage.className = 'last-message';
  
  const messageText = document.createElement('div');
  messageText.className = 'message-text';
  messageText.textContent = formatMessagePreview(chat.last_message);
  
  const messageTime = document.createElement('div');
  messageTime.className = 'message-time';
  if (chat.last_message_time) {
    messageTime.textContent = formatTimestamp(new Date(chat.last_message_time));
  }
  
  lastMessage.appendChild(messageText);
  lastMessage.appendChild(messageTime);
  
  info.appendChild(name);
  info.appendChild(lastMessage);
  
  // Add elements to item
  item.appendChild(avatar);
  item.appendChild(info);
  
  // Add unread badge if there are unread messages
  if (chat.unread_count && chat.unread_count > 0) {
    const unreadBadge = document.createElement('div');
    unreadBadge.className = 'unread-badge';
    unreadBadge.textContent = chat.unread_count > 99 ? '99+' : chat.unread_count;
    item.appendChild(unreadBadge);
  }
  
  // Add block indicator if needed
  if (chat.is_blocked_by_you) {
    const blockIndicator = document.createElement('div');
    blockIndicator.className = 'block-indicator blocked-by-you';
    blockIndicator.textContent = 'Blocked';
    item.appendChild(blockIndicator);
  } else if (chat.has_blocked_you) {
    const blockIndicator = document.createElement('div');
    blockIndicator.className = 'block-indicator blocked-you';
    blockIndicator.textContent = 'Blocked you';
    item.appendChild(blockIndicator);
  }
  
  // Add contact indicator if this is a contact
  if (chat.is_contact) {
    const contactIndicator = document.createElement('div');
    contactIndicator.className = 'contact-indicator';
    contactIndicator.textContent = 'Contact';
    item.appendChild(contactIndicator);
  }
  
  // Add click event
  item.addEventListener('click', function() {
    // Remove active class from other items
    document.querySelectorAll('.contact-item.active').forEach(el => {
      el.classList.remove('active');
    });
    
    // Add active class to this item
    this.classList.add('active');
    
    // Open chat
    openChat(chat.user_id, chat.name);
  });
  
  return item;
}

/**
 * Update a single chat in the sidebar without refreshing the whole sidebar
 * @param {Object} chatData - The updated chat data
 */
function updateSingleChat(chatData) {
  if (!chatData || !chatData.user_id) {
    console.error('[Contacts] Invalid chat data provided to updateSingleChat');
    return;
  }
  
  console.log('[Contacts] Updating single chat:', chatData.user_id);
  
  // Find the existing chat item
  const contactsList = document.getElementById('contactsList');
  if (!contactsList) return;
  
  const existingItem = contactsList.querySelector(`.contact-item[data-user-id="${chatData.user_id}"]`);
  
  if (existingItem) {
    // If it exists, update its content (last message, time)
    const lastMessageEl = existingItem.querySelector('.message-text');
    const timeEl = existingItem.querySelector('.message-time');
    
    if (lastMessageEl) {
      lastMessageEl.textContent = formatMessagePreview(chatData.last_message) || '';
    }
    
    if (timeEl && chatData.last_message_time) {
      timeEl.textContent = formatTimestamp(new Date(chatData.last_message_time));
    }
    
    // Update unread badge if needed
    const unreadBadge = existingItem.querySelector('.unread-badge');
    if (chatData.unread_count && chatData.unread_count > 0) {
      if (unreadBadge) {
        unreadBadge.textContent = chatData.unread_count > 99 ? '99+' : chatData.unread_count;
      } else {
        const newBadge = document.createElement('div');
        newBadge.className = 'unread-badge';
        newBadge.textContent = chatData.unread_count > 99 ? '99+' : chatData.unread_count;
        existingItem.appendChild(newBadge);
      }
    } else if (unreadBadge) {
      unreadBadge.remove();
    }
    
    // Move to top of conversations without animation
    // Instead of cloning and replacing with animation, we'll just move the element
    if (contactsList.firstChild && existingItem !== contactsList.firstChild) {
      contactsList.insertBefore(existingItem, contactsList.firstChild);
    }
  } else {
    // If it doesn't exist, we'll need to refresh the sidebar
    // This should be rare, only when starting a new conversation
    console.log('[Contacts] Chat not found in sidebar, refreshing');
    loadSidebar();
  }
}

/**
 * Format timestamp for sidebar display
 */
function formatTimestamp(date) {
  if (!date) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if the date is today
  if (date >= today) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if the date is yesterday
  if (date >= yesterday) {
    return 'Yesterday';
  }
  
  // Otherwise show day name for this week, or date for older
  const dayDiff = Math.round((today - date) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  
  // For older messages
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format message preview for the sidebar
 */
function formatMessagePreview(message) {
  if (!message) return '';
  
  // Check if this is a file message
  if (message.startsWith('FILE:')) {
    const parts = message.split(':');
    const fileName = parts[2] || 'File';
    return `📎 ${fileName}`;
  }
  
  // Limit length
  if (message.length > 30) {
    return message.substring(0, 30) + '...';
  }
  
  return message;
}

/**
 * Get initials from a name
 */
function getInitials(name) {
  if (!name) return '?';
  
  // Split the name and get the first letter of each part
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  } else {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
}

// Initialize contacts when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Load sidebar
  loadSidebar();
  
  // Set up periodic refresh
  setInterval(loadSidebar, 30000);
});
