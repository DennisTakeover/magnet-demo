import type { PersonaId } from '../types';
import type { PersonaConfig, PersonaSeed, SeedHelpers } from './types';
import { coachConfig, coachSeed } from './coach';
import { webshopConfig, webshopSeed } from './webshop';
import { storeConfig, storeSeed } from './store';

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  coach: coachConfig,
  webshop: webshopConfig,
  store: storeConfig,
};

export const PERSONA_ORDER: PersonaId[] = ['coach', 'webshop', 'store'];

export const PERSONA_SEEDS: Record<PersonaId, (h: SeedHelpers) => PersonaSeed> = {
  coach: coachSeed,
  webshop: webshopSeed,
  store: storeSeed,
};

export type { PersonaConfig, DemoContact } from './types';
