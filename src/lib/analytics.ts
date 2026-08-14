type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, payload: AnalyticsPayload = {}) {
  window.dispatchEvent(new CustomEvent('store:analytics', { detail: { event, payload } }));
}
