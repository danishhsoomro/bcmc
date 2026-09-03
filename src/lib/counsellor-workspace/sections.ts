import type {
  CounsellorWorkspaceSection,
  CounsellorWorkspaceSectionKey,
} from "./types";

export const COUNSELLOR_WORKSPACE_SECTIONS: CounsellorWorkspaceSection[] = [
  {
    key: "practice",
    title: "Your practice",
    href: "/for-counsellors/profile/practice",
    implemented: true,
  },
  {
    key: "who_you_work_with",
    title: "Who you work with",
    href: "/for-counsellors/profile/who-you-work-with",
    implemented: true,
  },
  {
    key: "what_you_help_with",
    title: "What you help with",
    href: "/for-counsellors/profile/what-you-help-with",
    implemented: true,
  },
  {
    key: "how_you_work",
    title: "How you work",
    href: "/for-counsellors/profile/how-you-work",
    implemented: true,
  },
  {
    key: "faith",
    title: "Faith in counselling",
    href: "/for-counsellors/profile/faith",
    implemented: true,
  },
  {
    key: "cultural_familiarity",
    title: "Cultural & community familiarity",
    href: "/for-counsellors/profile/cultural-familiarity",
    implemented: true,
  },
  {
    key: "practical_details",
    title: "Practical details",
    href: "/for-counsellors/profile/practical-details",
    implemented: true,
  },
  {
    key: "availability_contact",
    title: "Contact & enquiries",
    href: "/for-counsellors/profile/availability-contact",
    implemented: true,
  },
  {
    key: "professional_background",
    title: "Professional background",
    href: "/for-counsellors/profile/professional-background",
    implemented: true,
  },
  {
    key: "your_profile",
    title: "Your profile",
    href: "/for-counsellors/profile/your-profile",
    implemented: true,
  },
];

const SECTION_KEY_ALIASES: Record<string, CounsellorWorkspaceSectionKey> = {
  practice: "practice",
  who_you_work_with: "who_you_work_with",
  "who-you-work-with": "who_you_work_with",
  what_you_help_with: "what_you_help_with",
  "what-you-help-with": "what_you_help_with",
  how_you_work: "how_you_work",
  "how-you-work": "how_you_work",
  working_style: "how_you_work",
  faith: "faith",
  cultural_familiarity: "cultural_familiarity",
  "cultural-familiarity": "cultural_familiarity",
  practical_details: "practical_details",
  "practical-details": "practical_details",
  availability_contact: "availability_contact",
  "availability-contact": "availability_contact",
  contact_enquiries: "availability_contact",
  professional_background: "professional_background",
  "professional-background": "professional_background",
  your_profile: "your_profile",
  "your-profile": "your_profile",
  profile_voice: "your_profile",
};

const SECTION_BY_ROUTE = new Map(
  COUNSELLOR_WORKSPACE_SECTIONS.map((section) => [
    section.href.split("/").at(-1),
    section,
  ]),
);

export function getSectionByRouteSegment(segment: string) {
  return SECTION_BY_ROUTE.get(segment) ?? null;
}

export function getSectionByKey(key: CounsellorWorkspaceSectionKey) {
  return COUNSELLOR_WORKSPACE_SECTIONS.find((section) => section.key === key);
}

export function getCanonicalSectionKey(
  value: string | null | undefined,
): CounsellorWorkspaceSectionKey | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  return SECTION_KEY_ALIASES[normalizedValue] ?? null;
}

export function getNextSection(
  key: CounsellorWorkspaceSectionKey,
): CounsellorWorkspaceSection | null {
  const index = COUNSELLOR_WORKSPACE_SECTIONS.findIndex(
    (section) => section.key === key,
  );

  if (index < 0) {
    return null;
  }

  return COUNSELLOR_WORKSPACE_SECTIONS[index + 1] ?? null;
}
