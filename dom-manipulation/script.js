// Our list of quotes
const quotes = [
  { text: "Believe in yourself!", category: "Motivation" },
  { text: "Stay curious.", category: "Learning" },
  { text: "Dream big.", category: "Inspiration" }
];

// Show a random quote
function showRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];
  const quoteDiv = document.getElementById("quoteDisplay");

  quoteDiv.innerHTML = `<p>"${quote.text}"</p><small>— ${quote.category}</small>`;
}

// Add a new quote from the input fields
function addQuote() {
  const quoteText = document.getElementById("newQuoteText").value;
  const quoteCategory = document.getElementById("newQuoteCategory").value;

  if (quoteText && quoteCategory) {
    // Add new quote to the array
    quotes.push({ text: quoteText, category: quoteCategory });

    // Clear the inputs
    document.getElementById("newQuoteText").value = "";
    document.getElementById("newQuoteCategory").value = "";

    alert("Quote added successfully!");
  } else {
    alert("Please fill in both fields.");
  }
}

// Make the button work
document.getElementById("newQuote").addEventListener("click", showRandomQuote);
