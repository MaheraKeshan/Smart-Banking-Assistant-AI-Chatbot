import { NextResponse } from "next/server";
import { processText } from "@/lib/nlp";
import { detectIntent, Confidence } from "@/lib/intent";
import { getDB, LoanType } from "@/lib/db";

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Simple server-side context memory — tracks last resolved intent per session
// (resets on server restart; good enough for demo/assignment purposes)
let lastIntent = "UNKNOWN";

const CONFIDENCE_PREFIX: Record<Confidence, string> = {
  high:   "",
  medium: "I believe ",
  low:    "I'm not entirely sure, but ",
};

const RESPONSES: Record<string, string[]> = {
  GREETING: [
    "Hello! How can I help you today? 😊",
    "Hi there! Welcome to Smart Bank. What can I do for you?",
    "Hey! Great to see you. How can I assist?",
    "Good day! I'm your Smart Banking Assistant. Ask me anything!",
  ],
  LOAN: [
    "We offer several loan types with competitive rates. Ask me 'what loan types are available?' to see the full list!",
    "Great news — we have personal, home, vehicle, business, and education loans. Which one interests you?",
    "You can apply for a loan starting from 8% interest. Want to know more about a specific loan type?",
  ],
  CARD: [
    "We provide Visa and Mastercard credit cards with great cashback and reward programs. Shall I tell you more?",
    "Our credit cards come with zero annual fees for the first year and up to 5% cashback on purchases!",
    "We offer both Visa and Mastercard options. Would you like to know about eligibility requirements?",
  ],
  BALANCE: [
    "Please log in to your account portal at smartbank.com to check your current balance.",
    "Your balance is available 24/7 through our mobile app or internet banking portal.",
    "For security reasons, balance details are only accessible after logging in to your account.",
  ],
  ACCOUNT: [
    "You can open a savings or current account at any branch or online at smartbank.com.",
    "Opening an account takes just 10 minutes online! You'll need your NIC and proof of address.",
    "We offer savings accounts with 5% interest and current accounts with no minimum balance.",
  ],
  TRANSFER: [
    "You can transfer funds instantly via our mobile app, internet banking, or at any branch.",
    "We support local and international transfers. Online transfers are free for amounts under LKR 100,000.",
    "Fund transfers are processed within seconds for local banks and 1–2 business days internationally.",
  ],
  INTEREST: [
    "Our savings account interest rate is 5% per annum, compounded monthly.",
    "We offer competitive interest rates — 5% on savings, and fixed deposit rates up to 9%.",
    "Interest rates vary by product. Savings: 5% p.a., Fixed Deposits: up to 9% p.a.",
  ],
  THANKS: [
    "You're very welcome! Is there anything else I can help you with? 😊",
    "Happy to help! Don't hesitate to ask if you need anything else.",
    "My pleasure! Feel free to come back anytime. Have a great day! 🌟",
  ],
  ANGRY: [
    "I'm truly sorry to hear that. Your experience matters to us — please tell me what went wrong and I'll do my best to help. 🙏",
    "I sincerely apologize for the inconvenience. Let me help resolve this for you right away.",
    "I understand your frustration and I'm sorry. Please share the details and I'll escalate this immediately.",
  ],
};

// Specific loan type details fetched from DB
const LOAN_INTENT_KEY: Record<string, string> = {
  PERSONAL_LOAN:  "Personal Loan",
  HOME_LOAN:      "Home Loan",
  VEHICLE_LOAN:   "Vehicle Loan",
  BUSINESS_LOAN:  "Business Loan",
  EDUCATION_LOAN: "Education Loan",
};

// Context-aware follow-up responses keyed by last intent
const FOLLOWUP_RESPONSES: Record<string, string> = {
  LOAN_TYPES:     "Our loan products include Personal, Home, Vehicle, Business, and Education loans — each designed for different financial needs. You can ask about any specific one for full details.",
  PERSONAL_LOAN:  "A Personal Loan is an unsecured loan for personal expenses. No collateral needed. You can borrow up to LKR 2,000,000 at 12% p.a. over 5 years.",
  HOME_LOAN:      "A Home Loan helps you purchase or construct property. We offer up to LKR 20,000,000 at just 9% p.a. over 25 years with flexible repayment.",
  VEHICLE_LOAN:   "A Vehicle Loan covers cars, bikes, and vans. Borrow up to LKR 5,000,000 at 11% p.a. over 7 years with quick approval.",
  BUSINESS_LOAN:  "A Business Loan supports SMEs and startups. Get up to LKR 10,000,000 at 14% p.a. over 10 years to grow your business.",
  EDUCATION_LOAN: "An Education Loan covers local and overseas studies. Borrow up to LKR 3,000,000 at 8% p.a. over 8 years with a grace period during studies.",
  CARD:           "Our credit cards offer cashback, reward points, and travel benefits. Visa cards are accepted globally; Mastercard offers contactless payments.",
  TRANSFER:       "Transfers can be done via SLIPS, CEFTS, or SWIFT for international. Local transfers are instant; international takes 1–2 business days.",
  INTEREST:       "Interest is calculated on the reducing balance method. Savings accounts earn 5% p.a. compounded monthly; fixed deposits earn up to 9% p.a.",
  UNKNOWN:        "Could you give me a bit more context? I want to make sure I give you the right information.",
};

