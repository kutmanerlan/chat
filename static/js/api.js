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
 * Fetch messages for a conversation
 */
function fetchMessages(userId, page = 1, limit = 30, lastMessageId = 0) {
    console.log(`[API] Fetching messages for user ${userId}, page ${page}, limit ${limit}`);
    
    if (!userId) {
        console.error('[API] fetchMessages called without a user ID');
        return Promise.reject(new Error('User ID is required'));
    }
    
    let url = `/get_messages?user_id=${userId}&page=${page}&limit=${limit}`;
    
    if (lastMessageId > 0) {
        url += `&last_message_id=${lastMessageId}`;
    }
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch messages: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`[API] Fetched ${data.messages ? data.messages.length : 0} messages for user ${userId}`);
            return data;
        })
        .catch(error => {
            console.error('[API] Error fetching messages:', error);
            throw error;
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
 * Send a message to a user
 */
function sendMessage(userId, content) {
    console.log(`[API] Sending message to user ${userId}`);
    
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
            throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error('[API] Error sending message:', error);
        throw error;
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
    if (!text) return '';
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

/**
 * Store user ID in body data attribute for access in all scripts
 */
function storeUserIdInDOM() {
    fetch('/get_current_user_info')
        .then(response => response.json())
        .then(data => {
            if (data && data.user_id) {
                document.body.setAttribute('data-user-id', data.user_id);
                console.log('[API] Stored user ID in DOM data attribute');
            }
        })
        .catch(error => {
            console.error('[API] Failed to store user ID:', error);
        });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    storeUserIdInDOM();
});
