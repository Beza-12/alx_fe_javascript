// Mock server URL (JSONPlaceholder simulation)
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";
let lastSyncTimestamp = 0;
let syncInterval = 30000; // Sync every 30 seconds
let syncTimeout;
// DOM elements
const quoteTextElement = document.getElementById('quote-text');
const quoteAuthorElement = document.getElementById('quote-author');
const generateBtn = document.getElementById('generate-btn');
const addQuoteBtn = document.getElementById('add-quote-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('importFile');
const quoteCountElement = document.getElementById('quote-count');
const categoryFilter = document.getElementById('categoryFilter');
const quoteCategoryElement = document.getElementById('quote-category');

// Initialize quotes array and categories
let quotes = [];
let categories = [];
let serverQuotes = [];

// Update notification messages to include the required text
function showNotification(message, type = 'info', onClick = null) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    if (onClick) {
        notification.style.cursor = 'pointer';
        notification.addEventListener('click', onClick);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Update the syncQuotes function to use the required message
async function syncQuotes() {
    try {
        showNotification('Starting quote synchronization...', 'info');
        
        const localQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
        const quotesToSync = localQuotes.filter(quote => 
            quote.source === 'local' || !quote.source
        );
        
        if (quotesToSync.length === 0) {
            showNotification('No new quotes to sync.', 'info');
            return { success: true, message: 'No quotes to sync' };
        }
        
        const syncData = {
            action: 'sync-quotes',
            clientId: 'quote-generator-' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            quotes: quotesToSync,
            totalQuotes: localQuotes.length
        };
        
        const response = await fetch(SERVER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify(syncData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const result = await response.json();
        
        // Mark quotes as synced
        localQuotes.forEach(quote => {
            if (quote.source === 'local' || !quote.source) {
                quote.source = 'synced';
                quote.syncedAt = Date.now();
            }
        });
        
        localStorage.setItem('quotes', JSON.stringify(localQuotes));
        quotes = localQuotes;
        
        // Use the exact required message
        showNotification("Quotes synced with server!", 'success');
        return { success: true, syncedCount: quotesToSync.length, data: result };
        
    } catch (error) {
        console.error('Quote synchronization failed:', error);
        showNotification('Sync failed: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Update the mergeServerData function to show better notifications
function mergeServerData(serverData) {
    const localQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
    const conflicts = [];
    let newQuotesCount = 0;
    let updatedQuotesCount = 0;
    
    serverData.forEach(serverQuote => {
        const localIndex = localQuotes.findIndex(localQuote => 
            localQuote.id === serverQuote.id || 
            (localQuote.text === serverQuote.text && localQuote.author === serverQuote.author)
        );
        
        if (localIndex === -1) {
            // New quote from server
            localQuotes.push(serverQuote);
            newQuotesCount++;
        } else {
            // Potential conflict - check if it's actually an update
            const localQuote = localQuotes[localIndex];
            if (localQuote.timestamp < serverQuote.timestamp) {
                if (localQuote.text !== serverQuote.text || localQuote.author !== serverQuote.author) {
                    conflicts.push({
                        local: {...localQuote},
                        server: {...serverQuote},
                        resolved: false
                    });
                    updatedQuotesCount++;
                }
                localQuotes[localIndex] = serverQuote;
            }
        }
    });
    
    // Save merged data
    localStorage.setItem('quotes', JSON.stringify(localQuotes));
    quotes = localQuotes;
    
    // Show appropriate notifications
    if (newQuotesCount > 0) {
        showNotification(`Received ${newQuotesCount} new quotes from server!`, 'success');
    }
    
    if (updatedQuotesCount > 0) {
        showNotification(`${updatedQuotesCount} quotes updated from server. Click to review conflicts.`, 'warning', () => {
            handleConflicts(conflicts);
        });
    }
    
    // Handle conflicts
    if (conflicts.length > 0) {
        handleConflicts(conflicts);
    }
    
    // Update UI
    populateCategories();
    updateQuoteCount();
    lastSyncTimestamp = Date.now();
    
    if (newQuotesCount === 0 && updatedQuotesCount === 0) {
        showNotification('No new updates from server.', 'info');
    }
}

// Enhanced conflict handling with better UI
function handleConflicts(conflicts) {
    const conflictCount = conflicts.filter(c => !c.resolved).length;
    
    if (conflictCount > 0) {
        // Create or update conflict notification
        let conflictNotification = document.getElementById('conflict-notification');
        
        if (!conflictNotification) {
            conflictNotification = document.createElement('div');
            conflictNotification.id = 'conflict-notification';
            conflictNotification.className = 'conflict-notification';
            document.body.appendChild(conflictNotification);
        }
        
        conflictNotification.innerHTML = `
            <div class="conflict-alert">
                <span>⚠️ ${conflictCount} data conflict(s) detected!</span>
                <button onclick="showConflictResolution(${JSON.stringify(conflicts).replace(/"/g, '&quot;')})">
                    Resolve Now
                </button>
                <button onclick="this.parentElement.style.display='none'">Dismiss</button>
            </div>
        `;
        
        // Also show a temporary notification
        showNotification(
            `${conflictCount} conflict(s) found between local and server data. Click to resolve.`,
            'error',
            () => showConflictResolution(conflicts)
        );
        
        // Add conflict badge to UI
        updateConflictBadge(conflictCount);
    }
}

// Enhanced conflict resolution UI
function showConflictResolution(conflicts) {
    // Remove any existing modal
    closeConflictModal();
    
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    modal.innerHTML = `
        <div class="conflict-content">
            <h3>🔄 Data Synchronization Conflicts</h3>
            <p>We found ${conflicts.length} differences between your local quotes and server data.</p>
            <div class="conflict-list">
                ${conflicts.map((conflict, index) => `
                    <div class="conflict-item" id="conflict-${index}">
                        <h4>Conflict #${index + 1}</h4>
                        <div class="conflict-versions">
                            <div class="conflict-local">
                                <h5>Your Local Version:</h5>
                                <p class="quote-text">"${conflict.local.text}"</p>
                                <p class="quote-author">- ${conflict.local.author}</p>
                                <p class="quote-meta">Category: ${conflict.local.category || 'None'} | Updated: ${new Date(conflict.local.timestamp).toLocaleString()}</p>
                            </div>
                            <div class="conflict-server">
                                <h5>Server Version:</h5>
                                <p class="quote-text">"${conflict.server.text}"</p>
                                <p class="quote-author">- ${conflict.server.author}</p>
                                <p class="quote-meta">Category: ${conflict.server.category || 'None'} | Updated: ${new Date(conflict.server.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                        <div class="conflict-actions">
                            <button onclick="resolveConflict(${index}, 'local')" class="btn-local">
                                Keep My Version
                            </button>
                            <button onclick="resolveConflict(${index}, 'server')" class="btn-server">
                                Use Server Version
                            </button>
                            <button onclick="resolveConflict(${index}, 'keep-both')" class="btn-both">
                                Keep Both Quotes
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="conflict-modal-actions">
                <button onclick="resolveAllConflicts('server')" class="btn-all-server">
                    Use All Server Versions
                </button>
                <button onclick="resolveAllConflicts('local')" class="btn-all-local">
                    Keep All My Versions
                </button>
                <button onclick="closeConflictModal()" class="btn-close">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    window.currentConflicts = conflicts;
}

// Add function to resolve all conflicts at once
function resolveAllConflicts(resolution) {
    window.currentConflicts.forEach((_, index) => {
        resolveConflict(index, resolution);
    });
    showNotification(`All conflicts resolved using ${resolution} versions.`, 'success');
    setTimeout(closeConflictModal, 1000);
}

// Add real-time update indicator
function addUpdateIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'update-indicator';
    indicator.className = 'update-indicator';
    indicator.innerHTML = `
        <span class="update-text">Last update: <span id="last-update-time">Just now</span></span>
        <span class="update-status" id="update-status">🟢 Synced</span>
    `;
    
    document.querySelector('.container').appendChild(indicator);
    
    // Update the indicator periodically
    setInterval(() => {
        const timeDiff = Date.now() - lastSyncTimestamp;
        const minutes = Math.floor(timeDiff / 60000);
        const statusElement = document.getElementById('update-status');
        const timeElement = document.getElementById('last-update-time');
        
        if (minutes < 1) {
            timeElement.textContent = 'Just now';
            statusElement.textContent = '🟢 Synced';
            statusElement.className = 'status-synced';
        } else if (minutes < 5) {
            timeElement.textContent = `${minutes} min ago`;
            statusElement.textContent = '🟡 Recently';
            statusElement.className = 'status-recent';
        } else {
            timeElement.textContent = `${minutes} min ago`;
            statusElement.textContent = '🔴 Offline';
            statusElement.className = 'status-offline';
        }
    }, 30000);
}

// Update the initApp function
function initApp() {
    loadQuotes();
    addUpdateIndicator();
    // ... rest of initialization
}

// Add CSS for the new UI elements
const enhancedUICSS = `
.conflict-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #dc3545;
    color: white;
    padding: 15px;
    border-radius: 8px;
    z-index: 1002;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.conflict-alert {
    display: flex;
    align-items: center;
    gap: 15px;
}

.conflict-alert button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.conflict-alert button:first-child {
    background: white;
    color: #dc3545;
}

.conflict-alert button:last-child {
    background: transparent;
    color: white;
    border: 1px solid white;
}

.update-indicator {
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    display: flex;
    gap: 15px;
    align-items: center;
}

.status-synced { color: #28a745; }
.status-recent { color: #ffc107; }
.status-offline { color: #dc3545; }

.conflict-versions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 15px 0;
}

.conflict-local, .conflict-server {
    padding: 15px;
    border-radius: 8px;
}

.conflict-local {
    background: #d4edda;
    border: 1px solid #c3e6cb;
}

.conflict-server {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
}

.conflict-modal-actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
    justify-content: center;
}

.btn-all-local { background: #28a745; color: white; }
.btn-all-server { background: #dc3545; color: white; }
.btn-close { background: #6c757d; color: white; }
`;

// Add the CSS to the document
const enhancedStyle = document.createElement('style');
enhancedStyle.textContent = enhancedUICSS;
document.head.appendChild(enhancedStyle);
// Load quotes from local storage when the page loads
function loadQuotes() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
        updateQuoteCount();
    } else {
        // Default quotes with categories
        quotes = [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Motivation" },
            { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "Business" },
            { text: "Life is what happens when you're busy making other plans.", author: "John Lennon", category: "Life" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "Inspiration" },
            { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi", category: "Wisdom" }
        ];
        saveQuotes();
    }
    
    // Populate categories after loading quotes
    populateCategories();
    
    // Check if there's a last viewed quote in session storage
    const lastQuote = sessionStorage.getItem('lastViewedQuote');
    if (lastQuote) {
        const quote = JSON.parse(lastQuote);
        displayQuote(quote);
    }
    
    // Restore last filter preference
    restoreFilter();
}

// Save quotes to local storage
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
    updateQuoteCount();
    populateCategories(); // Update categories when quotes change
}

// Update the quote count display
function updateQuoteCount() {
    const filteredQuotes = getFilteredQuotes();
    quoteCountElement.textContent = `${filteredQuotes.length} of ${quotes.length} quotes`;
}

// Display a quote
function quoteDisplay(quote) {
    quoteTextElement.textContent = `"${quote.text}"`;
    quoteAuthorElement.textContent = `- ${quote.author}`;
    
    // Display category if it exists
    if (quote.category) {
        quoteCategoryElement.textContent = `Category: ${quote.category}`;
        quoteCategoryElement.style.display = 'block';
    } else {
        quoteCategoryElement.style.display = 'none';
    }
    
    // Store the last viewed quote in session storage
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(quote));
}

// Get filtered quotes based on current category selection
function getFilteredQuotes() {
    const selectedCategory = categoryFilter.value;
    if (selectedCategory === 'all') {
        return quotes;
    }
    return quotes.filter(quote => quote.category === selectedCategory);
}

// Generate a random quote from filtered list
function generateRandomQuote() {
    const filteredQuotes = getFilteredQuotes();
    if (filteredQuotes.length === 0) {
        alert("No quotes available in the selected category!");
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const randomQuote = filteredQuotes[randomIndex];
    displayQuote(randomQuote);
}

// Add a new quote with category
function addNewQuote() {
    const text = prompt("Enter the quote text:");
    if (!text) return;
    
    const author = prompt("Enter the author's name:") || "Unknown";
    const category = prompt("Enter the category:") || "Uncategorized";
    
    const newQuote = { text, author, category };
    quotes.push(newQuote);
    saveQuotes();
    
    displayQuote(newQuote);
    alert("Quote added successfully!");
}

// Fetch quotes from server (renamed to match ALX requirement)
async function fetchQuotesFromServer() {
    try {
        const response = await fetch(SERVER_URL);
        if (!response.ok) throw new Error('Server fetch failed');
        
        const serverData = await response.json();
        
        // Extract quotes from server response (simulation)
        const newServerQuotes = serverData.slice(0, 5).map((post, index) => ({
            id: `server-${post.id}`,
            text: post.title,
            author: `User ${post.userId}`,
            category: 'Server',
            timestamp: Date.now() - (index * 1000),
            source: 'server'
        }));
        
        serverQuotes = newServerQuotes;
        mergeServerData(newServerQuotes);
        
        return newServerQuotes;
        
    } catch (error) {
        console.warn('Server fetch failed:', error);
        showNotification('Could not connect to server. Working offline.', 'warning');
        return [];
    }
}

// Sync local data to server - Complete version with all required elements
async function syncQuotes() {
    try {
        // Get local quotes that need syncing
        const localQuotes = JSON.parse(localStorage.getItem('quotes') || '[]');
        const quotesToSync = localQuotes.filter(quote => 
            quote.source === 'local' || !quote.source
        );
        
        if (quotesToSync.length === 0) {
            showNotification('No new quotes to sync.', 'info');
            return null;
        }
        
        // Prepare sync data
        const syncData = {
            action: 'sync-quotes',
            clientId: 'quote-generator-' + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            quotes: quotesToSync,
            totalQuotes: localQuotes.length
        };
        
        // Send POST request to server with proper headers
        const response = await fetch(SERVER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Sync-Version": "1.0"
            },
            body: JSON.stringify(syncData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const result = await response.json();
        
        // Mark quotes as synced
        localQuotes.forEach(quote => {
            if (quote.source === 'local' || !quote.source) {
                quote.source = 'synced';
                quote.syncedAt = Date.now();
            }
        });
        
        localStorage.setItem('quotes', JSON.stringify(localQuotes));
        quotes = localQuotes;
        
        showNotification(`Successfully synced ${quotesToSync.length} quotes to server!`, 'success');
        return result;
        
    } catch (error) {
        console.error('Sync to server failed:', error);
        showNotification('Sync failed. Working offline. Error: ' + error.message, 'error');
        return null;
    }
}
// Update the initServerSync function to use the correct function name
function initServerSync() {
    // Load initial server data
    fetchQuotesFromServer();
    
    // Set up periodic sync
    startSyncInterval();
    
    // Sync before page unload
    window.addEventListener('beforeunload', syncToServer);
}

// Update the manualSync function
function manualSync() {
    fetchQuotesFromServer();
    syncToServer();
    showNotification('Manual sync started...', 'info');
}

function startSyncInterval() {
    // Clear any existing interval first
    if (window.syncIntervalId) {
        clearInterval(window.syncIntervalId);
    }
    
    // Set up periodic sync using setInterval
    window.syncIntervalId = setInterval(async () => {
        try {
            await fetchQuotesFromServer();
            await syncQuotes();
            console.log('Periodic sync completed at:', new Date().toLocaleTimeString());
        } catch (error) {
            console.warn('Periodic sync failed:', error);
        }
    }, syncInterval);
    
    showNotification(`Auto-sync enabled (every ${syncInterval/1000} seconds)`, 'info');
}
// Export quotes to JSON file
function exportToJson() {
    const filteredQuotes = getFilteredQuotes();
    if (filteredQuotes.length === 0) {
        alert("No quotes to export in the selected category!");
        return;
    }
    
    // Convert quotes to JSON string
    const dataStr = JSON.stringify(filteredQuotes, null, 2);
    
    // Create Blob with JSON data
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    // Create object URL from Blob
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = 'quotes.json';
    
    // Create and trigger download link
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = exportFileDefaultName;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    
    // Clean up - revoke the object URL
    URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedQuotes = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedQuotes)) {
                throw new Error("Imported data is not an array");
            }
            
            // Validate each quote has text property and add category if missing
            for (let quote of importedQuotes) {
                if (!quote.text) {
                    throw new Error("Invalid quote format: missing text property");
                }
                if (!quote.category) {
                    quote.category = "Uncategorized";
                }
            }
            
            quotes.push(...importedQuotes);
            saveQuotes();
            alert(`Successfully imported ${importedQuotes.length} quotes!`);
            
            // Display the first imported quote
            if (importedQuotes.length > 0) {
                displayQuote(importedQuotes[0]);
            }
            
        } catch (error) {
            alert("Error importing quotes: " + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset the file input
    event.target.value = '';
}

// Populate categories dynamically - Fixed version
function populateCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    // Clear existing options except "All Categories"
    const allOption = categoryFilter.options[0];
    categoryFilter.innerHTML = '';
    categoryFilter.appendChild(allOption);
    
    // Extract unique categories from quotes using map
    const uniqueCategories = [];
    quotes.map(function(quote) {
        if (quote.category && !uniqueCategories.includes(quote.category)) {
            uniqueCategories.push(quote.category);
        }
        return quote; // map requires return
    });
    
    // Sort categories alphabetically
    uniqueCategories.sort();
    
    // Add categories to dropdown using appendChild
    uniqueCategories.forEach(function(category) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Restore last filter selection if available
    const lastFilter = localStorage.getItem('lastFilter');
    if (lastFilter && categoryFilter.querySelector('option[value="' + lastFilter + '"]')) {
        categoryFilter.value = lastFilter;
    }
}

// Filter quotes based on selected category
function filterQuotes() {
    const selectedCategory = categoryFilter.value;
    
    // Save filter preference
    localStorage.setItem('lastFilter', selectedCategory);
    
    updateQuoteCount();
    
    // If we're displaying a quote that doesn't match the filter, show a new one
    const currentQuoteText = quoteTextElement.textContent.replace(/"/g, '');
    const currentQuote = quotes.find(q => q.text === currentQuoteText);
    
    if (currentQuote && selectedCategory !== 'all' && currentQuote.category !== selectedCategory) {
        generateRandomQuote();
    } else if (!currentQuote) {
        generateRandomQuote();
    }
}

// Restore last selected filter
function restoreFilter() {
    const lastFilter = localStorage.getItem('lastFilter');
    if (lastFilter && (lastFilter === 'all' || categories.includes(lastFilter))) {
        categoryFilter.value = lastFilter;
        updateQuoteCount();
    }
}

// Event listeners
generateBtn.addEventListener('click', generateRandomQuote);
addQuoteBtn.addEventListener('click', addNewQuote);
exportBtn.addEventListener('click', exportToJson);
importFile.addEventListener('change', importFromJsonFile);
categoryFilter.addEventListener('change', filterQuotes);

// Initialize the application
loadQuotes();
generateRandomQuote(); // Show a random quote on page load