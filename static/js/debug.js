/**
 * Debugging utilities for monitoring message updates
 */

// Debug state - explicitly disabled
const DEBUG_MODE = false;

// Debug panel state
let debugPanelVisible = false;

/**
 * Initialize debug features - completely disabled
 */
function initDebugPanel() {
    // Immediately remove any debug elements when this is called
    removeAllDebugElements();
    return; // Don't proceed with any debug initialization
}

/**
 * Remove ALL debug elements from the UI
 */
function removeAllDebugElements() {
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
    
    // Also search for any elements with debug-related classes
    document.querySelectorAll('[id^="debug"], [class^="debug"]').forEach(el => {
        el.remove();
    });
}

// Override any debug functions to do nothing
function debugIndicators() {
    return; // Do nothing
}

function updateDebugPanel() {
    return; // Do nothing
}

// Make sure debug features are removed when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Remove any debug elements that might have been added
    removeAllDebugElements();
    
    // Set up a MutationObserver to remove debug elements if they're added dynamically
    const observer = new MutationObserver(function(mutations) {
        for (let mutation of mutations) {
            if (mutation.addedNodes.length) {
                // Check if any added nodes are debug elements
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        if (node.id === 'debugButton' || node.id === 'debugPanel' || 
                            (node.className && node.className.includes && node.className.includes('debug'))) {
                            node.remove();
                        }
                    }
                }
            }
        }
    });
    
    // Start observing the document for added nodes
    observer.observe(document.body, { childList: true, subtree: true });
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    removeAllDebugElements();
});
