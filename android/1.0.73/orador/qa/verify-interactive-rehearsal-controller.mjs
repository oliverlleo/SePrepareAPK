import assert from 'node:assert/strict';
import { newPart, normalizeVersions } from '../web/src/core.js';
import { createRehearsalAudio } from '../web/src/interactive-rehearsal-audio.js';
import { createRehearsalVad } from '../web/src/interactive-rehearsal-vad.js';
import { createRehearsalController } from '../web/src/interactive-rehearsal-controller.js';

function makeThreeSpeakerPart(myId = 'p1') {
  const part = newPart();
  part.id = 'part-test-1';
  part.title = 'Demonstração de visita';
  part.participants = [
    { id: 'p1', name: 'João' },
    { id: 'p2', name: 'Maria' },
    { id: 'p3', name: 'Pedro' }
  ];
  part.myParticipantId = myId;
  part.delta = {
    ops: [
      { insert: 'Bom dia, Maria.\n', attributes: { speaker: 'p1' } },
      { insert: 'Bom dia, João!\n', attributes: { speaker: 'p2' } },
      { insert: 'Posso participar também?\n', attributes: { speaker: 'p3' } },
      { insert: 'Claro, Pedro, fique à vontade para participar conosco hoje.\n', attributes: { speaker: 'p1' } }
    ]
  };
  normalizeVersions(part);
  return part;
}

function createFakePlayer(voices = [
  { name: 'Voz-A', locale: 'pt-BR', offline: true, default: true, label: 'Português · Voz A' },
  { name: 'Voz-B', locale: 'pt-BR', offline: true, default: false, label: 'Português · Voz B' }
]) {
  const calls = [];
  let current = null;
  let interruptHandler = null;
  let seq = 0;

  return {
    calls,
    get current() { return current; },
    getAvailableVoices(locale) {
      return { status: 'ready', locale, voices, allVoices: voices };
    },
    setExternalInterruptHandler(fn) {
      interruptHandler = fn;
    },
    triggerExternalAudio() {
      current = null;
      interruptHandler?.('ouvir');
    },
    speakSegment(opts) {
      const reqId = `seg-${++seq}`;
      current = { reqId, ...opts };
      calls.push(current);
      opts.onStart?.();
      return reqId;
    },
    cancelSegment(reqId) {
      if (current && (!reqId || current.reqId === reqId)) {
        current.cancelled = true;
        current = null;
      }
    },
    finishCurrent() {
      const c = current;
      current = null;
      c?.onEnd?.();
    },
    blockCurrent(code = 'not-allowed') {
      const c = current;
      current = null;
      c?.onError?.({ code, message: 'Bloqueado pelo Safari.' });
    }
  };
}

