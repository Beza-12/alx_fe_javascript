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

// Update the startSyncInterval function
function startSyncInterval() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        fetchQuotesFromServer();
        syncToServer();
        startSyncInterval();
    }, syncInterval);
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