export type NarrativeVariant = "long" | "structured" | "hybrid";

export const narrativeVariants = ["long", "structured", "hybrid"] as const;

export const aminaResearchProfile = {
  id: "amina-rahman",
  name: "Amina Rahman",
  designation: "RCC",
  credentialLabel: "Registered Clinical Counsellor",
  verification: {
    label: "Credential verified by BCMC",
    verifiedDate: "2026-08-20",
    displayDate: "Aug 20, 2026",
    fullDisplayDate: "August 20, 2026",
    provenance: "RCC status checked by BCMC · August 20, 2026",
  },
  gender: "Woman",
  muslimSelfIdentification: true,
  availability: {
    status: "Accepting new clients",
    confirmedDate: "2026-08-21",
    confirmedDisplay: "Aug 21",
    fullConfirmedDisplay: "August 21, 2026",
    waitlist: "No waitlist",
    broadSchedule: "Weekday daytime + two evenings",
  },
  location: {
    city: "Surrey",
    province: "BC",
    area: "Surrey City Centre area",
    inPerson: true,
    virtual: true,
    virtualScope: "British Columbia",
  },
  accessibility: {
    stepFreeEntrance: true,
    elevatorAccess: "Yes, where needed",
    accessibleWashroom: true,
    practicalWording:
      "Step-free access and an accessible washroom are available. Contact the practice if you need to confirm a specific accessibility requirement before visiting.",
  },
  scope: {
    adults: true,
    individual: true,
    teens: false,
    children: false,
    couples: false,
    families: false,
  },
  languages: {
    therapy: ["English", "Urdu"],
    conversational: ["Punjabi"],
  },
  fees: {
    standard: 165,
    currency: "CAD",
    sessionMinutes: 50,
    slidingScale: "Limited spaces may be available",
    rccReceipts: true,
    directBilling: false,
    insuranceWording:
      "RCC receipts are available. Amina does not direct bill insurers. Coverage depends on your individual benefits plan.",
  },
  consultation: {
    offered: true,
    fee: 0,
    durationMinutes: 15,
  },
  primaryAreas: [
    "Anxiety and persistent worry",
    "Family and relationship stress",
    "Life transitions and identity",
  ],
  additionalExperience: ["Burnout", "Grief", "Intergenerational conflict"],
  workingStyle: {
    heading: "Working style",
    facts: [
      "Amina asks questions actively and does not expect you to carry the entire conversation.",
      "Sessions have flexible structure, with enough direction to stay purposeful and room to change direction when something important comes up.",
      "She often helps clients notice patterns in thoughts, emotions, relationships, and behaviour.",
      "She may suggest practical strategies or between-session exercises when they seem useful.",
      "Goals can be clarified and revisited collaboratively over time.",
      "She invites feedback if something in counselling is not useful.",
    ],
  },
  firstSession: {
    heading: "What you can expect when we first meet",
    body: "Our first session is a chance for you to share what brought you here, ask questions, and begin talking about what you hope may change. You do not need to have everything figured out or tell your whole story at once. It is also a chance to get a feel for whether working together seems useful.",
  },
  faithCulture: {
    heading: "Faith, culture & counselling",
    body: "Religion, spirituality, family expectations, and culture can all be discussed when they matter to you. If you want your beliefs or spiritual practices to inform our work, we can make space for that. I do not assume that clients seeking a Muslim counsellor want religious content in therapy, and I do not describe my practice as Islamic counselling.",
    supportingLine:
      "Amina identifies as Muslim and does not claim specialist Islamic psychology or Islamic counselling training.",
    culturalFamiliarity:
      "Amina reports familiarity with South Asian diaspora experiences and intergenerational family dynamics.",
  },
  professional: {
    designation: "Registered Clinical Counsellor (RCC)",
    credentialStatus: "Credential verified by BCMC · August 20, 2026",
    education: {
      degree: "Master of Counselling",
      institution: "City University of Seattle",
    },
    experience: "7 years of post-master's clinical practice",
    approaches: [
      "Cognitive Behavioural Therapy (CBT) informed",
      "Acceptance and Commitment Therapy (ACT) informed",
      "Attachment-oriented approaches",
    ],
  },
  practice: {
    name: "Cedar Bridge Counselling",
    type: "Independent/private counselling practice",
  },
  contact: {
    heading: "Thinking about reaching out?",
    body: "Amina offers a free 15-minute consultation. Reaching out doesn't commit you to ongoing counselling.",
    ctaLabel: "Contact Amina",
    handoff:
      "You'll continue to Amina's secure clinic contact page. BCMC won't receive the message you send there.",
  },
} as const;

