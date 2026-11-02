import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOctaveFollowUpPrompt } from '../../src/application/buildOctaveFollowUpPrompt.ts';

test('construit une réaction d’Octave centrée sur la réponse de Rico, sans relancer une réponse générale', () => {
  const prompt = buildOctaveFollowUpPrompt(
    'Décris-moi ma cartographie',
    'La carte contient 4 domaines et 12 capacités. Le domaine Finance est particulièrement détaillé.'
  );

  assert.match(prompt, /réagir à SA réponse/);
  assert.match(prompt, /La carte contient 4 domaines et 12 capacités/);
  assert.match(prompt, /approfondir, les nuancer/);
  assert.match(prompt, /Ne refais surtout pas une description générale/);
  assert.match(prompt, /deux apports complémentaires au maximum/);
  assert.match(prompt, /Décris-moi ma cartographie/);
});

test('reste explicite lorsque Rico ne fournit pas de réponse exploitable', () => {
  const prompt = buildOctaveFollowUpPrompt('Question initiale', '');

  assert.match(prompt, /Rico n’a pas fourni de réponse exploitable/);
});
