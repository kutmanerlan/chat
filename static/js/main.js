/**
 * Main JavaScript entry point that imports all other modules
 */

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');
  
  // Initialize the application
  ChatApp.init();
  
  // Set up menu button
  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');
  const overlay = document.getElementById('overlay');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  
  if (menuBtn && sideMenu && overlay && closeMenuBtn) {
    // Open menu
    menuBtn.addEventListener('click', function() {
      sideMenu.classList.add('active');
      overlay.classList.add('active');
    });
    
    // Close menu
    closeMenuBtn.addEventListener('click', function() {
      sideMenu.classList.remove('active');
      overlay.classList.remove('active');
    });
    
    // Close menu when clicking overlay
    overlay.addEventListener('click', function() {
      sideMenu.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
  
  // Force immediate sidebar refresh to diagnose issues
  setTimeout(() => {
    console.log('Triggering delayed sidebar refresh for troubleshooting');
    loadSidebar();
  }, 1000);
});

/**
 * Initialize the chat application
 */
function initializeChat() {
  console.log('Initializing chat application...');
  
  // Remove debug button initialization - this was causing the button to appear
  
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
