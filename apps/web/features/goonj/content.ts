// All copy and data for the /goonj landing page. Product facts come from
// goonj.com (landing, /limited-release, /faq). Testimonials are SAMPLE
// content until real, consented quotes replace them.

export const GOONJ = {
  site: "https://goonj.com",
  cta: "https://goonj.com/limited-release",
  faq: "https://goonj.com/faq",
  privacy: "https://goonj.com/privacy-policy",
  terms: "https://goonj.com/terms-of-service",
  contact: "https://goonj.com/contact",
  linkedin: "https://www.linkedin.com/company/goonjai/",
} as const;

export const NAV_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Moments", href: "#moments" },
  { label: "Mentors", href: "#mentors" },
  { label: "Stories", href: "#stories" },
  { label: "Trust", href: "#trust" },
  { label: "FAQ", href: "#faq" },
] as const;

export const HERO = {
  eyebrow: "Limited release · Made in India",
  sub: "Build the human skills you need to handle the conversations, decisions, and leadership situations that impact your career.",
  bullets: [
    "Master the moments that matter in a changing workplace.",
    "Practise difficult conversations before they happen.",
    "Small steps you can apply at work the same day.",
  ],
  cta: "Get early access",
  reassure: "Start free. Leave anytime. Always private.",
};

/** The live session shown in the hero phone. */
export const HERO_SESSION = {
  mentor: "Aarya",
  title: "Session 3 · Taking critical feedback",
  messages: [
    { from: "mentor", text: "Kal ki team meeting yaad hai? Let's replay the moment your manager pushed back." },
    { from: "user", text: "Honestly, it felt personal. Main defensive ho gaya tha." },
    { from: "mentor", text: "That's human. Try this: pause, name the point, ask one question. Ready to practise?" },
  ],
} as const;

export const PROOF_FACTS = [
  "Talks in Hindi and English",
  "Switch between voice and video",
  "Remembers your journey",
  "Private by design",
  "Built for Indian workplaces",
  "Practice in 10-minute sessions",
  "Grows as your role changes",
];

/* ---------- USP: comparison ---------- */
export const USP = {
  title: ["Not a course.", "Not a chatbot.", "Not a coach."],
  sub: "Goonj is a mentor you practise with. It knows your situation, rehearses the hard moment with you, and checks how it went at work.",
  columns: ["Goonj", "Online course", "AI chatbot", "Executive coach"] as const,
  rows: [
    { label: "Built around your real situation", values: [true, false, "partial", true] },
    { label: "Lets you rehearse the conversation", values: [true, false, "partial", "partial"] },
    { label: "Remembers your journey", values: [true, false, false, true] },
    { label: "There at 11pm before the meeting", values: [true, true, true, false] },
    { label: "Talks the way you do, Hindi or English", values: [true, false, "partial", "partial"] },
    { label: "Checks how it went at work", values: [true, false, false, true] },
    { label: "Priced for individuals", values: [true, true, true, false] },
  ] as { label: string; values: (boolean | "partial")[] }[],
  closer: [
    "The real measure of progress is not how well you talk to Goonj. It's how well you handle the moments that matter ",
    "without",
    " Goonj.",
  ],
};

/* ---------- Journey: the product model ---------- */
export const JOURNEY = [
  {
    key: "track",
    step: "Track",
    title: "Pick the direction you want to grow in",
    body: "Session 0 gets to know you: your role, your challenges, where you want to go. Goonj suggests a Track built around that.",
  },
  {
    key: "playbook",
    step: "Playbook",
    title: "Work through one skill at a time",
    body: "Each Track breaks into Playbooks, like handling feedback or leading your first team, sized for a busy week.",
  },
  {
    key: "session",
    step: "Session",
    title: "Practise the moment, out loud",
    body: "Short voice or video sessions where you rehearse the real conversation with your mentor, not just read about it.",
  },
  {
    key: "marker",
    step: "Marker",
    title: "Notice the shift as it happens",
    body: "Markers capture the behaviours you're building, so you can see your progress instead of guessing at it.",
  },
  {
    key: "activity",
    step: "Real-world activity",
    title: "Take it into Monday's meeting",
    body: "Each Playbook ends with something to try at work. Goonj asks how it went, and adapts what comes next.",
  },
  {
    key: "badge",
    step: "Badge",
    title: "Earn it where it counts",
    body: "Finish a Playbook and apply it at work, and you earn a Badge. That's proof you can handle the moment without Goonj.",
  },
] as const;

