import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parsePetCardShareMessage,
  PET_CARD_SHARED_ACKNOWLEDGEMENT,
} from '../lib/pet-card-protocol';

const validMessage = {
  type: 'pet-card-share',
  from: 'customer',
  payload: {
    pets: [
      {
        name: 'Milo',
        species: 'dog',
        breed: 'Mixed',
        age: '3 years',
        weight: 12.4,
        health: {
          allergies: 'Chicken',
          medicalConditions: 'None',
          dietaryRestrictions: 'Low sodium',
          privatePhone: 'must not be included',
        },
        ownerEmail: 'must not be included',
      },
    ],
  },
};

test('accepts a customer pet-card share and keeps only supported card fields', () => {
  const parsed = parsePetCardShareMessage(validMessage);
  assert.deepEqual(parsed, {
    type: 'pet-card-share',
    from: 'customer',
    payload: {
      pets: [
        {
          name: 'Milo',
          species: 'dog',
          breed: 'Mixed',
          age: '3 years',
          weight: 12.4,
          health: {
            allergies: 'Chicken',
            medicalConditions: 'None',
            dietaryRestrictions: 'Low sodium',
          },
        },
      ],
    },
  });
});

test('rejects pet-card shares that are not explicitly from the customer', () => {
  assert.equal(
    parsePetCardShareMessage({ ...validMessage, from: 'consultant' }),
    null,
  );
  assert.equal(
    parsePetCardShareMessage({ ...validMessage, from: undefined }),
    null,
  );
});

test('rejects malformed shares and drops entries without a name', () => {
  assert.equal(
    parsePetCardShareMessage({ ...validMessage, payload: { pets: 'not-an-array' } }),
    null,
  );
  assert.equal(
    parsePetCardShareMessage({
      ...validMessage,
      payload: { pets: [{ species: 'cat' }, null, []] },
    }),
    null,
  );
});

test('bounds displayed pet count and text fields and ignores invalid weight', () => {
  const parsed = parsePetCardShareMessage({
    ...validMessage,
    payload: {
      pets: [
        {
          name: ` ${'A'.repeat(100)} `,
          weight: Number.POSITIVE_INFINITY,
          health: { allergies: '  ' + 'B'.repeat(300) },
        },
        ...Array.from({ length: 15 }, (_, index) => ({ name: `Pet ${index}` })),
      ],
    },
  });

  assert.ok(parsed);
  assert.equal(parsed.payload.pets.length, 12);
  assert.equal(parsed.payload.pets[0].name.length, 80);
  assert.equal(parsed.payload.pets[0].weight, undefined);
  assert.equal(parsed.payload.pets[0].health?.allergies?.length, 240);
});

test('uses the data-free pet-card acknowledgement event', () => {
  assert.deepEqual(PET_CARD_SHARED_ACKNOWLEDGEMENT, {
    type: 'pet-card-shared',
  });
});
