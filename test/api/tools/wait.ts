export function waitATick() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

export async function until(predicate: () => boolean, max: number = 14, backoff: number = 2) {
  const err = new Error(`Waited ${max} times for the predicate to become true.`);
  let currentBackoff = 1;
  return new Promise((resolve, reject) => {
    let count = 1;
    const check = () => {
      if (count < max) {
        currentBackoff *= backoff;
        count++;
        setTimeout(check, currentBackoff);
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
