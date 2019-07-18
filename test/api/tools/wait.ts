export function waitATick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

export async function until(predicate: () => boolean, max: number = 30, backoff: number = 2) {
  const err = new Error(`Waited ${max} times for the predicate to become true.`);
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      if (count < max) {
        const nextBackoff = 1 + count * backoff;
        count++;
        setTimeout(check, 10 * nextBackoff);
        if (predicate()) {
          resolve();
        }
      } else {
        reject(err);
      }
    };
    check();
  });
}
