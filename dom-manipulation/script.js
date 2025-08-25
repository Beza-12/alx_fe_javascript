// Mock server URL (JSONPlaceholder simulation)
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

// Load quotes from localStorage or default
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "Believe in yourself!", category: "Motivation" },
  { text: "Stay curious.", category: "Learning" },
  { text: "Dream big.", category: "Inspiration" }
];

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

// Populate unique categories in the dropdown
function populateCategories() {
  const categorySelect = document.getElementById("categoryFilter");
  const categories = [...new Set(quotes.map(q => q.category))];
  categorySelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
  const lastFilter = localStorage.getItem("lastCategoryFilter") || "all";
  categorySelect.value = lastFilter;
  filterQuotes();
}

// Show a random quote based on filtered category
function filterQuotes() {
  const selectedCategory = document.getElementById("categoryFilter").value;
  localStorage.setItem("lastCategoryFilter", selectedCategory);
  let filteredQuotes = selectedCategory === "all" ? quotes : quotes.filter(q => q.category === selectedCategory);
  displayRandomQuote(filteredQuotes);
}

// Display a random quote from given array
function displayRandomQuote(array) {
  const quoteDiv = document.getElementById("quoteDisplay");
  if (array.length > 0) {
    const randomIndex = Math.floor(Math.random() * array.length);
    const quote = array[randomIndex];
    quoteDiv.innerHTML = `<p>"${quote.text}"</p><small>— ${quote.category}</small>`;
    sessionStorage.setItem("lastViewedQuote", JSON.stringify(quote));
  } else {
    quoteDiv.innerHTML = "<p>No quotes in this category.</p>";
  }
}

// Show random quote from all
function showRandomQuote() {
  displayRandomQuote(quotes);
}

// Add new quote
function createAddQuoteForm() {
  const quoteText = document.getElementById("newQuoteText").value.trim();
  const quoteCategory = document.getElementById("newQuoteCategory").value.trim();

  if (quoteText && quoteCategory) {
    const newQuote = { text: quoteText, category: quoteCategory };
    quotes.push(newQuote);
    saveQuotes();
    sendQuoteToServer(newQuote); // sync to server

    document.getElementById("newQuoteText").value = "";
    document.getElementById("newQuoteCategory").value = "";

    alert("Quote added successfully!");
    populateCategories();
  } else {
    alert("Please fill in both fields.");
  }
}

// Export quotes as JSON
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Import quotes from JSON file
function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(event) {
    try {
      const importedQuotes = JSON.parse(event.target.result);
      if (Array.isArray(importedQuotes)) {
        quotes.push(...importedQuotes);
        saveQuotes();
        alert("Quotes imported successfully!");
        populateCategories();
      } else {
        alert("Invalid JSON format.");
      }
    } catch (error) {
      alert("Error reading JSON file.");
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// Send quote to server (simulation)
async function sendQuoteToServer(quote) {
  try {
    await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quote)
    });
    console.log("Quote sent to server:", quote);
  } catch (error) {
    console.error("Error sending quote to server:", error);
  }
}

// Fetch server quotes periodically and resolve conflicts
async function fetchServerQuotes() {
  try {
    const response = await fetch(SERVER_URL);
    const serverData = await response.json();
    const serverQuotes = serverData.map(item => ({
      text: item.title || item.text,
      category: item.body || "Uncategorized"
    }));
    resolveConflicts(serverQuotes);
  } catch (error) {
    console.error("Error fetching server data:", error);
  }
}

// Resolve conflicts: server takes precedence
function resolveConflicts(serverQuotes) {
  let conflictsResolved = false;

  serverQuotes.forEach(serverQuote => {
    const localIndex = quotes.findIndex(q => q.text === serverQuote.text);
    if (localIndex > -1) {
      if (quotes[localIndex].category !== serverQuote.category) {
        quotes[localIndex].category = serverQuote.category;
        conflictsResolved = true;
      }
    } else {
      quotes.push(serverQuote);
      conflictsResolved = true;
    }
  });

  if (conflictsResolved) {
    saveQuotes();
    populateCategories();
    alert("Quotes updated from server with conflict resolution!");
  }
}

// Periodically fetch server data every 30 seconds
setInterval(fetchServerQuotes, 30000);

// On page load
window.onload = () => {
  const lastQuote = sessionStorage.getItem("lastViewedQuote");
  if (lastQuote) {
    const quote = JSON.parse(lastQuote);
    document.getElementById("quoteDisplay").innerHTML = `<p>"${quote.text}"</p><small>— ${quote.category}</small>`;
  }
  populateCategories();
};

// Event listeners
document.getElementById("newQuote").addEventListener("click", showRandomQuote);
