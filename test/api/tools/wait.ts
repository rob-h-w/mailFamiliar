import {SinonFakeTimers} from 'sinon';

export function waitATick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

export async function until(
  predicate: () => boolean,
  clock?: SinonFakeTimers,
  max: number = 30,
  backoff: number = 2
) {
  const err = new Error(`Waited ${max} times for the predicate to become true.`);
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      if (count < max) {
        const nextBackoff = (1 + count) * backoff;
        count++;
        setTimeout(check, nextBackoff);
        if (predicate()) {
          resolve();
        }
        if (clock) {
          clock.tick(nextBackoff);
        }
      } else {
        reject(err);
      }
    };
    check();
  });
}
