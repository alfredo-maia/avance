import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReadiness } from './readiness.mjs';

test('AC-1: evaluateReadiness com todas as etapas prontas e campos extras ignorados', () => {
  const input = { setup: true, spec: true, qa: true, extraIgnorado: 123 };
  const actual = evaluateReadiness(input);
  const expected = { ready: true, missing: [] };
  assert.deepStrictEqual(actual, expected);
});

test('AC-2: Detecção ordenada de faltantes para diferentes combinações de false', () => {
  const cases = [
    {
      input: { setup: false, spec: true, qa: false },
      expected: { ready: false, missing: ['setup', 'qa'] },
    },
    {
      input: { setup: false, spec: false, qa: false },
      expected: { ready: false, missing: ['setup', 'spec', 'qa'] },
    },
    {
      input: { setup: true, spec: false, qa: true },
      expected: { ready: false, missing: ['spec'] },
    },
    {
      input: { setup: true, spec: true, qa: false },
      expected: { ready: false, missing: ['qa'] },
    },
  ];

  for (const { input, expected } of cases) {
    const actual = evaluateReadiness(input);
    assert.deepStrictEqual(actual, expected);
  }
});

test('AC-3: Tipagem estrita e validação de contrato com TypeError', () => {
  const invalidInputs = [
    null,
    undefined,
    'not an object',
    123,
    true,
    [],
    [1, 2, 3],
    {}, // faltando todas as chaves
    { setup: true, spec: true }, // faltando qa
    { setup: true, qa: true }, // faltando spec
    { spec: true, qa: true }, // faltando setup
    { setup: 'true', spec: true, qa: true }, // setup não booleano
    { setup: true, spec: 1, qa: true }, // spec não booleano
    { setup: true, spec: true, qa: null }, // qa não booleano
    { setup: true, spec: true, qa: undefined }, // qa não booleano
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => evaluateReadiness(input),
      {
        name: 'TypeError',
      },
      `Deveria lançar TypeError para entrada: ${JSON.stringify(input)}`
    );
  }
});