// --- Test 1: Manual mode never touches microphone, handles consecutive other turns, hints, repeat, back, pause/resume ---
{
  let micTouched = false;
  const fakeVad = {
    ensureSession: async () => { micTouched = true; return { ok: true }; },
    startListeningTurn: async () => { micTouched = true; return { started: true }; },
    stopListening() {},
    release() {}
  };
  const fakePlayer = createFakePlayer();
  const audio = createRehearsalAudio({ player: fakePlayer, getSettings: () => ({ language: 'pt-BR', rate: 1 }) });

  // Automatic distinct voice distribution for p2 & p3 + safe fallback for unknown voice
  const resolved = audio.resolveParticipantVoices([
    { id: 'p1', name: 'João' },
    { id: 'p2', name: 'Maria' },
    { id: 'p3', name: 'Pedro' }
  ], 'part-test-1');
  assert.equal(resolved.assignments.get('p2').voice, 'Voz-B');
  assert.equal(resolved.assignments.get('p3').voice, 'Voz-A');

  audio.setParticipantVoice('part-test-1', 'p2', { voice: 'Voz-Inexistente-Windows', locale: 'pt-BR', rate: 1.2 });
  const fallbackResolved = audio.resolveParticipantVoices([
    { id: 'p1', name: 'João' },
    { id: 'p2', name: 'Maria' }
  ], 'part-test-1');
  assert.equal(fallbackResolved.assignments.get('p2').fallbackUsed, true);
  assert.equal(fallbackResolved.assignments.get('p2').voice, 'Voz-B');
  assert.equal(fallbackResolved.assignments.get('p2').rate, 1.2);

  let timerRunning = false;
  const part = makeThreeSpeakerPart('p1');
  const controller = createRehearsalController({
    audio,
    vad: fakeVad,
    timer: {
      ensureRunning: () => { timerRunning = true; },
      pauseIfRunning: () => { timerRunning = false; }
    }
  });

  await controller.start({ speech: part, mode: 'manual', hideMyLines: true, showHints: true });
  assert.equal(micTouched, false, 'Manual mode must NEVER request microphone');
  assert.equal(timerRunning, true);
  // Turn 0 belongs to p1 (user) -> stops immediately at waiting-user
  assert.equal(controller.getSnapshot().state, 'waiting-user');
  assert.equal(controller.getSnapshot().currentTurnIndex, 0);

  // Progressive hints on user turn
  const hint1 = controller.revealHint();
  assert.equal(hint1.level, 1);
  assert.equal(hint1.complete, false);
  const hint2 = controller.revealHint();
  assert.equal(hint2.level, 2);
  const hint3 = controller.revealHint();
  assert.equal(hint3.level, 3);
  assert.equal(hint3.complete, true);

  // Complete user turn 0 -> Turn 1 (Maria) narrates, then Turn 2 (Pedro) narrates consecutively, stopping at Turn 3 (João)
  const staleCallbackCapture = [];
  controller.finishUserTurn();
  assert.equal(controller.getSnapshot().state, 'narrating');
  assert.equal(controller.getSnapshot().currentTurnIndex, 1);
  assert.equal(fakePlayer.calls.at(-1).text, 'Bom dia, João!');

  // Test stale callback protection: grab old segment callback, cancel via pause, fire old onEnd -> must NOT advance!
  const oldOnEnd = fakePlayer.current.onEnd;
  controller.pause();
  assert.equal(controller.getSnapshot().state, 'paused');
  assert.equal(timerRunning, false);
  oldOnEnd(); // Stale TTS callback!
  assert.equal(controller.getSnapshot().currentTurnIndex, 1, 'Stale TTS callback must never advance turn');
  assert.equal(controller.getSnapshot().state, 'paused');

  // Resume Turn 1 -> finish Turn 1 -> automatically starts Turn 2 (Pedro) -> finish Turn 2 -> stops at Turn 3 (user)
  await controller.resume();
  assert.equal(controller.getSnapshot().state, 'narrating');
  assert.equal(controller.getSnapshot().currentTurnIndex, 1);
  fakePlayer.finishCurrent(); // Maria finishes
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().state, 'narrating');
  assert.equal(controller.getSnapshot().currentTurnIndex, 2, 'Consecutive other participant turn starts automatically');
  assert.equal(fakePlayer.calls.at(-1).text, 'Posso participar também?');

  // OS blocked playback simulation on Turn 2 (e.g., iOS Safari async speak block)
  fakePlayer.blockCurrent('not-allowed');
  assert.equal(controller.getSnapshot().state, 'paused');
  assert.equal(controller.getSnapshot().blockedPlayback.code, 'not-allowed');
  assert.equal(controller.getSnapshot().currentTurnIndex, 2, 'Turn preserved when OS blocks TTS');

  // Explicit user tap resume replays Turn 2 cleanly
  await controller.resume();
  assert.equal(controller.getSnapshot().state, 'narrating');
  assert.equal(controller.getSnapshot().blockedPlayback, null);
  fakePlayer.finishCurrent(); // Pedro finishes
  await new Promise(r => setTimeout(r, 0));

  // Now at Turn 3 (João - user)
  assert.equal(controller.getSnapshot().state, 'waiting-user');
  assert.equal(controller.getSnapshot().currentTurnIndex, 3);

  // Repeat last turn while on user's turn -> replays Pedro (Turn 2) and lands back on João (Turn 3)!
  controller.repeatLastTurn();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().currentTurnIndex, 2);
  fakePlayer.finishCurrent();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().currentTurnIndex, 3);
  assert.equal(controller.getSnapshot().state, 'waiting-user');

  // Finish final turn -> completed
  controller.finishUserTurn();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().state, 'completed');
  assert.equal(timerRunning, false);

  // Mutual exclusion: external "Ouvir" interrupts active rehearsal
  await controller.start({ speech: makeThreeSpeakerPart('p3'), mode: 'manual' });
  assert.equal(controller.getSnapshot().state, 'narrating');
  fakePlayer.triggerExternalAudio();
  assert.equal(controller.getSnapshot().state, 'paused');
  controller.stop();
  assert.equal(controller.getSnapshot().state, 'idle');
}

