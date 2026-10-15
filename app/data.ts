export type Job = {
  id: string;
  title: string;
  company: string;
  city: string;
  mode: string;
  duration: string;
  tags: string[];
  jobCategory: string;
  status: string;
  logo: string;
  logoUrl?: string;
  color: string;
  summary: string;
  contactEmail: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  publishedAt: string;
  region?: string;
  sortOrder?: number;
  featured?: boolean;
  degree?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  industry?: string;
};
export type RegistrationField = {
  id: string;
  label: string;
  type: "text" | "tel" | "email" | "textarea" | "radio" | "checkbox";
  required: boolean;
  description?: string;
  placeholder?: string;
  maxLength?: number;
  options?: string[];
};
export type RichBlock = {
  id: string;
  type:
    | "heading"
    | "text"
    | "image"
    | "gallery"
    | "video"
    | "quote"
    | "agenda"
    | "card"
    | "attachment";
  title?: string;
  text?: string;
  url?: string;
  caption?: string;
  items?: string[];
  meta?: string;
};
export type Activity = {
  challenge?: import("../lib/challenges/model").ChallengeSpec;
  id: string;
  title: string;
  date: string;
  place: string;
  category: string;
  capacity: number;
  registered: number;
  status: string;
  cover: string;
  coverType?: "image" | "video";
  videoUrl?: string;
  summary: string;
  registrationFields?: RegistrationField[];
  region?: string;
  sortOrder?: number;
  featured?: boolean;
  publisher?: string;
  agenda?: string[];
  abilityTags?: string[];
  bodyBlocks?: RichBlock[];
  gallery?: string[];
  attachments?: string[];
};
export type ContentItem = {
  videoUrl?: string;
  id: string;
  title: string;
  category: string;
  duration: string;
  level: string;
  summary: string;
  cover: string;
  coverType?: "image" | "video";
  mediaType: "article" | "video";
  sortOrder?: number;
  featured?: boolean;
  publisher?: string;
  bodyBlocks?: RichBlock[];
  gallery?: string[];
  attachments?: string[];
  tags?: string[];
};

// Public business records come exclusively from the database.
export const jobs: Job[] = [];
export const activities: Activity[] = [];
export const contents: ContentItem[] = [];
export const reviews: { id: string; type: string; name: string; submitted: string; risk: string; status: string }[] = [];
