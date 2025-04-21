/**
 * Core functionality and application state management
 */

// Global application state
const ChatApp = {
  currentUser: null,
  activeChat: null,
  conversations: [],
  contacts: [],
  messagePollingInterval: null,
  eventListenersActive: false,
  resetInactiveTimeFunc: null,
  pollInterval: 5000,
  maxPollInterval: 10000,
  minPollInterval: 3000,
  inactiveTime: 0,
  consecutiveEmptyPolls: 0,
  lastBlockCheck: 0,
  messagePage: 1,
  messageLimit: 30,
  hasMoreMessages: true,
  currentChatId: null
};

/**
 * Initialize the Chat Application
 */
function initializeChat() {
  console.log('Initializing chat application...');
  
  // Fetch current user information first
  fetchCurrentUser()
    .then(() => {
      loadContacts();
      loadRecentConversations();
      setupEventListeners();
    })
    .catch(error => {
      console.error('Failed to initialize chat:', error);
      showErrorNotification('Failed to initialize chat. Please refresh the page.');
    });
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Setup search functionality
  setupSearch();
  
  // Setup UI menu buttons
  setupMenuButtons();
  
  // Setup avatar upload
  setupAvatarUpload();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Handle cleanup when switching chats or leaving the app
 */
function cleanupChatResources() {
  // Stop polling
  if (ChatApp.messagePollingInterval) {
    clearInterval(ChatApp.messagePollingInterval);
    ChatApp.messagePollingInterval = null;
  }
  
  // Remove event listeners
  if (ChatApp.eventListenersActive && ChatApp.resetInactiveTimeFunc) {
    document.removeEventListener('mousemove', ChatApp.resetInactiveTimeFunc);
    document.removeEventListener('keydown', ChatApp.resetInactiveTimeFunc);
    document.removeEventListener('click', ChatApp.resetInactiveTimeFunc);
    ChatApp.eventListenersActive = false;
  }
  
  // Clear any open menus
  const menus = document.querySelectorAll('.dropdown-menu, .file-upload-menu, .message-context-menu');
  menus.forEach(menu => menu.remove());
  
  // Clear any edit states
  const editButtons = document.querySelectorAll('.message-edit-buttons');
  editButtons.forEach(btn => btn.remove());
  
  // Clear any tooltips
  const tooltips = document.querySelectorAll('.dynamic-tooltip');
  tooltips.forEach(tooltip => tooltip.remove());

  console.log('Chat resources cleaned up');
}

// Add window unload event to clean up resources
window.addEventListener('beforeunload', cleanupChatResources);
