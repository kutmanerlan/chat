/**
 * API communication functions for interacting with the server
 */

/**
 * Fetch current user information
 */
function fetchCurrentUser() {
  return fetch('/get_current_user_info', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to fetch user info');
    return response.json();
  })
  .then(data => {
    ChatApp.currentUser = data;
    console.log('Current user loaded:', ChatApp.currentUser);
    
    // Update UI with user information
    updateUserInterface(data);
    return data;
  });
}

/**
 * Get user information by ID
 */
function getUserInfo(userId) {
  return fetch(`/get_user_info?user_id=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to get user info');
    return response.json();
  });
}

/**
 * Check if a user is in contacts
 */
function checkContactStatus(userId) {
  return fetch('/check_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to check contact status');
    return response.json();
  })
  .then(data => {
    return data.is_contact;
  })
  .catch(error => {
    console.error('Error checking contact status:', error);
    return false;
  });
}

/**
 * Check if the user is blocked
 */
function checkBlockStatus(userId) {
  // Add cache-busting parameter to ensure we get fresh data
  const cacheBuster = Date.now();
  
  return fetch(`/check_block_status?_=${cacheBuster}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to check block status');
    return response.json();
  })
  .then(data => {
    console.log(`Block API response for user ${userId}:`, data);
    return {
      isBlocked: data.is_blocked_by_you || false,
      hasBlockedYou: data.has_blocked_you || false
    };
  })
  .catch(error => {
    console.error('Error checking block status:', error);
    return { isBlocked: false, hasBlockedYou: false };
  });
}

/**
 * Block a user
 */
function blockUser(userId) {
  return fetch('/block_user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to block user');
    return response.json();
  });
}

/**
 * Unblock a user
 */
function unblockUser(userId) {
  return fetch('/unblock_user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to unblock user');
    return response.json();
  });
}

/**
 * Search users by query
 */
function searchUsers(query) {
  return fetch(`/search_users?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  });
}

/**
 * Load message history with pagination
 * @param {number} userId - User ID to load messages for
 * @param {number} page - Page number (starting from 1)
 * @param {number} limit - Number of messages per page
 */
function fetchMessages(userId, page = 1, limit = 30, lastMessageId = 0) {
    let url = `/get_messages?user_id=${userId}&page=${page}&limit=${limit}`;
    
    if (lastMessageId > 0) {
        url += `&last_message_id=${lastMessageId}`;
    }
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            return response.json();
        });
}

/**
 * Fetch new messages since a specific message ID
 * Uses cache-busting to ensure fresh data
 */
function fetchNewMessages(userId, lastMessageId) {
  const cacheBuster = Date.now(); // Add timestamp to prevent caching
  return fetch(`/get_messages?user_id=${userId}&last_message_id=${lastMessageId}&_=${cacheBuster}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load new messages');
    return response.json();
  });
}

/**
 * Send a message
 */
function sendMessage(userId, content) {
    return fetch('/send_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            recipient_id: userId,
            content: content
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        return response.json();
    });
}

/**
 * Edit a message
 */
function editMessage(messageId, content) {
    return fetch('/edit_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message_id: messageId,
            content: content
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to edit message');
        }
        return response.json();
    });
}

/**
 * Get recent conversations
 */
function fetchRecentConversations() {
  return fetch('/get_recent_conversations', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load conversations');
    return response.json();
  });
}

/**
 * Get chat list from server
 */
function fetchChatList() {
    console.log('Fetching chat list...');
    
    return fetch('/get_chat_list', {
        method: 'GET',
        headers: {
            'Cache-Control': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Additional debugging
        console.log('Chat list response:', data);
        
        if (!data.success) {
            console.error('API reported error:', data.error);
            throw new Error(data.error || 'Unknown API error');
        }
        
        // Ensure we have a valid chats array
        if (!Array.isArray(data.chats)) {
            console.warn('Invalid chats data, using empty array');
            data.chats = [];
        }
        
        return data;
    })
    .catch(error => {
        console.error('Error in fetchChatList:', error);
        // Throw the error to be handled by the caller
        throw error;
    });
}

/**
 * Get user contacts
 */
function fetchContacts() {
  return fetch('/get_contacts', {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load contacts');
    return response.json();
  })
  .then(data => {
    // Ensure the data structure is valid even if empty
    if (!data.contacts) {
      data.contacts = [];
      console.log('No contacts data found, using empty array');
    }
    return data;
  })
  .catch(error => {
    console.error('Error in fetchContacts:', error);
    // Return a valid but empty response object
    return { success: true, contacts: [] };
  });
}

/**
 * Update user profile
 */
function updateProfile(formData) {
    return fetch('/update_profile', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        return response.json();
    });
}

/**
 * Upload avatar
 */
function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return fetch('/upload_avatar', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }
        return response.json();
    });
}

/**
 * Add a user to contacts
 */
function addToContacts(userId) {
  return fetch('/add_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to add contact');
    return response.json();
  });
}

/**
 * Remove a user from contacts
 */
function removeFromContacts(userId) {
  return fetch('/remove_contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_id: userId })
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to remove contact');
    return response.json();
  });
}

/**
 * Helper function to escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}