export async function POST(req: Request) {
  const { message, teachAnswer } = await req.json();
  const db = getDB();
  const { cleaned, tokens } = processText(message);

  // Save taught answer
  if (teachAnswer) {
    db.prepare(
      "INSERT INTO learned (question, answer) VALUES (?, ?) ON CONFLICT(question) DO UPDATE SET answer = excluded.answer"
    ).run(cleaned, teachAnswer);
    return NextResponse.json({ reply: "Thank you! I've learned something new and will remember it. 🧠", confidence: "high" });
  }

  // 1. Learned answers — partial match
  const learnedRows = db.prepare("SELECT question, answer FROM learned").all() as { question: string; answer: string }[];
  const learnedMatch = learnedRows.find(
    (row) => cleaned.includes(row.question) || row.question.includes(cleaned)
  );
  if (learnedMatch) return NextResponse.json({ reply: learnedMatch.answer, confidence: "high" });

  // 2. Detect intent
  const { intent, confidence, matchedCount } = detectIntent(cleaned, tokens);
  const prefix = CONFIDENCE_PREFIX[confidence];

  // 3. Identity — "who are you?"
  if (intent === "IDENTITY") {
    lastIntent = "IDENTITY";
    return NextResponse.json({
      reply: "I am Smart Bank Assistant — an AI-powered chatbot designed to help you with loans, credit cards, account queries, fund transfers, and general banking information. How can I assist you today?",
      confidence: "high",
    });
  }

  // 4. Personality — "can you smile?"
  if (intent === "PERSONALITY") {
    lastIntent = "PERSONALITY";
    return NextResponse.json({
      reply: pick([
        "😊 I always try to keep things friendly! Now, how can I help you with your banking needs?",
        "😄 Happy to chat! I may be a bot, but I genuinely enjoy helping. What can I do for you?",
        "🙂 I'm all smiles! Ask me anything about Smart Bank.",
      ]),
      confidence: "high",
    });
  }

  // 5. Follow-up — "explain me", "tell me more"
  if (intent === "FOLLOWUP") {
    const followupReply = FOLLOWUP_RESPONSES[lastIntent] ?? FOLLOWUP_RESPONSES["UNKNOWN"];
    return NextResponse.json({ reply: followupReply, confidence: "high" });
  }

  // 6. Specific loan type — fetch from DB
  if (LOAN_INTENT_KEY[intent]) {
    const loanName = LOAN_INTENT_KEY[intent];
    const loan = db.prepare("SELECT * FROM loan_types WHERE name = ?").get(loanName) as LoanType | undefined;
    lastIntent = intent;
    if (loan) {
      return NextResponse.json({
        reply: `Here are the details for our ${loan.name}:\n\n• Purpose: ${loan.description}\n• Interest Rate: ${loan.interest_rate}\n• Maximum Amount: ${loan.max_amount}\n• Repayment Period: ${loan.duration}\n\nWould you like to apply or know more?`,
        confidence: "high",
      });
    }
  }

  // 7. Loan types list — dynamic DB fetch
  if (intent === "LOAN_TYPES") {
    const loans = db.prepare("SELECT * FROM loan_types").all() as LoanType[];
    lastIntent = "LOAN_TYPES";
    return NextResponse.json({
      reply: "Here are our available loan products. You can ask about any specific one for full details:",
      loanTypes: loans,
      confidence: "high",
    });
  }

  // 8. FAQ partial match
  const faqMatch = db
    .prepare("SELECT answer FROM faq WHERE ? LIKE '%' || question || '%'")
    .get(cleaned) as { answer: string } | undefined;
  if (faqMatch) {
    lastIntent = intent;
    return NextResponse.json({ reply: faqMatch.answer, confidence });
  }

  // 9. Intent-based varied response
  if (RESPONSES[intent]) {
    lastIntent = intent;
    return NextResponse.json({ reply: prefix + pick(RESPONSES[intent]), confidence, matchedCount });
  }

  // 10. Unknown — trigger learning mode
  lastIntent = "UNKNOWN";
  return NextResponse.json({
    reply: "I'm not familiar with that yet. Could you teach me the correct answer so I can help others too?",
    unknown: true,
    question: cleaned,
    confidence: "low",
  });
}
