// Default negotiation steps
export const DEFAULT_NEGOTIATION_STEPS = [
  { label: 'Proposal Sent', done: false },
  { label: 'Proposal Review Call Scheduled', done: false },
  { label: 'Revision Requested', done: false },
  { label: 'Terms Alignment', done: false },
  { label: 'Final Offer Sent', done: false },
  { label: 'Waiting for Signature', done: false },
  { label: 'Closed – Won', done: false },
  { label: 'Closed – Lost', done: false }
];

// Customer feedback data
export const CUSTOMER_FEEDBACK = [
  {
    company: 'Acme Corp',
    rating: 5,
    comment: 'Outstanding collaboration and communication throughout the project.'
  },
  {
    company: 'Beta LLC',
    rating: 4,
    comment: 'Delivered high-quality work, but there were some minor delays.'
  },
  {
    company: 'Gamma Inc',
    rating: 5,
    comment: 'Exceeded expectations in every aspect. Highly recommended.'
  },
  {
    company: 'Delta Partners',
    rating: 3,
    comment: 'Good effort, but there is room for improvement in responsiveness.'
  }
];

// Hardcoded fallback for upcoming follow-ups
export const HARDCODED_FOLLOWUPS = [
  { name: "Acme Corp", lastContactDate: "2024-06-15" },
  { name: "Beta LLC", lastContactDate: "2024-06-18" },
  { name: "Gamma Inc", lastContactDate: "2024-06-20" }
]; 