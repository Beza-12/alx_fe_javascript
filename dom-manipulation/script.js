// Mock server URL (JSONPlaceholder simulation)
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

// Load quotes from localStorage or use default
// (Removed duplicate quotes declaration to avoid redeclaration error)

// DOM elements
const quoteTextElement = document.getElementById('quote-text');
const quoteAuthorElement = document.getElementById('quote-author');
const generateBtn = document.getElementById('generate-btn');
const addQuoteBtn = document.getElementById('add-quote-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('importFile');
const quoteCountElement = document.getElementById('quote-count');

// Initialize quotes array
let quotes = [];

// Load quotes from local storage when the page loads
function loadQuotes() {
    const storedQuotes = localStorage.getItem('quotes');
    if (storedQuotes) {
        quotes = JSON.parse(storedQuotes);
        updateQuoteCount();
    } else {
        // Default quotes if none are stored
        quotes = [
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
            { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" }
        ];
        saveQuotes();
    }
    
    // Check if there's a last viewed quote in session storage
    const lastQuote = sessionStorage.getItem('lastViewedQuote');
    if (lastQuote) {
        const quote = JSON.parse(lastQuote);
        displayQuote(quote);
    }
}

// Save quotes to local storage
function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
    updateQuoteCount();
}

// Update the quote count display
function updateQuoteCount() {
    quoteCountElement.textContent = quotes.length;
}

// Display a quote
function displayQuote(quote) {
    quoteTextElement.textContent = `"${quote.text}"`;
    quoteAuthorElement.textContent = `- ${quote.author}`;
    
    // Store the last viewed quote in session storage
    sessionStorage.setItem('lastViewedQuote', JSON.stringify(quote));
}

// Generate a random quote
function generateRandomQuote() {
    if (quotes.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const randomQuote = quotes[randomIndex];
    displayQuote(randomQuote);
}

// Add a new quote
function addNewQuote() {
    const text = prompt("Enter the quote text:");
    if (!text) return;
    
    const author = prompt("Enter the author's name:") || "Unknown";
    
    const newQuote = { text, author };
    quotes.push(newQuote);
    saveQuotes();
    
    displayQuote(newQuote);
    alert("Quote added successfully!");
}

// Export quotes to JSON file
function Export Quotes() {
    if (quotes.length === 0) {
        alert("No quotes to export!");
        return;
    }
    
    const dataStr = JSON.stringify(quotes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'quotes.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
            
            // Validate each quote has text property
            for (let quote of importedQuotes) {
                if (!quote.text) {
                    throw new Error("Invalid quote format: missing text property");
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

// Event listeners
generateBtn.addEventListener('click', generateRandomQuote);
addQuoteBtn.addEventListener('click', addNewQuote);
exportBtn.addEventListener('click', exportToJson);
importFile.addEventListener('change', importFromJsonFile);

// Initialize the application
loadQuotes();
generateRandomQuote(); // Show a random quote on page load