const reviewPrefix = "academy-review:";

/** Sign-out clears drafts only from this application's current browser tab. */
export function clearLocalReviewDrafts(storage: Storage): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(reviewPrefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}
