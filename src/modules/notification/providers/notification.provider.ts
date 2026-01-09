import { NotificationInput } from '../types/notification.types';

/**
 * Notification Provider Interface
 * Single source of truth for all notification providers
 * 
 * The app never sends notifications directly.
 * It only emits notification intents through this interface.
 */
export interface NotificationProvider {
  /**
   * Send a notification
   * @param input - Standardized notification input
   */
  send(input: NotificationInput): Promise<void>;
}
