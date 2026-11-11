export type PetCard = {
  name: string;
  species?: string;
  breed?: string;
  age?: string;
  weight?: number;
  health?: {
    allergies?: string;
    medicalConditions?: string;
    dietaryRestrictions?: string;
  };
};

export type PetCardShareMessage = {
  type: 'pet-card-share';
  from: 'customer';
  payload: { pets: PetCard[] };
};

const MAX_PETS_PER_SHARE = 12;

export const PET_CARD_SHARED_ACKNOWLEDGEMENT = {
  type: 'pet-card-shared',
} as const;

function readText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
  return text.length > 0 ? text : undefined;
}

function readPet(value: unknown): PetCard | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const name = readText(candidate.name, 80);
  if (!name) return null;

  const pet: PetCard = { name };
  const species = readText(candidate.species, 40);
  const breed = readText(candidate.breed, 80);
  const age = readText(candidate.age, 40);
  if (species) pet.species = species;
  if (breed) pet.breed = breed;
  if (age) pet.age = age;
  if (
    typeof candidate.weight === 'number' &&
    Number.isFinite(candidate.weight) &&
    candidate.weight > 0 &&
    candidate.weight <= 1000
  ) {
    pet.weight = candidate.weight;
  }

  if (
    candidate.health !== null &&
    typeof candidate.health === 'object' &&
    !Array.isArray(candidate.health)
  ) {
    const healthSource = candidate.health as Record<string, unknown>;
    const health: NonNullable<PetCard['health']> = {};
    const allergies = readText(healthSource.allergies, 240);
    const medicalConditions = readText(healthSource.medicalConditions, 240);
    const dietaryRestrictions = readText(healthSource.dietaryRestrictions, 240);
    if (allergies) health.allergies = allergies;
    if (medicalConditions) health.medicalConditions = medicalConditions;
    if (dietaryRestrictions) health.dietaryRestrictions = dietaryRestrictions;
    if (Object.keys(health).length > 0) pet.health = health;
  }

  return pet;
}

export function parsePetCardShareMessage(
  value: unknown,
): PetCardShareMessage | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const message = value as Record<string, unknown>;
  if (
    message.type !== 'pet-card-share' ||
    message.from !== 'customer' ||
    message.payload === null ||
    typeof message.payload !== 'object' ||
    Array.isArray(message.payload)
  ) {
    return null;
  }

  const petsValue = (message.payload as Record<string, unknown>).pets;
  if (!Array.isArray(petsValue)) return null;
  const pets = petsValue
    .slice(0, MAX_PETS_PER_SHARE)
    .map(readPet)
    .filter((pet): pet is PetCard => pet !== null);
  if (pets.length === 0) return null;

  return {
    type: 'pet-card-share',
    from: 'customer',
    payload: { pets },
  };
}
