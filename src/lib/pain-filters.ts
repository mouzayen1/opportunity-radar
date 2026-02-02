/**
 * Pain Filters - Centralized patterns for identifying REAL problems vs noise
 *
 * Philosophy: We want UNSOLVED problems, not existing products or coding questions
 */

// ============ PATTERNS THAT INDICATE REAL PROBLEMS (KEEP) ============
export const PROBLEM_SIGNALS = [
  // Explicitly seeking solutions
  'looking for a tool',
  'looking for a',
  'looking for something',
  'is there a tool',
  'is there an app',
  'is there a service',
  'is there a way',
  'does anyone know of',
  'can anyone recommend',
  'any recommendations for',
  'need a tool',
  'need a solution',
  'need something that',
  'need help finding',

  // Expressing frustration/pain
  'frustrated with',
  'frustrated by',
  'struggling with',
  'struggling to',
  'pain point',
  'drives me crazy',
  'driving me crazy',
  'hate how',
  'hate that',
  'annoying that',
  'annoyed by',
  'tired of',
  'sick of',

  // Time/effort waste signals
  'waste time',
  'waste hours',
  'wasting time',
  'takes forever',
  'takes too long',
  'spend hours',
  'hours every week',
  'hours every day',
  'manually',
  'tedious',
  'repetitive',

  // Gap identification
  'wish there was',
  'why is there no',
  'why isn\'t there',
  'why doesn\'t',
  'someone should build',
  'somebody should make',
  'would pay for',
  'shut up and take my money',
  'take my money',

  // Seeking alternatives (dissatisfied with current)
  'alternative to',
  'alternatives to',
  'replacement for',
  'better than',
  'something like',
  'similar to but',

  // Community validation
  'anyone else have this problem',
  'am i the only one',
  'does anyone else',
  'how do you handle',
  'how do you deal with',
  'what do you use for',
]

// ============ PATTERNS THAT INDICATE EXISTING SOLUTIONS (REJECT) ============
export const ALREADY_SOLVED_SIGNALS = [
  // Product announcements (already built!)
  'show hn:',
  'show hn -',
  'launch hn:',
  'launched',
  'just launched',
  'launching',
  'announcing',
  'just announced',
  'introducing',
  'i built',
  'i made',
  'i created',
  'we built',
  'we made',
  'we created',
  'just shipped',
  'just released',
  'now available',
  'check out my',
  'check out our',
  'here\'s my',
  'here is my',
  'my new',
  'our new',

  // Recommendations (problem already solved)
  'i use',
  'i recommend',
  'try using',
  'you should use',
  'we use',
  'works great',
  'works well',
  'solved this with',
  'fixed this by',
  'the answer is',
  'the solution is',

  // Self-promotion
  'i\'m the founder',
  'i\'m the creator',
  'we\'re building',
  'ama',
  'ask me anything',

  // Meta/noise
  'hiring',
  'job',
  'resume',
  'salary',
  'interview',
  'meme',
  'funny',
  'lol',
  'lmao',
]

// ============ CODING QUESTIONS (REJECT - Not product opportunities) ============
export const CODING_QUESTION_PATTERNS = [
  /^how (?:do|can|to) (?:i|you|we) .{0,50}(?:in|with|using) (?:javascript|python|react|node|typescript|java|c\+\+|ruby|go|rust|php|css|html|sql)/i,
  /^what (?:does|is|are) .{0,30}(?:mean|do|return|work)/i,
  /^why (?:does|is|am i getting|do i get) .{0,30}(?:error|undefined|null|nan|exception)/i,
  /(?:syntax|type|reference|runtime|compile) error/i,
  /^how to (?:install|import|require|use|call|define|declare|implement|create a function|write a function)/i,
  /undefined is not|cannot read property|typeerror|referenceerror|syntaxerror/i,
  /npm install|pip install|yarn add|cargo add|gem install/i,
]

// ============ HELPER FUNCTIONS ============

/**
 * Check if text indicates an UNSOLVED problem (opportunity)
 */
export function hasProblemSignal(text: string): boolean {
  const lower = text.toLowerCase()
  return PROBLEM_SIGNALS.some(signal => lower.includes(signal))
}

/**
 * Check if text indicates an ALREADY SOLVED problem (not an opportunity)
 */
export function hasAlreadySolvedSignal(text: string): boolean {
  const lower = text.toLowerCase()
  return ALREADY_SOLVED_SIGNALS.some(signal => lower.includes(signal))
}

/**
 * Check if text is a coding question (not a product opportunity)
 */
export function isCodingQuestion(text: string): boolean {
  return CODING_QUESTION_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * Main filter: Is this a real opportunity?
 * Returns: { isOpportunity: boolean, reason: string }
 */
export function analyzeOpportunityPotential(title: string, body: string = ''): {
  isOpportunity: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
} {
  const combined = `${title} ${body}`.toLowerCase()

  // REJECT: Coding questions
  if (isCodingQuestion(combined)) {
    return { isOpportunity: false, reason: 'Coding question, not a product opportunity', confidence: 'high' }
  }

  // REJECT: Already solved/existing products
  if (hasAlreadySolvedSignal(combined)) {
    return { isOpportunity: false, reason: 'Product already exists or problem solved', confidence: 'high' }
  }

  // ACCEPT: Clear problem signals
  if (hasProblemSignal(combined)) {
    return { isOpportunity: true, reason: 'Clear unsolved problem signal detected', confidence: 'high' }
  }

  // UNCERTAIN: No clear signals either way
  return { isOpportunity: false, reason: 'No clear problem signal detected', confidence: 'low' }
}

/**
 * Extract the core pain point from text
 */
export function extractPainPoint(text: string): string | null {
  const lower = text.toLowerCase()

  // Try to find the specific pain
  const patterns = [
    /(?:frustrated with|struggling with|tired of|sick of|hate) ([^.!?]{10,100})/i,
    /(?:looking for|need) (?:a |an )?(?:tool|app|service|solution|way) (?:to |that |for )([^.!?]{10,100})/i,
    /(?:wish there was|why is there no) ([^.!?]{10,100})/i,
    /(?:waste|spend) (?:time|hours) ([^.!?]{10,100})/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return null
}
