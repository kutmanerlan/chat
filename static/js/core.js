/**
 * Core application functionality 
 * This file contains the main application logic, state management, and initialization
 */

// Application state and initialization
let ChatApp = {
    // Application state
    currentUserId: null,
    currentUserName: null,
    currentUserAvatar: null,
    currentChat: null,
    contacts: [],
    chats: [],
    currentPage: 1,
    hasMoreMessages: false,
    isInitialized: false,
    
    // Debug mode
    debug: true,
    
    // Initialize the application
    init: function() {
        this.log('Initializing ChatApp...');
        
        // Initialize application state
        this.resetState();
        
        // Get current user info
        this.loadCurrentUserInfo()
            .then(() => {
                // Only load sidebar after we have user info
                this.log('Loading sidebar with user data...');
                loadSidebar();
                
                // Mark as initialized
                this.isInitialized = true;
                this.log('ChatApp initialization complete');
                
                // Dispatch an event that initialization is complete
                document.dispatchEvent(new CustomEvent('chat-app-initialized'));
            })
            .catch(error => {
                console.error('Failed to initialize ChatApp:', error);
                showErrorNotification('Failed to initialize the application. Please refresh the page.');
            });
        
        // Initialize event listeners
        this.initEventListeners();
    },
    
    // Reset application state
    resetState: function() {
        this.currentUserId = null;
        this.currentUserName = null;
        this.currentUserAvatar = null;
        this.currentChat = null;
        this.contacts = [];
        this.chats = [];
        this.currentPage = 1;
        this.hasMoreMessages = false;
    },
    
    // Load current user information
    loadCurrentUserInfo: function() {
        return new Promise((resolve, reject) => {
            fetchCurrentUserInfo()
                .then(data => {
                    if (data && data.user_id) {
                        this.currentUserId = data.user_id;
                        this.currentUserName = data.user_name;
                        this.currentUserAvatar = data.avatar_path;
                        this.log('User data loaded:', this.currentUserName);
                        resolve(data);
                    } else {
                        reject(new Error('Invalid user data received'));
                    }
                })
                .catch(error => {
                    console.error('Failed to load current user info:', error);
                    reject(error);
                });
        });
    },
    
    // Initialize event listeners
    initEventListeners: function() {
        // Add event listener for manually refreshing the sidebar
        document.addEventListener('refresh-sidebar', () => {
            this.log('Refresh sidebar event received');
            loadSidebar();
        });
        
        // Add error handler for uncaught exceptions
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            // Only show notification if we're initialized
            if (this.isInitialized) {
                showErrorNotification('An error occurred. Please check the console for details.');
            }
        });
        
        // Add event listener for online/offline events
        window.addEventListener('online', () => {
            this.log('Application is back online');
            showSuccessNotification('You are back online');
            
            // Refresh data when back online
            if (this.isInitialized) {
                loadSidebar();
            }
        });
        
        window.addEventListener('offline', () => {
            this.log('Application is offline');
            showErrorNotification('You are offline. Some features may not work.');
        });
    },
    
    // Log messages in debug mode
    log: function(message, ...args) {
        if (this.debug) {
            console.log(`[ChatApp] ${message}`, ...args);
        }
    },
    
    // Handle errors
    handleError: function(error, context) {
        console.error(`Error in ${context}:`, error);
        if (typeof showErrorNotification === 'function') {
            showErrorNotification(`Error: ${error.message || 'Unknown error'}`);
        }
    },
    
    // Retry a failed operation
    retry: function(operation, maxRetries = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const attempt = () => {
                attempts++;
                this.log(`Attempt ${attempts} for operation: ${operation.name}`);
                
                operation()
                    .then(resolve)
                    .catch(error => {
                        if (attempts < maxRetries) {
                            this.log(`Retrying in ${delay}ms...`);
                            setTimeout(attempt, delay);
                        } else {
                            this.log('Maximum retries reached, giving up.');
                            reject(error);
                        }
                    });
            };
            
            attempt();
        });
    }
};

// Helper functions for date and time formatting
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '';
        }
        
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    } catch (e) {
        console.error('Error formatting timestamp:', e);
        return '';
    }
}

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

// Deep clone an object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    
    const cloned = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    
    return cloned;
}

// Debounce function to limit function calls
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing ChatApp...');
    
    // Check if all required scripts are loaded
    const requiredFunctions = [
        'fetchCurrentUserInfo',
        'loadSidebar',
        'showErrorNotification',
        'showSuccessNotification'
    ];
    
    const missingFunctions = requiredFunctions.filter(
        fn => typeof window[fn] !== 'function'
    );
    
    if (missingFunctions.length > 0) {
        console.error('Missing required functions:', missingFunctions);
        alert(`Failed to initialize: Missing required functions. Try refreshing the page.`);
        return;
    }
    
    // Initialize the application
    if (typeof ChatApp !== 'undefined') {
        ChatApp.init();
    } else {
        console.error('ChatApp is not defined. Check if core.js is loaded properly.');
        alert('Failed to initialize the application. Please refresh the page.');
    }
});