// --- Test 2: Automatic VAD mode (calibration, waiting before speech, isolated noise spike, short pause, completion silence, stream loss & permission denial fallback) ---
{
  let fakeNow = 1000;
  let currentAmplitude = 0.004; // quiet ambient floor
  let intervalCb = null;
  let trackStopped = false;
  let ctxClosed = false;
  let endedListener = null;

  const fakeTrack = {
    enabled: true,
    readyState: 'live',
    stop() { trackStopped = true; this.readyState = 'ended'; },
    addEventListener(ev, fn) { if (ev === 'ended') endedListener = fn; },
    removeEventListener(ev, fn) { if (ev === 'ended' && endedListener === fn) endedListener = null; }
  };

  const vad = createRehearsalVad({
    now: () => fakeNow,
    setIntervalFn: fn => { intervalCb = fn; return 99; },
    clearIntervalFn: () => { intervalCb = null; },
    mediaDevices: {
      async getUserMedia() {
        trackStopped = false;
        fakeTrack.readyState = 'live';
        return {
          getAudioTracks: () => [fakeTrack],
          getTracks: () => [fakeTrack]
        };
      }
    },
    AudioContextClass: class {
      constructor() { this.state = 'running'; ctxClosed = false; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() {
        return {
          fftSize: 256,
          smoothingTimeConstant: 0.25,
          disconnect() {},
          getFloatTimeDomainData(buf) { buf.fill(currentAmplitude); }
        };
      }
      async close() { this.state = 'closed'; ctxClosed = true; }
    }
  });

  const advanceMs = (ms, amp) => {
    currentAmplitude = amp;
    const steps = Math.round(ms / 60);
    for (let i = 0; i < steps; i += 1) {
      fakeNow += 60;
      intervalCb?.();
    }
  };

  const fakePlayer = createFakePlayer();
  const audio = createRehearsalAudio({ player: fakePlayer, getSettings: () => ({ language: 'pt-BR', rate: 1 }) });
  const notices = [];
  const controller = createRehearsalController({
    audio,
    vad,
    onNotice: msg => notices.push(msg)
  });

  const part = makeThreeSpeakerPart('p1');
  await controller.start({ speech: part, mode: 'auto', silenceSeconds: 3 });
  assert.equal(controller.getSnapshot().state, 'listening');
  assert.equal(controller.getSnapshot().currentTurnIndex, 0);

  // 2a. User stays silent thinking for 8 full seconds BEFORE speaking -> MUST NOT ADVANCE!
  advanceMs(8000, 0.005);
  assert.equal(controller.getSnapshot().currentTurnIndex, 0, 'Must NEVER auto-advance before user starts speaking');
  assert.equal(controller.getSnapshot().state, 'listening');

  // 2b. Isolated loud noise spike (120ms < 240ms onset confirmation) followed by 5s silence -> MUST NOT ADVANCE!
  advanceMs(120, 0.15);
  advanceMs(5000, 0.005);
  assert.equal(controller.getSnapshot().currentTurnIndex, 0, 'Isolated noise spike must not count as speech onset');

  // 2c. User speaks clearly for 600ms, pauses briefly for 1200ms (< 3000ms), speaks again for 480ms -> MUST NOT ADVANCE!
  advanceMs(600, 0.09);
  assert.equal(controller.getSnapshot().vadStatus.hasStartedSpeaking, true);
  advanceMs(1200, 0.004);
  assert.equal(controller.getSnapshot().currentTurnIndex, 0, 'Short mid-speech pause must not end turn');
  advanceMs(480, 0.08);
  // Even another 2000ms silence (< 3000ms because counter reset!) must not end turn yet
  advanceMs(2000, 0.004);
  assert.equal(controller.getSnapshot().currentTurnIndex, 0, 'Silence counter must reset after resuming speech');

  // 2d. Remaining 1100ms of continuous silence reaches 3000ms -> advances automatically to Turn 1 (Maria)!
  advanceMs(1140, 0.004);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().currentTurnIndex, 1, 'Advances after confirmed speech + 3s silence');
  assert.equal(controller.getSnapshot().state, 'narrating');
  assert.equal(fakeTrack.enabled, false, 'Mic track muted during TTS narration');

  // Maria & Pedro finish -> back to user on Turn 3 in listening state
  fakePlayer.finishCurrent();
  await new Promise(r => setTimeout(r, 0));
  fakePlayer.finishCurrent();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().currentTurnIndex, 3);
  assert.equal(controller.getSnapshot().state, 'listening');

  // 2e. Mid-turn microphone disconnect (stream track 'ended') -> immediate fallback to Manual preserving Turn 3!
  endedListener?.();
  assert.equal(controller.getSnapshot().mode, 'manual');
  assert.equal(controller.getSnapshot().state, 'waiting-user');
  assert.equal(controller.getSnapshot().currentTurnIndex, 3, 'Exact turn preserved on mic loss');
  assert.equal(trackStopped, true);
  assert.equal(ctxClosed, true);
  assert.ok(notices.length >= 1);

  controller.stop();
}

