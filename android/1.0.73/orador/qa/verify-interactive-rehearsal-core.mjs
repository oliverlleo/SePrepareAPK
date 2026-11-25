import assert from 'node:assert/strict';
import { newSpeech, newPart, normalizeVersions, createContentVersion, selectContentVersion } from '../web/src/core.js';
import { rhythmValue } from '../web/src/rhythm-core.js';
import {
  canOfferInteractiveRehearsal,
  buildRehearsalPlan,
  computeProgressiveHint,
  cleanSpokenText
} from '../web/src/interactive-rehearsal-core.js';

// 1. Speech (not demonstration) should never offer interactive rehearsal
const speech = newSpeech();
assert.equal(canOfferInteractiveRehearsal(speech), false);
assert.equal(buildRehearsalPlan(speech).valid, false);
assert.equal(buildRehearsalPlan(speech).reason, 'not-part');

// 2. Classic 3-participant example from spec (João, Maria, Pedro) using IDs, even if names appear inside text
const part = newPart();
part.participants = [
  { id: 'p-joao', name: 'João' },
  { id: 'p-maria', name: 'Maria' },
  { id: 'p-pedro', name: 'Pedro' }
];
part.myParticipantId = 'p-joao';
part.delta = {
  ops: [
    { insert: 'Bom dia, Maria.\n', attributes: { speaker: 'p-joao', 'speech-time': '15' } },
    { insert: 'Bom dia, João!\n', attributes: { speaker: 'p-maria', 'presenter-note': 'note_1', 'speech-rhythm': rhythmValue({ id: 'calm', name: 'Pausado', ppm: 105 }) } },
    { insert: 'Gostaria de conversar com você, Pedro: veja isto.\n', attributes: { speaker: 'p-joao', 'speech-time-point': '30' } },
    { insert: 'Posso participar também?\n', attributes: { speaker: 'p-pedro', bold: true } }
  ]
};
part.presenterNotes = [{ id: 'note_1', text: 'Sorrir ao cumprimentar', createdAt: 1, updatedAt: 1 }];
normalizeVersions(part);

const beforeDeltaJson = JSON.stringify(part.delta);
const plan = buildRehearsalPlan(part);
assert.equal(plan.valid, true);
assert.equal(plan.turns.length, 4);
assert.deepEqual(
  plan.turns.map(t => ({ pid: t.participantId, role: t.role, text: t.spokenText })),
  [
    { pid: 'p-joao', role: 'user', text: 'Bom dia, Maria.' },
    { pid: 'p-maria', role: 'other', text: 'Bom dia, João!' },
    { pid: 'p-joao', role: 'user', text: 'Gostaria de conversar com você, Pedro: veja isto.' },
    { pid: 'p-pedro', role: 'other', text: 'Posso participar também?' }
  ]
);
// Original delta must never be mutated
assert.equal(JSON.stringify(part.delta), beforeDeltaJson);
// Private notes, speaker prefixes, and time marks are never included in spokenText
assert.equal(plan.turns[1].spokenText.includes('Sorrir'), false);
assert.equal(plan.turns[1].spokenText.includes('Maria:'), false);
assert.equal(plan.turns[0].spokenText.includes('00:15'), false);

// 3. User as intermediate and last participant
const planAsMaria = buildRehearsalPlan(part, { myParticipantId: 'p-maria' });
assert.deepEqual(planAsMaria.turns.map(t => t.isUser), [false, true, false, false]);
const planAsPedro = buildRehearsalPlan(part, { myParticipantId: 'p-pedro' });
assert.deepEqual(planAsPedro.turns.map(t => t.isUser), [false, false, false, true]);

