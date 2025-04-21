/**
 * Main JavaScript entry point that imports all other modules
 */

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the application
  initializeChat();
  
  // Initialize debug panel if available
  if (typeof initDebugPanel === 'function') {
    initDebugPanel();
  }
});

/**
 * Initialize the chat application
 */
function initializeChat() {
  console.log('Initializing chat application...');
  
  // Fetch current user information first
  fetchCurrentUser()
    .then(() => {
      // Load sidebar with contacts and chats
      loadSidebar();
      
      // Setup event listeners
      setupEventListeners();
      
      // Setup auto-restoration of deleted chats
      setupDeletedChatRestoration();
    })
    .catch(error => {
      console.error('Failed to initialize chat:', error);
      showErrorNotification('Failed to initialize chat. Please refresh the page.');
    });
}

/**
 * Set up periodic check for new messages in deleted chats to restore them
 */
function setupDeletedChatRestoration() {
  // Check every 30 seconds for new messages in deleted chats
  setInterval(() => {
    // Only run if we have deleted chats
    try {
      const deletedChats = JSON.parse(localStorage.getItem('deletedChats') || '[]');
      if (deletedChats.length === 0) return;
      
      // Check for new messages in each deleted chat
      fetch('/check_new_messages_in_chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ user_ids: deletedChats })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.chats_with_new_messages) {
          // Get chats with new messages
          const chatsToRestore = data.chats_with_new_messages;
          
          if (chatsToRestore.length > 0) {
            console.log(`Found new messages in ${chatsToRestore.length} deleted chats:`, chatsToRestore);
            
            // Remove these chats from the deleted list
            const updatedDeletedChats = deletedChats.filter(id => !chatsToRestore.includes(id));
            localStorage.setItem('deletedChats', JSON.stringify(updatedDeletedChats));
            
            // Reload sidebar to show restored chats
            loadSidebar();
            
            // Show notification
            showNotification('New messages received in previously deleted chats', 'info');
          }
        }
      })
      .catch(error => {
        console.error('Error checking for new messages in deleted chats:', error);
      });
    } catch (error) {
      console.error('Error processing deleted chats:', error);
    }
  }, 30000); // Check every 30 seconds
}

// ...existing code...