export const aminaNarrativeVariants = {
  long: {
    sections: [
      {
        heading: "About Amina",
        paragraphs: [
          "I'm a Registered Clinical Counsellor working with adults who may be feeling overwhelmed by persistent worry, relationship strain, family expectations, or a period of change in their lives. Some of the people I work with know exactly what they want help with, while others simply know that something feels difficult and they want a place to begin making sense of it.",
          "My approach is active, collaborative, and flexible. I ask questions, listen closely, and help clients notice patterns in how their thoughts, emotions, relationships, and behaviour connect. We may identify specific goals and use practical strategies or exercises when they are helpful, but I don't believe every session needs to follow a rigid agenda. If something important comes up, we can slow down and follow it.",
          "In our first session, we'll talk about what brought you in, what feels important right now, and what you hope may change. You don't need to know exactly what to say or tell your whole story immediately. You can also ask questions and get a feel for whether working together seems useful.",
        ],
      },
    ],
  },
  structured: {
    sections: [
      {
        heading: "People often come to me when...",
        paragraphs: [
          "Worry is taking up too much space, relationships or family expectations feel difficult, or a period of change has left them uncertain about what they want next. Some people arrive with a clear concern; others simply know that something isn't working and want help making sense of it.",
        ],
      },
      {
        heading: "What working together is like...",
        paragraphs: [
          "I take an active but flexible approach. I'll ask questions, listen closely, and help you notice patterns in what you're thinking, feeling, and doing. We can work toward specific goals and use practical strategies when they're helpful, while still making room for unexpected things that matter.",
        ],
      },
      {
        heading: "What you can expect when we first meet...",
        paragraphs: [
          "We'll talk about what brought you in, what feels most important right now, and what you hope may change. You don't need to have everything figured out or tell your whole story at once. You can ask questions and decide whether continuing together seems useful.",
        ],
      },
    ],
  },
  hybrid: {
    sections: [
      {
        heading: "About Amina",
        paragraphs: [
          "I'm a Registered Clinical Counsellor who works with adults navigating anxiety, relationship stress, family pressures, and periods of change. My approach is active but flexible: I'll ask questions, help you notice patterns, and work with you to understand what may need to shift. You don't need to arrive with everything figured out.",
        ],
      },
      {
        heading: "What working together is like",
        paragraphs: [
          "We'll work as a team. I ask questions, listen closely, and help you understand patterns while building practical ways forward. Sessions are purposeful but flexible, and we can adjust our focus as your needs change.",
        ],
      },
      {
        heading: "What you can expect when we first meet",
        paragraphs: [
          "Our first session is a chance to talk about what brought you here, ask questions, and get a feel for whether we're a good fit. There's no pressure to have everything figured out or tell your entire story immediately.",
        ],
      },
    ],
  },
} as const satisfies Record<
  NarrativeVariant,
  { sections: readonly { heading: string; paragraphs: readonly string[] }[] }
>;

export function isNarrativeVariant(value: unknown): value is NarrativeVariant {
  return narrativeVariants.includes(value as NarrativeVariant);
}

export function getAminaSharedBaselineSnapshot() {
  return aminaResearchProfile;
}

export function assertAminaT1SharedBaselineParity() {
  const firstSnapshot = JSON.stringify(getAminaSharedBaselineSnapshot());

  for (const variant of narrativeVariants) {
    const variantSnapshot = JSON.stringify(getAminaSharedBaselineSnapshot());

    if (variantSnapshot !== firstSnapshot) {
      throw new Error(
        `Amina T1 shared baseline differs for narrative variant: ${variant}`,
      );
    }
  }

  return true;
}
