/**
 * Notification Template Enum
 * Single source of truth for all notification templates
 */
export enum NotificationTemplate {
  RESTOCK_AVAILABLE = 'RESTOCK_AVAILABLE',
  // Future templates can be added here:
  // ABANDONED_CART = 'ABANDONED_CART',
  // PRICE_DROP = 'PRICE_DROP',
  // BACK_IN_STOCK = 'BACK_IN_STOCK',
}

/**
 * Notification Input
 * Standardized input for all notification providers
 */
export interface NotificationInput {
  channel: 'EMAIL' | 'SMS';
  to: string;
  template: NotificationTemplate;
  data: Record<string, any>;
}

/**
 * Rendered Notification
 * Output from template renderer
 */
export interface RenderedNotification {
  subject?: string; // For email
  body: string; // For both email and SMS
}

