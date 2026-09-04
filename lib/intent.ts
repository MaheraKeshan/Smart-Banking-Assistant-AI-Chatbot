export type Intent =
  | "GREETING"
  | "LOAN"
  | "LOAN_TYPES"
  | "PERSONAL_LOAN"
  | "HOME_LOAN"
  | "VEHICLE_LOAN"
  | "BUSINESS_LOAN"
  | "EDUCATION_LOAN"
  | "CARD"
  | "BALANCE"
  | "ACCOUNT"
  | "TRANSFER"
  | "INTEREST"
  | "IDENTITY"
  | "PERSONALITY"
  | "FOLLOWUP"
  | "THANKS"
  | "ANGRY"
  | "UNKNOWN";

const SYNONYMS: Record<string, string> = {
  borrow: "loan",
  borrowing: "loan",
  mortgage: "loan",
  lend: "loan",
  lending: "loan",
  finance: "loan",
  financing: "loan",
  visa: "credit card",
  mastercard: "credit card",
  debit: "credit card",
  "debit card": "credit card",
  funds: "balance",
  "how much": "balance",
  "my money": "balance",
  "check account": "balance",
  "open account": "account",
  savings: "account",
  "current account": "account",
  "bank account": "account",
  "send money": "transfer",
  wire: "transfer",
  remittance: "transfer",
  "money transfer": "transfer",
  rate: "interest rate",
  "interest rate": "interest rate",
  "annual rate": "interest rate",
  return: "interest rate",
  appreciate: "thank",
  grateful: "thank",
  cheers: "thank",
  frustrated: "angry",
  frustrate: "angry",
  frustrat: "angry",
  terrible: "angry",
  worst: "angry",
  useless: "angry",
  useles: "angry",
  hate: "angry",
  "bad service": "angry",
  "loan types": "loan types",
  "types of loan": "loan types",
  "what loans": "loan types",
  "available loans": "loan types",
};

// Order matters — specific intents before generic ones
const INTENT_KEYWORDS: [string[], Intent][] = [
  // Specific loan types — checked BEFORE generic LOAN
  [["personal loan", "personal finance", "personal borrow"],                          "PERSONAL_LOAN"],
  [["home loan", "house loan", "housing loan", "property loan", "mortgage loan"],     "HOME_LOAN"],
  [["vehicle loan", "car loan", "bike loan", "auto loan", "vehicle finance"],         "VEHICLE_LOAN"],
  [["business loan", "sme loan", "company loan", "business finance"],                 "BUSINESS_LOAN"],
  [["education loan", "student loan", "study loan", "education finance"],             "EDUCATION_LOAN"],
  // Loan list
  [["loan types", "types of loan", "what loans", "available loans", "list loan", "all loans"], "LOAN_TYPES"],
  // Identity & personality
  [["who are you", "what are you", "your name", "introduce yourself", "about you"],   "IDENTITY"],
  [["smile", "joke", "funny", "laugh", "happy", "friend", "personality"],             "PERSONALITY"],
  // Follow-up
  [["explain", "tell me more", "more details", "elaborate", "what does that mean"],   "FOLLOWUP"],
  // Emotional — before generic intents
  [["thank", "thanks", "appreciate", "grateful", "cheers"],                           "THANKS"],
  [["angry", "frustrated", "terrible", "worst", "useless", "hate", "bad service"],   "ANGRY"],
  // Greeting
  [["hi", "hello", "hey", "good morning", "good afternoon", "howdy"],                 "GREETING"],
  // Banking intents
  [["loan", "borrow", "lend", "finance"],                                             "LOAN"],
  [["credit card", "credit", "visa", "mastercard", "debit card", "debit"],            "CARD"],
  [["balance", "how much", "funds", "my money"],                                      "BALANCE"],
  [["account", "open account", "current account", "bank account"],                    "ACCOUNT"],
  [["transfer", "send money", "wire", "remittance", "money transfer"],                "TRANSFER"],
  [["interest", "interest rate", "rate", "annual rate"],                              "INTEREST"],
];

function expandSynonyms(tokens: string[]): string[] {
  return tokens.map((t) => SYNONYMS[t] ?? t);
}

function tokenMatchesKeyword(tokens: string[], keyword: string): boolean {
  return tokens.some((token) => token.includes(keyword));
}

export type Confidence = "high" | "medium" | "low";

export type IntentResult = {
  intent: Intent;
  confidence: Confidence;
  matchedCount: number;
};

export function detectIntent(cleanedText: string, tokens: string[]): IntentResult {
  const expandedTokens = expandSynonyms(tokens);
  const allText = cleanedText + " " + expandedTokens.join(" ");

  for (const [keywords, intent] of INTENT_KEYWORDS) {
    let matchedCount = 0;
    for (const kw of keywords) {
      if (allText.includes(kw) || tokenMatchesKeyword(expandedTokens, kw)) {
        matchedCount++;
      }
    }

    if (matchedCount > 0) {
      // Any resolved intent is at least medium confidence — "low" only for UNKNOWN
      const confidence: Confidence = matchedCount >= 3 ? "high" : matchedCount >= 1 ? "medium" : "low";
      return { intent, confidence, matchedCount };
    }
  }

  return { intent: "UNKNOWN", confidence: "low", matchedCount: 0 };
}
