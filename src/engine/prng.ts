// xoshiro128+ implementation (32-bit)
import { Seed } from "./types";

function rotl(x: number, k: number) {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export function validateSeed(seed: Seed) {
  if (!/^[0-9a-fA-F]{32}$/.test(seed)) {
    throw new Error("Invalid seed format: expect 32 hex chars");
  }
}

export function seedToState(seed: Seed): [number, number, number, number] {
  validateSeed(seed);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(seed.substr(i * 2, 2), 16);
  }
  const dv = new DataView(bytes.buffer);
  const s0 = dv.getUint32(0, true);
  const s1 = dv.getUint32(4, true);
  const s2 = dv.getUint32(8, true);
  const s3 = dv.getUint32(12, true);
  return [s0 >>> 0, s1 >>> 0, s2 >>> 0, s3 >>> 0];
}

export function xoshiro128plus(stateIn: [number, number, number, number]) {
  // clone state so caller can reuse initial seed state
  const state: [number, number, number, number] = [...stateIn];
  function nextUint32(): number {
    const result = (state[0] + state[3]) >>> 0;
    const t = (state[1] << 9) >>> 0;

    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];

    state[2] ^= t;
    state[3] = rotl(state[3], 11) >>> 0;

    return result >>> 0;
  }

  return {
    nextUint32,
    nextFloat() {
      // 32-bit int -> [0,1)
      return nextUint32() / 0x100000000;
    },
    nextInt(n: number) {
      return Math.floor(this.nextFloat() * n);
    },
    shuffle<T>(arr: T[]) {
      // Fisher-Yates
      for (let i = arr.length - 1; i > 0; i--) {
        const j = this.nextInt(i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    },
  };
}