/* ---------- Moments that matter ---------- */
export const MOMENTS = [
  {
    key: "feedback",
    tab: "Critical feedback",
    title: "Did the feedback you got feel personal?",
    situation: "Your manager gives you critical feedback during a team discussion.",
    user: "Soumya",
    mentor: "Aarya",
    chat: [
      { from: "user", text: "Sabke saamne bola unhone. I just went quiet and felt small." },
      { from: "mentor", text: "That sting is real. Let's separate the point from the delivery. What was the actual feedback?" },
      { from: "user", text: "That my updates are too long, I guess." },
      { from: "mentor", text: "Good. Let's practise a reply that owns it and asks one clarifying question. You go first." },
    ],
  },
  {
    key: "promotion",
    tab: "A big promotion",
    title: "Does your promotion feel overwhelming?",
    situation: "When a promotion comes with more responsibility.",
    user: "Rohan",
    mentor: "Abhimanyu",
    chat: [
      { from: "user", text: "Promotion mil gaya, but now I manage people who were my peers. Kaise handle karun?" },
      { from: "mentor", text: "Congratulations. The first 30 days set the tone. Shall we plan your first one-on-one?" },
      { from: "user", text: "Haan, I keep avoiding it." },
      { from: "mentor", text: "Let's rehearse it. I'll play Priya, who wanted the role too. Start whenever you're ready." },
    ],
  },
  {
    key: "junior",
    tab: "Passed over",
    title: "Did your junior get promoted?",
    situation: "The promotion you were hoping for went to someone else.",
    user: "Kashif",
    mentor: "Aarya",
    chat: [
      { from: "user", text: "Mera junior promote ho gaya. I don't even know how to face him tomorrow." },
      { from: "mentor", text: "That hurts, and it's okay to feel it. Tomorrow is one conversation. Want to find the words together?" },
      { from: "user", text: "And then talk to my manager about why?" },
      { from: "mentor", text: "Yes, after. We'll frame it around what you need to grow, not what went wrong." },
    ],
  },
  {
    key: "senior",
    tab: "Team vs senior",
    title: "Does protecting your team hurt your senior?",
    situation: "When supporting your senior feels like hurting your team.",
    user: "Nikhil",
    mentor: "Abhimanyu",
    chat: [
      { from: "user", text: "Boss wants weekend work again. Team is already burnt out. Main beech mein phasa hoon." },
      { from: "mentor", text: "You can respect both. Let's find what your senior actually needs by Monday." },
      { from: "user", text: "Maybe just the client deck, not the whole release." },
      { from: "mentor", text: "That's your opening. Let's practise proposing it so it sounds like a plan, not a no." },
    ],
  },
] as const;

/* ---------- Mentors ---------- */
export const MENTORS = [
  {
    key: "aarya",
    name: "Aarya",
    role: "Your Goonj mentor for confidence and communication",
    voice: "Warm, steady, gently direct",
    traits: ["Feedback & difficult talks", "Self-advocacy", "Workplace confidence"],
    line: "“Let's not rehearse the perfect answer. Let's rehearse your answer.”",
  },
  {
    key: "abhimanyu",
    name: "Abhimanyu",
    role: "Your Goonj mentor for leadership and decisions",
    voice: "Calm, strategic, plain-spoken",
    traits: ["First-time leadership", "Managing up", "Hard decisions"],
    line: "“Leading isn't having every answer. It's knowing which question to ask first.”",
  },
] as const;

/* ---------- Goonj gets you ---------- */
export const FEATURES = [
  {
    key: "personal",
    title: "Personal to you",
    body: "No one-size-fits-all learning. Built around who you are, the challenges you face, and what you want to achieve.",
  },
  {
    key: "memory",
    title: "Progress without starting over",
    body: "Goonj remembers what you're working on, your struggles and your progress, so you never start from scratch.",
  },
  {
    key: "language",
    title: "Talk the way you talk",
    body: "Switch between Hindi and English mid-sentence. Goonj follows along without breaking the conversation.",
  },
  {
    key: "modes",
    title: "Voice or video, your call",
    body: "Practise through seamless voice and video switching, without losing your place.",
  },
  {
    key: "practice",
    title: "Practise what matters",
    body: "Go beyond knowing what to do. Rehearse realistic situations and feel prepared when the real moment arrives.",
  },
  {
    key: "lasting",
    title: "Powerful enough to last",
    body: "Build behaviours that become natural and stay with you as your career grows.",
  },
] as const;

/* ---------- Stories (SAMPLE — replace with real, consented quotes) ---------- */
export type Story = {
  name: string;
  role: string;
  city: string;
  quote: string;
  before: string;
  after: string;
  duration: string; // voice-note length shown on the card
  tint: 1 | 2 | 3 | 4 | 5;
};

