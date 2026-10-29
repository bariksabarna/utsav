/**
 * Planner form model and option lists.
 *
 * Responsibilities: keep the onboarding form shape, defaults, and allowed values
 * in one module shared by the UI and persistence.
 * FR IDs: FR-ONB-001, FR-ONB-002.
 */

import type {
  DietaryChoice,
  EventSubType,
  EventType,
  LanguageOption,
  Priority,
  VenueType,
  VendorStatus,
} from './engine/types';

/** Raw onboarding form values. */
export interface FormState {
  eventType: EventType;
  subType: EventSubType;
  budget: number;
  guests: number;
  children: number;
  venue: VenueType;
  cityTier: 1 | 2 | 3;
  date: string;
  startTime: string;
  dietary: DietaryChoice;
  language: LanguageOption;
  priority: Priority | 'Balanced';
  elderlyGuests: boolean;
  liveMusic: boolean;
  servesAlcohol: boolean;
  multiDay: boolean;
  livestream: boolean;
}

/** Default date 120 days from today. */
export const defaultDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

/** Default planner form. */
export const defaultForm: FormState = {
  eventType: 'Wedding',
  subType: 'Bengali',
  budget: 1500000,
  guests: 250,
  children: 0,
  venue: 'Indoor Hall',
  cityTier: 1,
  date: defaultDate,
  startTime: '18:00',
  dietary: 'Vegetarian',
  language: 'English',
  priority: 'Catering',
  elderlyGuests: false,
  liveMusic: false,
  servesAlcohol: false,
  multiDay: false,
  livestream: false,
};

/** Supported event types. */
export const eventOptions: EventType[] = ['Wedding', 'Birthday', 'Community Event'];

/** Sub-types per event type. */
export const subTypeOptions: Record<EventType, EventSubType[]> = {
  Wedding: ['Bengali', 'North Indian', 'South Indian', 'Christian', 'Muslim', 'Court', 'Destination'],
  Birthday: ['Kids', 'Milestone', 'Surprise'],
  'Community Event': ['Puja', 'Society Fest', 'Fundraiser', 'College Fest'],
};

/** Priority choices including the neutral balanced option. */
export const priorityOptions: Array<Priority | 'Balanced'> = [
  'Balanced',
  'Catering',
  'Photography',
  'Decor',
  'Music',
  'Venue',
  'Attire',
];

/** Dietary choices. */
export const dietaryOptions: DietaryChoice[] = [
  'Vegetarian',
  'Vegan',
  'Jain',
  'Halal',
  'No beef',
  'No pork',
  'Gluten-free',
  'Nut-free',
];

/** Venue choices. */
export const venueOptions: VenueType[] = [
  'Indoor Hall',
  'Outdoor',
  'Home',
  'Community Ground',
  'Destination',
];

/** Vendor pipeline statuses. */
export const vendorStatusOptions: VendorStatus[] = [
  'To shortlist',
  'Shortlist',
  'Contacted',
  'Quote received',
  'Booked',
  'Paid',
];

/** Language choices. */
export const languageOptions: LanguageOption[] = ['English', 'हिन्दी', 'বাংলা'];
