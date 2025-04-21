/**
 * Debugging utilities for monitoring message updates
 */

// Debug state
const ChatDebug = {
  enabled: false,
  container: null,
  lastPollTime: null,
  newMessageCount: 0,
  blockCheckCount: 0
};

/**
 * Initialize debugging panel
 */
function initDebugPanel() {
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
