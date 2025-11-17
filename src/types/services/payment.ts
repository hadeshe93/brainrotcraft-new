export type PortalSessionRequest = {
  // 三选一
  // 优先级： customerId > subscriptionId > sessionId
  sessionId?: string;
  customerId?: string;
  subscriptionId?: string;
};