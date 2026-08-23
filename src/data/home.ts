export const homeContent = {
  navigation: [
    { label: "Find Support", href: "/find" },
    { label: "Understanding Counselling", href: "/resources/how-counselling-can-help" },
    { label: "For Counsellors", href: "#footer" },
    { label: "Community", href: "#footer" },
    { label: "About BCMC", href: "#footer" },
  ],
  hero: {
    headline: "You don't need to know exactly what you need.",
    body: "Tell us what's bringing you here. We'll make it easier to see your options.",
    primaryCta: { label: "Help me find someone", href: "/find" },
    secondaryCta: { label: "Browse all counsellors", href: "/find" },
    microcopy: "No account needed to look.",
  },
  permission: {
    heading: "Wherever you are right now, you're welcome here.",
    statements: [
      "You might know what you're going through.",
      "You might only know that something doesn't feel right.",
      "You might be wondering if counselling could help.",
    ],
    reassurance: "All of that is enough to begin.",
  },
  orientation: {
    heading: "Here’s how it works.",
    steps: [
      {
        id: "tell",
        title: "Tell us what you can.",
        body: ["In your own words.", "As much or as little", "as you’d like."],
      },
      {
        id: "explore",
        title: "See ways to explore.",
        body: ["We’ll show you helpful", "ways to narrow your", "search if you want."],
      },
      {
        id: "learn",
        title: "Learn about counsellors.",
        body: ["Clear profiles help you", "understand who they are", "and how they work."],
      },
      {
        id: "decide",
        title: "You decide.",
        body: ["You’re in control.", "Choose who to contact,", "or choose not to."],
      },
    ],
  },
  organizationalHero: {
    eyebrow: "MORE THAN A DIRECTORY",
    heading: "We’re building stronger paths to mental-health support.",
    body: [
      "Finding a counsellor is one part of the picture.",
      "BCMC brings together people seeking support, Muslim counsellors, and community organizations to make mental-health support easier to understand, navigate and access across BC.",
    ],
    link: { label: "Why BCMC exists", href: "#" },
    pillars: [
      {
        id: "support-seekers",
        heading: "People seeking support",
        body: "Find and understand your options, without needing to know exactly what you’re looking for.",
      },
      {
        id: "counsellors",
        heading: "Counsellors",
        body: "Connect, learn, collaborate and build stronger professional referral networks.",
      },
      {
        id: "communities",
        heading: "Communities & organizations",
        body: "Build understanding, strengthen referral pathways and connect communities with mental-health professionals.",
      },
    ],
  },
  trust: {
    eyebrow: "Before you reach out",
    heading: "Know who you’re considering.",
    principles: [
      {
        id: "credentials",
        title: "Verified credentials",
        body: "All counsellors are Registered Clinical Counsellors (RCCs) licensed in BC.",
      },
      {
        id: "information",
        title: "Clear information",
        body: "See the details that matter before deciding whether to contact someone.",
      },
      {
        id: "identity",
        title: "Muslim identity, clearly explained",
        body: "Every counsellor here identifies as Muslim. Profiles make clear whether faith or spirituality is part of their practice.",
      },
      {
        id: "account",
        title: "Your choice, always",
        body: "Browse without an account. Learn about counsellors, and contact someone only if you choose to.",
      },
    ],
    supportLink: { label: "How we verify counsellors", href: "#" },
  },
  humanity: {
    heading: "Meet the counsellors.",
    body: "Browse profiles to learn who they work with, what they support, languages, location, availability and more.",
    browseLink: { label: "Browse counsellors", href: "/find" },
    // Placeholder counsellor data for Phase 1 static build. Replace with real, approved counsellor information before launch.
    counsellors: [
      {
        name: "Aisha Khan",
        credential: "RCC",
        image: "/images/counsellors/aisha.jpg",
        imagePosition: "50% 42%",
        featuredPopulations: ["Adults", "Couples"],
        featuredSupportAreas: ["Anxiety", "Stress", "Life transitions"],
        acceptedClientGenders: ["Women"],
        modality: ["Online", "In-person"],
        location: "Burnaby",
        languages: ["English", "Urdu"],
        href: "/find",
        initials: "AK",
      },
      {
        name: "Yusuf Malik",
        credential: "RCC",
        image: "/images/counsellors/yusuf.jpg",
        imagePosition: "50% 42%",
        featuredPopulations: ["Adults", "Couples"],
        featuredSupportAreas: ["Relationships", "Men’s issues", "Grief"],
        acceptedClientGenders: ["Women", "Men"],
        modality: ["Online", "In-person"],
        location: "Vancouver",
        languages: ["English"],
        href: "/find",
        initials: "YM",
      },
      {
        name: "Fatima Ahmed",
        credential: "RCC",
        image: "/images/counsellors/fatima.jpg",
        imagePosition: "50% 42%",
        featuredPopulations: ["Teens", "Young adults"],
        featuredSupportAreas: ["Trauma", "Self-esteem", "Grief"],
        acceptedClientGenders: ["Women", "Men"],
        modality: ["Online"],
        location: "Across BC",
        languages: ["English", "Urdu"],
        href: "/find",
        initials: "FA",
      },
      {
        name: "Omar Sadiq",
        credential: "RCC",
        image: "/images/counsellors/omar.jpg",
        imagePosition: "50% 42%",
        featuredPopulations: ["Adults", "Families"],
        featuredSupportAreas: ["Youth", "Identity", "Family"],
        acceptedClientGenders: ["Women", "Men"],
        modality: ["Online"],
        location: "Coquitlam",
        languages: ["English", "Arabic"],
        href: "/find",
        initials: "OS",
      },
    ],
  },
  contactReassurance: {
    heading: "The first step doesn’t have to be the final decision.",
    body: "Reaching out to a counsellor doesn’t mean you’ve decided they’re the one. You can ask about availability, fees, how they work, or arrange a consultation before deciding what you’d like to do next.",
    link: { label: "What happens when I reach out?", href: "/resources/what-to-expect" },
  },
  agency: {
    heading: "Want to understand\ncounselling first?",
    body: "You don't have to start by choosing a counsellor. Learn a little more about counselling and your options first.",
    resources: [
      {
        id: "help",
        title: "How counselling can help",
        body: "Understand what counselling can support, what it may look like, and when speaking with someone might be worth considering.",
        href: "/resources/how-counselling-can-help",
      },
      {
        id: "expect",
        title: "What to expect",
        body: "Learn what usually happens from first contact to an initial session and what comes afterwards.",
        href: "/resources/what-to-expect",
      },
      {
        id: "support",
        title: "Finding the right kind of support",
        body: "Understand your options without needing to know therapy types or clinical terminology first.",
        href: "/resources/finding-the-right-support",
      },
    ],
    finalCta: {
      heading: "Ready to explore?",
      body: "Explore on your own, or answer a few questions to narrow your options.",
      primary: { label: "Help me narrow it down", href: "/find" },
      secondary: { label: "Browse counsellors", href: "/find" },
    },
  },
  footer: {
    brand: {
      description:
        "Helping people find and understand their counselling options, with clearer information and less guesswork.",
      disclaimer:
        "BCMC is a discovery resource. It does not provide counselling, clinical advice, or emergency services.",
      urgent: { label: "Need urgent help?", href: "#" },
    },
    socials: [
      { label: "Instagram", href: "#" },
      { label: "Facebook", href: "#" },
      { label: "LinkedIn", href: "#" },
      { label: "YouTube", href: "#" },
    ],
    columns: [
      {
        heading: "Explore",
        links: [
          { label: "Find a counsellor", href: "/find" },
          { label: "Help me narrow it down", href: "/find" },
          { label: "How it works", href: "#orientation" },
          { label: "Meet the counsellors", href: "#counsellors" },
        ],
      },
      {
        heading: "About BCMC",
        links: [
          { label: "About BCMC", href: "#" },
          { label: "For counsellors", href: "#" },
          { label: "How we verify counsellors", href: "#" },
          { label: "Contact", href: "#" },
        ],
      },
      {
        heading: "Resources",
        links: [
          { label: "Understanding counselling", href: "#" },
          { label: "How counselling can help", href: "/resources/how-counselling-can-help" },
          { label: "What to expect", href: "/resources/what-to-expect" },
          {
            label: "Finding the right kind of support",
            href: "/resources/finding-the-right-support",
          },
          { label: "FAQ", href: "#" },
        ],
      },
    ],
    legal: {
      copyright: "© 2026 British Columbia Muslim Counsellors",
      links: [
        { label: "Privacy", href: "#" },
        { label: "Terms of Use", href: "#" },
        { label: "Accessibility", href: "#" },
        { label: "Sitemap", href: "#" },
      ],
    },
  },
} as const;
