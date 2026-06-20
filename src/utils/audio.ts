// Cute and cheerful arcade-style sounds using native Web Audio API.
// This completely bypasses the need for external MP3 loading and works 100% offline!

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a single synthesized note
function playNote(freq: number, duration: number, type: OscillatorType = "sine", delay = 0) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (error) {
    console.warn("Audio Context blocked or not supported:", error);
  }
}

// 1. Play scan/success beep
export function playBeep() {
  playNote(880, 0.15, "triangle");
}

// 2. Play success chord (Perfect / 5 Bintang!)
export function playSuccess() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    playNote(freq, 0.45, "sine", idx * 0.08);
  });
}

// 3. Play failure slide
export function playFail() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn(err);
  }
}

// 4. Play Level Up sweeping sound
export function playLevelUp() {
  const notes = [440, 554, 659, 880, 1109, 1318]; // sweep major chord
  notes.forEach((freq, idx) => {
    playNote(freq, 0.5, "triangle", idx * 0.06);
  });
}

// 5. Play short card-swap click
export function playClick() {
  playNote(400, 0.08, "sine");
}
