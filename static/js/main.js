/**
 * Main JavaScript entry point that imports all other modules
 */

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the application
  initializeChat();
  
  // Setup create group button (now in the side menu)
  setupCreateGroupButton();
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
    })
    .catch(error => {
      console.error('Failed to initialize chat:', error);
      showErrorNotification('Failed to initialize chat. Please refresh the page.');
    });
}

/**
 * Setup create group button functionality
 */
function setupCreateGroupButton() {
  const createGroupBtn = document.getElementById('createGroupBtn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the create group page/modal
      window.location.href = '/create_group';
    });
  }
}

// ...existing code...
