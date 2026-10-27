const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_GLOBAL = 30;

const failures = new Map<string, number[]>();
const globalFailures: number[] = [];

function recent(list: number[], now: number) {
  while (list.length && now - list[0] > WINDOW_MS) list.shift();
  return list;
}

/** Seconds until another attempt is allowed, or 0 if the caller may try. */
export function retryAfter(ip: string, now = Date.now()) {
  const own = recent(failures.get(ip) ?? [], now);
  const global = recent(globalFailures, now);
  const blocked =
    own.length >= MAX_PER_IP ? own[0] : global.length >= MAX_GLOBAL ? global[0] : null;
  return blocked === null ? 0 : Math.ceil((blocked + WINDOW_MS - now) / 1000);
}

export function recordFailure(ip: string, now = Date.now()) {
  const own = recent(failures.get(ip) ?? [], now);
  own.push(now);
  failures.set(ip, own);
  globalFailures.push(now);
}

export function clearFailures(ip: string) {
  failures.delete(ip);
}