// 4. Consecutive lines of same participant + page breaks
const paged = newPart();
paged.participants = [
  { id: 'u1', name: 'Ana' },
  { id: 'u2', name: 'Carlos' }
];
paged.myParticipantId = 'u2';
paged.delta = {
  ops: [
    { insert: 'Primeira frase da Ana.\n', attributes: { speaker: 'u1' } },
    { insert: { pagebreak: true } },
    { insert: 'Segunda frase consecutiva da Ana na outra página.\n', attributes: { speaker: 'u1' } },
    { insert: 'Resposta do Carlos.\n', attributes: { speaker: 'u2' } }
  ]
};
normalizeVersions(paged);
const pagedPlan = buildRehearsalPlan(paged);
assert.equal(pagedPlan.valid, true);
assert.equal(pagedPlan.turns.length, 2);
assert.equal(pagedPlan.turns[0].participantId, 'u1');
assert.equal(pagedPlan.turns[0].spokenText, 'Primeira frase da Ana.\n\nSegunda frase consecutiva da Ana na outra página.');
assert.deepEqual(pagedPlan.turns[0].pages, [0, 1]);
assert.deepEqual(pagedPlan.turns[1].pages, [1]);

// 5. Unassigned text detection without silent misattribution
const withUnassigned = newPart();
withUnassigned.participants = [
  { id: 'a', name: 'Lucas' },
  { id: 'b', name: 'Sara' }
];
withUnassigned.myParticipantId = 'a';
withUnassigned.delta = {
  ops: [
    { insert: 'Trecho esquecido sem participante.\n' },
    { insert: 'Fala do Lucas antes.\n', attributes: { speaker: 'a' } },
    { insert: 'Outro trecho sem dono no meio.\n' },
    { insert: 'Fala do Lucas depois da lacuna.\n', attributes: { speaker: 'a' } },
    { insert: 'Fala da Sara.\n', attributes: { speaker: 'b' } }
  ]
};
normalizeVersions(withUnassigned);
const unassignedPlan = buildRehearsalPlan(withUnassigned);
assert.equal(unassignedPlan.hasUnassigned, true);
assert.equal(unassignedPlan.unassignedSegments.length, 2);
assert.equal(unassignedPlan.warnings.includes('unassigned-segments'), true);
// The two Lucas turns separated by an unassigned gap are NOT falsely merged
assert.equal(unassignedPlan.turns.length, 3);
assert.deepEqual(unassignedPlan.turns.map(t => t.participantId), ['a', 'a', 'b']);

// 6. Active version switching
createContentVersion(part, 'Versão curta', false);
part.delta = {
  ops: [
    { insert: 'Apenas Maria inicia na versão curta.\n', attributes: { speaker: 'p-maria' } },
    { insert: 'João encerra na versão curta.\n', attributes: { speaker: 'p-joao' } }
  ]
};
const shortPlan = buildRehearsalPlan(part, { bypassCache: true });
assert.equal(shortPlan.versionName, 'Versão curta');
assert.equal(shortPlan.turns.length, 2);
assert.equal(shortPlan.turns[0].participantId, 'p-maria');
assert.equal(shortPlan.turns[1].participantId, 'p-joao');

selectContentVersion(part, part.versions[0].id);
const originalPlanAgain = buildRehearsalPlan(part);
assert.equal(originalPlanAgain.turns.length, 4);

// 7. Progressive hints (levels 0, 1, 2, 3) without mutating text
const line = ' Gostaria muito de compartilhar um pensamento animador com sua família hoje de manhã. ';
const h0 = computeProgressiveHint(line, 0);
const h1 = computeProgressiveHint(line, 1);
const h2 = computeProgressiveHint(line, 2);
const h3 = computeProgressiveHint(line, 3);
assert.equal(h0.text, '');
assert.equal(h1.complete, false);
assert.equal(h2.complete, false);
assert.equal(h3.complete, true);
assert.equal(h3.text, line.trim());
assert.ok(h1.text.length > 0 && h1.text.length < h2.text.length);
assert.ok(h2.text.length < h3.text.length);

// Short 1-word and 2-word turns
assert.equal(computeProgressiveHint('Sim!', 3).text, 'Sim!');
assert.equal(computeProgressiveHint('Bom dia!', 1).text, 'Bom…');
assert.equal(computeProgressiveHint('Bom dia!', 2).complete, true);
assert.equal(cleanSpokenText({ ops: [{ insert: 'Olá ' }, { insert: { pagebreak: true } }, { insert: 'mundo\n' }] }), 'Olá\nmundo');

console.log('OK: interactive-rehearsal-core passed all unit checks.');
