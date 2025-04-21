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
  
  // Add debug button
  if (typeof addDebugButton === 'function') {
    addDebugButton();
  }
  
  // Fetch current user information first
  fetchCurrentUser()
    .then(() => {
      // Load sidebar with contacts and chats
      loadSidebar();
      
      // Setup event listeners
      setupEventListeners();
    })
    .catch(error => {
      console.error('Failed to initialize chat:', error);
      showErrorNotification('Failed to initialize chat. Please refresh the page.');
    });
}

// ...existing code...
