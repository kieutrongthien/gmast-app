export type AnalyticsPayload = Record<string, unknown>;

export type AnalyticsHandler = (event: string, payload?: AnalyticsPayload) => Promise<void> | void;

let handler: AnalyticsHandler | null = null;

export const setAnalyticsHandler = (nextHandler: AnalyticsHandler | null): void => {
  handler = nextHandler;
};

export const emitAnalyticsEvent = async (event: string, payload?: AnalyticsPayload): Promise<void> => {
  if (!handler) {
    return;
  }
  await handler(event, payload);
};
