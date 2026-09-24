export type PanelSrc =
  // Real uploads: `base` + "-800.avif" etc. produced by functions/src/images.ts
  | { kind: 'img'; base: string; w: number; h: number; alt?: string }
  // Seed/demo art drawn procedurally (no borrowed covers)
  | { kind: 'art'; seed: string; n: number; alt?: string }
  // A single ready URL (signed premium URL, or a demo-mode local image)
  | { kind: 'url'; src: string; w: number; h: number; alt?: string }
  // Premium panel the viewer can't unlock yet
  | { kind: 'locked'; n: number };

export interface Creator {
  uid: string;
  name: string;
  handle: string;
  bio?: string;
  payoutsEnabled?: boolean;
}

export interface Series {
  slug: string;
  title: string;
  tagline: string;
  about: string;
  creatorUids: string[];
  hue: number; // placeholder art palette
  followers: number;
  tags: string[];
  schedule?: string;
}

export interface Episode {
  id: string; // unique within series
  slug: string; // series slug
  number: number;
  title: string;
  caption?: string;
  publishedAt: number; // ms
  premium: boolean;
  panels: PanelSrc[];
  likes: number;
  comments: number;
  views: number;
}

export interface Comment {
  id: string;
  uid: string;
  handle: string;
  body: string;
  createdAt: number;
  parentId?: string;
  status?: 'visible' | 'held' | 'removed';
}

export interface Account {
  uid: string;
  handle: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  isCreator: boolean;
}

export interface Subscription {
  status: 'active' | 'past_due' | 'canceled' | 'none';
  picks: string[]; // series slugs
  currentPeriodEnd?: number;
  since?: number;
}

export type SortMode = 'hot' | 'new' | 'top' | 'following';
export type Density = 'card' | 'compact' | 'classic';
