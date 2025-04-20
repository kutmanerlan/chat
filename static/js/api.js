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
 * Load message history
 */
function fetchMessages(userId) {
  return fetch(`/get_messages?user_id=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to load messages');
    return response.json();
  });
}

/**
 * Send a message
 */
function sendMessage(recipientId, content) {
  return fetch('/send_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_id: recipientId,
      content: content
    })
  })
  .then(response => {
    if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
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
 * Update user profile
 */
function updateProfile(formData) {
  return fetch('/update_profile', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  });
}

/**
 * Upload avatar
 */
function uploadAvatar(file) {
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showErrorNotification('File is too large. Maximum size is 5MB.');
    return Promise.reject(new Error('File too large'));
  }
  
  // Create form data
  const formData = new FormData();
  formData.append('avatar', file);
  
  // Send to server
  return fetch('/upload_avatar', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Failed to upload avatar');
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
