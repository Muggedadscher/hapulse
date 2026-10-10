/**
 * [fork] The demo's service calls, for the lab checks (docs/glas/PLAN-ETAPPE-5.md, Pool).
 *
 * The demo applies only the calls it knows (lights, covers, locks, …); the others (`input_select`, `input_number`,
 * `scheduler`, `button`) change nothing, so a check reads here what a control has sent: `callService` records every
 * call in demo mode, `window.__hapulseDemo.calls()` returns them (demoControl.ts). The newest 100 are kept. Outside
 * demo mode nothing is recorded.
 */

export interface DemoCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  target: { entity_id?: string | string[] };
  /** Wall clock of the call (ms). */
  at: number;
}

const MAX_CALLS = 100;
const log: DemoCall[] = [];

export function recordDemoCall(
  domain: string,
  service: string,
  data: Record<string, unknown> | undefined,
  target: { entity_id?: string | string[] } | undefined,
): void {
  // a copy: the caller may change its objects afterwards (they are plain JSON, they go over the socket in live mode)
  const copy = (v: object | undefined) => JSON.parse(JSON.stringify(v ?? {})) as Record<string, unknown>;
  log.push({ domain, service, data: copy(data), target: copy(target), at: Date.now() });
  if (log.length > MAX_CALLS) log.splice(0, log.length - MAX_CALLS);
}

export function demoCalls(): DemoCall[] {
  return log.map((c) => ({ ...c }));
}

export function clearDemoCalls(): void {
  log.length = 0;
}