// --- Test 3: Permission denied at start -> immediate graceful fallback to Manual at Turn 0 ---
{
  const deniedVad = createRehearsalVad({
    mediaDevices: {
      async getUserMedia() {
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      }
    },
    AudioContextClass: class {}
  });
  const fakePlayer = createFakePlayer();
  const audio = createRehearsalAudio({ player: fakePlayer, getSettings: () => ({ language: 'pt-BR', rate: 1 }) });
  let fallbackMsg = '';
  const controller = createRehearsalController({
    audio,
    vad: deniedVad,
    onNotice: m => { fallbackMsg = m; }
  });
  const res = await controller.start({ speech: makeThreeSpeakerPart('p1'), mode: 'auto' });
  assert.equal(res.ok, true);
  assert.equal(res.mode, 'manual');
  assert.equal(controller.getSnapshot().state, 'waiting-user');
  assert.equal(controller.getSnapshot().currentTurnIndex, 0);
  assert.ok(fallbackMsg.includes('Manual'));
  controller.stop();
}

// --- Test 4: Native Android OradorNative bridge (permission granted & runtime request + probe + RMS speech/silence + stop during TTS) ---
{
  let fakeNow = 5000;
  let intervalCb = null;
  let nativePermGranted = false;
  let nativeMicRunning = false;
  let currentRms = 0.003;
  const listeners = new Map();
  const fakeEventTarget = {
    addEventListener(ev, fn) { listeners.set(ev, fn); },
    removeEventListener(ev, fn) { if (listeners.get(ev) === fn) listeners.delete(ev); }
  };
  const fakeOradorNative = {
    hasMicPermission: () => nativePermGranted,
    requestMicPermission() {
      nativePermGranted = true;
      listeners.get('nativeMicPermission')?.({ detail: { granted: true } });
    },
    probeMicMonitor: () => JSON.stringify({ ok: nativePermGranted, code: nativePermGranted ? 'ok' : 'permission-denied' }),
    startMicMonitor: () => {
      nativeMicRunning = true;
      return JSON.stringify({ ok: true, code: 'ok' });
    },
    pollMicMonitor: () => JSON.stringify(nativeMicRunning ? { ok: true, rms: currentRms } : { ok: false, code: 'stopped' }),
    stopMicMonitor() { nativeMicRunning = false; }
  };

  const nativeVad = createRehearsalVad({
    nativeBridge: fakeOradorNative,
    eventTarget: fakeEventTarget,
    now: () => fakeNow,
    setIntervalFn: fn => { intervalCb = fn; return 77; },
    clearIntervalFn: () => { intervalCb = null; }
  });
  const advanceMs = (ms, amp) => {
    currentRms = amp;
    for (let i = 0; i < Math.round(ms / 60); i += 1) {
      fakeNow += 60;
      intervalCb?.();
    }
  };
  const fakePlayer = createFakePlayer();
  const audio = createRehearsalAudio({ player: fakePlayer, getSettings: () => ({ language: 'pt-BR', rate: 1 }) });
  const controller = createRehearsalController({ audio, vad: nativeVad });

  const startRes = await controller.start({ speech: makeThreeSpeakerPart('p1'), mode: 'auto', silenceSeconds: 2 });
  assert.equal(startRes.mode, 'auto', 'Android native mic stays in auto mode when permission granted');
  assert.equal(controller.getSnapshot().state, 'listening');
  assert.equal(nativeMicRunning, true, 'Native AudioRecord active on user turn');

  advanceMs(480, 0.08);
  advanceMs(2100, 0.003);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().currentTurnIndex, 1, 'Native RMS advances turn after speech + 2s silence');
  assert.equal(controller.getSnapshot().state, 'narrating');
  assert.equal(nativeMicRunning, false, 'Native AudioRecord released completely during TTS turn');
  controller.stop();
}