export const STORIES: Story[] = [
  {
    name: "Ananya R.",
    role: "Product manager",
    city: "Bengaluru",
    quote: "I rehearsed my appraisal talk twice with Aarya. In the real one, my voice didn't shake once.",
    before: "Froze every time my skip-level asked a direct question.",
    after: "Now I answer first, then ask what they're really looking for.",
    duration: "0:18",
    tint: 1,
  },
  {
    name: "Vikram S.",
    role: "Engineering lead",
    city: "Pune",
    quote: "First month as a manager. Abhimanyu helped me have the one conversation I was avoiding.",
    before: "Avoided giving feedback to a senior engineer for weeks.",
    after: "Had the talk on Monday. We're working better than before.",
    duration: "0:22",
    tint: 2,
  },
  {
    name: "Mehak K.",
    role: "Analyst",
    city: "Gurugram",
    quote: "It switches to Hindi when I do. Feels like talking to a didi who actually gets corporate life.",
    before: "Rehearsed in my head and still blanked in meetings.",
    after: "I practise out loud for ten minutes the night before.",
    duration: "0:14",
    tint: 3,
  },
  {
    name: "Arjun M.",
    role: "Sales manager",
    city: "Mumbai",
    quote: "It remembered my promotion goal from three weeks ago and asked how the one-on-one went.",
    before: "Every self-help app forgot me after day three.",
    after: "Goonj picks up exactly where we left off.",
    duration: "0:16",
    tint: 4,
  },
  {
    name: "Farah N.",
    role: "HR business partner",
    city: "Lucknow",
    quote: "I've sat through soft-skills workshops for years. This is the first time I practised instead of listened.",
    before: "Workshops felt great on Friday and were forgotten by Monday.",
    after: "Small sessions, applied the same week. It actually stuck.",
    duration: "0:20",
    tint: 5,
  },
  {
    name: "Karan T.",
    role: "Founder",
    city: "Delhi",
    quote: "Before investor calls I do a session on staying calm under pushback. It has become a ritual.",
    before: "Got defensive whenever someone challenged my numbers.",
    after: "I pause, acknowledge the point, and answer with a plan.",
    duration: "0:19",
    tint: 1,
  },
];

/** Short lines for the marquee (SAMPLE). */
export const STORY_SNIPPETS = [
  { name: "Riya P.", role: "Consultant", text: "Didn't feel like talking to an AI at all." },
  { name: "Siddharth G.", role: "Team lead", text: "My one-on-ones finally have structure." },
  { name: "Neelam J.", role: "Operations", text: "Ten minutes a day. Noticeable in two weeks." },
  { name: "Aditya V.", role: "Designer", text: "It understood my situation. I felt heard." },
  { name: "Pooja D.", role: "Finance", text: "Hinglish feels so much more natural." },
  { name: "Rahul B.", role: "Account manager", text: "I said no to scope creep without guilt." },
  { name: "Tanvi L.", role: "Associate", text: "Session 0 felt like a real conversation." },
  { name: "Imran Q.", role: "Engineering manager", text: "Helped me manage up without sounding weak." },
] as const;

/* ---------- Trust ---------- */
export const TRUST = [
  {
    key: "private",
    title: "You stay private",
    body: "Your personal information and conversations are handled responsibly, with privacy at the core of how Goonj is designed.",
  },
  {
    key: "secure",
    title: "You stay secure",
    body: "Your information is protected through technical safeguards and security measures, so you can share openly.",
  },
  {
    key: "informed",
    title: "You stay informed",
    body: "We're transparent about how your information is collected and handled, with our practices set out in our Privacy Policy.",
  },
  {
    key: "control",
    title: "You stay in control",
    body: "Goonj learns from what you share. If something doesn't feel right, you can correct your journey at any time.",
  },
] as const;

/* ---------- Limited release ---------- */
export const RELEASE = {
  title: "Early. Involved. Valued.",
  sub: "Goonj is opening to a small group of professionals first. Join the limited release and help shape what comes next.",
  benefits: [
    { title: "You're one of the few", body: "A small first cohort, so every member gets attention." },
    { title: "You get it first", body: "New Tracks, mentors and features reach you before anyone else." },
    { title: "Your feedback matters more", body: "What you tell us shapes the product, directly." },
    { title: "You're closer to the team", body: "Talk to the people building Goonj, not a support queue." },
  ],
  steps: ["Request access", "Get selected", "Start Session 0"],
};

/* ---------- FAQ ---------- */
export const FAQS = [
  {
    q: "What is the Goonj app?",
    a: "Goonj is a workplace conversational app that helps professionals build human skills, like handling feedback, leading people and making tough calls, through short, personalised practice sessions with an AI mentor.",
  },
  {
    q: "Who is the Goonj app for?",
    a: "Working professionals at any stage: individual contributors facing tougher conversations, new managers stepping into leadership, and experienced leaders preparing for what's next.",
  },
  {
    q: "What makes Goonj different from a coach, course or AI chatbot?",
    a: "A course teaches everyone the same thing. A chatbot forgets you. A coach is expensive and not there at 11pm. Goonj remembers your journey, lets you rehearse the actual moment, and checks how it went at work.",
  },
  {
    q: "Are my conversations with Goonj private and secure?",
    a: "Yes. Privacy is at the core of how Goonj is designed. Your conversations are protected with technical safeguards, and our Privacy Policy explains exactly how your information is handled.",
  },
  {
    q: "Can I talk to Goonj about something I'm dealing with right now?",
    a: "Yes. Bring the situation you're facing this week. Goonj helps you think it through and practise the conversation before it happens.",
  },
  {
    q: "Is Goonj a therapy or medical advice app?",
    a: "No. Goonj is for professional and personal development at work. It isn't a substitute for therapy or medical care.",
  },
  {
    q: "How do I get started?",
    a: "Request early access to the limited release. If you're selected, you'll start with Session 0, where Goonj gets to know you and suggests your first Track.",
  },
] as const;

export const FINAL = {
  eyebrow: "Rise. Respect. Relevance.",
  lead: "Ready to become more valuable at work?",
  cta: "Join the limited release",
  reassure: "Start free. Leave anytime. Always private.",
};
