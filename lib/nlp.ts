const STOPWORDS = new Set([
  "i", "me", "my", "we", "our", "you", "your", "the", "a", "an",
  "is", "are", "was", "be", "been", "do", "does", "did", "will",
  "can", "could", "would", "should", "have", "has", "had",
  "to", "of", "in", "on", "at", "for", "with", "about", "please",
  "want", "need", "get", "tell", "know", "like", "just", "some",
]);

// Basic suffix stemming (e.g. "borrowing" → "borrow", "loans" → "loan")
function stem(word: string): string {
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("tion")) return word.slice(0, -4);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

// Step 1 — Normalize: lowercase + remove punctuation
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Step 2 — Tokenize: split into words
export function tokenize(text: string): string[] {
  return text.split(" ");
}

// Step 3 — Remove stopwords
export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t));
}

// Step 4 — Stem tokens
export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stem);
}

// Full pipeline: returns cleaned string + tokens for intent matching
export function processText(text: string): { cleaned: string; tokens: string[] } {
  const normalized = normalize(text);
  const tokens = tokenize(normalized);
  const filtered = removeStopwords(tokens);
  const stemmed = stemTokens(filtered);
  return { cleaned: normalized, tokens: stemmed };
}

// Kept for backward compatibility
export function cleanText(text: string): string {
  return normalize(text);
}
