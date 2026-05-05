export const PROMPTS = [
  // Reflection
  "What felt hardest today, and what would make tomorrow 10% easier?",
  "What's one thing you did today that your future self will thank you for?",
  "What emotion showed up most today, and what triggered it?",
  "If today were a chapter in a book, what would it be titled?",
  "What did you resist doing today — and why?",
  "What surprised you today?",
  "What would you do differently if you could replay today?",
  "What conversation from today is still on your mind?",
  "Describe today in exactly three words.",
  "What did you learn — about yourself or the world — today?",

  // Growth
  "What habit are you building that you're most proud of?",
  "What's one area of your life that needs more attention?",
  "What are you tolerating that you should either fix or accept?",
  "What skill do you want to develop this month?",
  "What's one belief you're slowly unlearning?",
  "What does your ideal version of tomorrow look like?",
  "What's one thing you could do this week that would make everything else easier?",
  "What would you attempt if you knew you couldn't fail?",
  "What story do you keep telling yourself that might not be true?",
  "What does progress look like for you right now?",

  // Gratitude
  "Write about three small moments today that were easy to overlook but worth noticing.",
  "Who made your day better, even slightly?",
  "What's something about your current situation you've been taking for granted?",
  "What's working well in your life right now?",
  "What are you looking forward to tomorrow?",

  // Free prompts
  "Write anything — no rules, no structure, just your thoughts.",
  "What's on your mind that you haven't said out loud yet?",
  "Tell the story of your day like you're writing it for someone who wasn't there.",
  "What do you want to remember about this period of your life?",
  "Write a letter to yourself six months from now.",
]

/** Returns a consistent prompt for a given date */
export function getPromptForDate(date) {
  const d = new Date(date)
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
  return PROMPTS[dayOfYear % PROMPTS.length]
}