// --- Test 5: Browser getUserMedia NotReadableError on DSP constraints succeeds via { audio: true } fallback + survives idle track interruption during TTS ---
{
  let fakeNow = 9000;
  let intervalCb = null;
  let currentAmplitude = 0.004;
  let gumCalls = [];
  let activeFakeTrack = null;
  const fallbackVad = createRehearsalVad({
    now: () => fakeNow,
    setIntervalFn: fn => { intervalCb = fn; return 88; },
    clearIntervalFn: () => { intervalCb = null; },
    setTimeoutFn: fn => { fn(); return 1; },
    clearTimeoutFn: () => {},
    mediaDevices: {
      async getUserMedia(constraints) {
        gumCalls.push(constraints);
        if (typeof constraints?.audio === 'object') {
          const err = new Error('Could not start audio source');
          err.name = 'NotReadableError';
          throw err;
        }
        let endedCb = null;
        activeFakeTrack = {
          enabled: true,
          readyState: 'live',
          stop() { this.readyState = 'ended'; },
          addEventListener(ev, fn) { if (ev === 'ended') endedCb = fn; },
          removeEventListener(ev, fn) { if (ev === 'ended' && endedCb === fn) endedCb = null; },
          triggerEnded() { this.readyState = 'ended'; endedCb?.(); }
        };
        return { getAudioTracks: () => [activeFakeTrack], getTracks: () => [activeFakeTrack] };
      }
    },
    AudioContextClass: class {
      constructor() { this.state = 'suspended'; this.destination = {}; }
      async resume() { this.state = 'running'; }
      createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
      createAnalyser() { return { fftSize: 256, smoothingTimeConstant: 0.25, connect() {}, disconnect() {}, getFloatTimeDomainData(buf) { buf.fill(currentAmplitude); } }; }
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      async close() { this.state = 'closed'; }
    }
  });
  const advanceMs = (ms, amp) => {
    currentAmplitude = amp;
    for (let i = 0; i < Math.round(ms / 60); i += 1) { fakeNow += 60; intervalCb?.(); }
  };
  const fakePlayer = createFakePlayer();
  const audio = createRehearsalAudio({ player: fakePlayer, getSettings: () => ({ language: 'pt-BR', rate: 1 }) });
  const controller = createRehearsalController({ audio, vad: fallbackVad });

  // Start where p2 (Maria) is user -> Turn 0 is João (narrating), Turn 1 is Maria (user listening)
  const startRes = await controller.start({ speech: makeThreeSpeakerPart('p2'), mode: 'auto', silenceSeconds: 2 });
  assert.equal(startRes.mode, 'auto', 'Recovered from NotReadableError via { audio: true } fallback');
  assert.equal(gumCalls.length, 2, 'Retried with plain { audio: true } after processed constraint failure');
  assert.equal(controller.getSnapshot().state, 'narrating');

  // Simulate iOS AVAudioSession killing idle mic track during João's TTS narration
  activeFakeTrack.triggerEnded();
  assert.equal(controller.getSnapshot().mode, 'auto', 'Idle track interruption during TTS must NOT drop to Manual');

  // João finishes -> Maria's turn starts and seamlessly re-acquires mic!
  fakePlayer.finishCurrent();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(controller.getSnapshot().mode, 'auto');
  assert.equal(controller.getSnapshot().state, 'listening');
  advanceMs(480, 0.09);
  advanceMs(2100, 0.004);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(controller.getSnapshot().currentTurnIndex, 2);
  controller.stop();
}

console.log('OK: interactive-rehearsal-audio, vad, and controller passed all unit & state-machine checks.');
