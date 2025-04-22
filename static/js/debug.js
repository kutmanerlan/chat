/**
 * Debugging utilities for monitoring message updates
 */

// Debug state
const DEBUG_MODE = false; // Set to false to hide debug features by default

// Debug panel state
let debugPanelVisible = false;

/**
 * Initialize debug features
 */
function initDebugPanel() {
    // Don't create debug elements if debug mode is disabled
    if (!DEBUG_MODE) {
        // Remove any existing debug elements
        removeExistingDebugElements();
        return;
    }

    // Check for debug mode in URL
    const urlParams = new URLSearchParams(window.location.search);
    ChatDebug.enabled = urlParams.get('debug') === 'true';
    
    if (!ChatDebug.enabled) {
        // Even if debug panel is not enabled, add basic click debugging
        setupClickDebugging();
        return;
    }
    
    console.log('Debug mode enabled');
    
    // Create debug container
    const debugContainer = document.createElement('div');
    debugContainer.className = 'debug-panel';
    debugContainer.innerHTML = `
      <div class="debug-header">
        <h3>Debug Panel</h3>
        <button class="debug-close-btn">×</button>
      </div>
      <div class="debug-content">
        <div class="debug-section">
          <h4>Message Polling</h4>
          <div class="debug-item">Last poll: <span id="lastPoll">Never</span></div>
          <div class="debug-item">New messages: <span id="newMessages">0</span></div>
          <div class="debug-item">Block checks: <span id="blockChecks">0</span></div>
        </div>
        <div class="debug-section">
          <button id="triggerPoll" class="debug-btn">Force Poll</button>
          <button id="clearDebug" class="debug-btn">Clear Counters</button>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(debugContainer);
    ChatDebug.container = debugContainer;
    
    // Add event listeners
    document.querySelector('.debug-close-btn').addEventListener('click', () => {
      debugContainer.classList.toggle('minimized');
    });
    
    document.getElementById('triggerPoll').addEventListener('click', () => {
      if (ChatApp.activeChat) {
        checkForNewMessages(ChatApp.activeChat.id);
        checkForBlockUpdates(ChatApp.activeChat.id);
        updateDebugInfo('Manual poll triggered');
      } else {
        updateDebugInfo('No active chat to poll');
      }
    });
    
    document.getElementById('clearDebug').addEventListener('click', () => {
      ChatDebug.newMessageCount = 0;
      ChatDebug.blockCheckCount = 0;
      updateDebugDisplay();
    });
}

/**
 * Remove any existing debug elements
 */
function removeExistingDebugElements() {
    // Remove debug button
    const debugButton = document.getElementById('debugButton');
    if (debugButton) {
        debugButton.remove();
    }

    // Remove debug panel
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        debugPanel.remove();
    }
}

/**
 * Setup basic click debugging
 */
function setupClickDebugging() {
  // Add global click handler to log contact clicks
  document.addEventListener('click', function(e) {
    // Check if clicked element or its parent is a contact item
    let target = e.target;
    let contactItem = null;
    
    // Search up to 5 levels up for a contact item
    for (let i = 0; i < 5; i++) {
      if (!target) break;
      
      if (target.classList && target.classList.contains('contact-item')) {
        contactItem = target;
        break;
      }
      
      target = target.parentElement;
    }
    
    if (contactItem) {
      console.log('Contact item clicked:', {
        userId: contactItem.dataset.userId,
        contactId: contactItem.dataset.contactId,
        classList: contactItem.className
      });
    }
  });
}

/**
 * Update debug information
 */
function updateDebugInfo(action) {
  if (!ChatDebug.enabled) return;
  
  const now = new Date();
  const timeString = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
  ChatDebug.lastPollTime = timeString;
  
  updateDebugDisplay();
  
  console.log(`[DEBUG ${timeString}] ${action}`);
}

/**
 * Update debug display
 */
function updateDebugDisplay() {
  if (!ChatDebug.enabled) return;
  
  document.getElementById('lastPoll').textContent = ChatDebug.lastPollTime || 'Never';
  document.getElementById('newMessages').textContent = ChatDebug.newMessageCount;
  document.getElementById('blockChecks').textContent = ChatDebug.blockCheckCount;
}

/**
 * Log new messages received
 */
function logNewMessages(count) {
  if (!ChatDebug.enabled) return;
  
  ChatDebug.newMessageCount += count;
  updateDebugInfo(`Received ${count} new message(s)`);
}

/**
 * Log block status check
 */
function logBlockCheck(changed) {
  if (!ChatDebug.enabled) return;
  
  ChatDebug.blockCheckCount++;
  updateDebugInfo(`Block check: ${changed ? 'Status changed' : 'No change'}`);
}

/**
 * Additional debugging for indicators
 */

// Check for indicators display issue
function debugIndicators() {
  // Skip if debug mode is disabled
  if (!DEBUG_MODE) {
      return;
  }

  console.log("Debugging indicators display...");
  
  // Find all contact items
  const contactItems = document.querySelectorAll('.contact-item');
  
  contactItems.forEach(item => {
    const userId = item.dataset.userId;
    const userName = item.querySelector('.contact-name')?.textContent || 'Unknown';
    
    // Check for indicators
    const contactIndicator = item.querySelector('.contact-indicator');
    const blockIndicator = item.querySelector('.block-indicator');
    
    console.log(`Contact item ${userName} (${userId}):`, {
      hasContactIndicator: !!contactIndicator,
      hasBlockIndicator: !!blockIndicator,
      indicatorClasses: blockIndicator ? blockIndicator.className : (contactIndicator ? contactIndicator.className : 'none')
    });
    
    // Get computed styles to check visibility
    if (contactIndicator || blockIndicator) {
      const indicator = contactIndicator || blockIndicator;
      const style = window.getComputedStyle(indicator);
      console.log(`Indicator styles for ${userName}:`, {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        width: style.width,
        height: style.height,
        right: style.right,
        top: style.top
      });
    }
  });
}

// Add to window for easy console access
window.debugIndicators = debugIndicators;

// Call debug function on page load with a slight delay
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    debugIndicators();
  }, 2000);
});

/**
 * Debug utilities for the chat application
 */

// Create global debug object
window.ChatDebug = {
    // Check if all required functions are available
    checkFunctions: function() {
        const requiredFunctions = [
            'fetchCurrentUserInfo',
            'loadSidebar',
            'showErrorNotification',
            'showSuccessNotification',
            'openChat',
            'loadMessages',
            'addToContacts',
            'createChatElement',
            'createContactElement'
        ];
        
        console.log('=== Function Availability Check ===');
        const missingFunctions = [];
        
        requiredFunctions.forEach(fn => {
            const exists = typeof window[fn] === 'function';
            console.log(`${fn}: ${exists ? '✓' : '✗'}`);
            if (!exists) missingFunctions.push(fn);
        });
        
        if (missingFunctions.length > 0) {
            console.error('Missing functions:', missingFunctions);
            return false;
        }
        
        console.log('All required functions are available');
        return true;
    },
    
    // Show script loading info
    showScriptInfo: function() {
        const scripts = document.querySelectorAll('script');
        console.log('=== Loaded Scripts ===');
        scripts.forEach((script, index) => {
            console.log(`${index + 1}. ${script.src || 'Inline script'}`);
        });
    },
    
    // Fix missing functions by creating temporary implementations
    fixMissingFunctions: function() {
        // Check for openChat function
        if (typeof window.openChat !== 'function') {
            console.warn('Creating fallback for missing openChat function');
            window.openChat = function(userId, userName) {
                console.log('Fallback openChat called with:', userId, userName);
                // Simplified implementation to just show something
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = `<div style="padding: 20px; text-align: center;">
                        <h2>Chat with ${userName}</h2>
                        <p>User ID: ${userId}</p>
                        <p>This is a fallback chat view</p>
                    </div>`;
                }
            };
        }
    },

    // Initialize debugging utilities
    init: function() {
        console.log('Initializing Chat Debug Tools');
        this.showScriptInfo();
        
        // Add debug button to the page
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '9999';
        debugBtn.style.padding = '5px 10px';
        debugBtn.style.backgroundColor = '#333';
        debugBtn.style.color = 'white';
        debugBtn.style.border = 'none';
        debugBtn.style.borderRadius = '4px';
        debugBtn.style.cursor = 'pointer';
        
        debugBtn.addEventListener('click', () => {
            this.checkFunctions();
            this.fixMissingFunctions();
        });
        
        document.body.appendChild(debugBtn);
    }
};

// Initialize debug tools when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure all other scripts have loaded
    setTimeout(() => {
        if (window.ChatDebug) window.ChatDebug.init();
    }, 1000);
});
