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
  
  if (!ChatDebug.enabled) return;
  
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
