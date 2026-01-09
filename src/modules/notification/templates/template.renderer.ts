import { NotificationTemplate, RenderedNotification } from '../types/notification.types';

/**
 * Template Renderer
 * Pure function that renders notification templates
 * 
 * No HTML yet - plain text only for MVP
 */
export class TemplateRenderer {
  /**
   * Render a notification template with data
   */
  static render(
    template: NotificationTemplate,
    data: Record<string, any>,
  ): RenderedNotification {
    switch (template) {
      case NotificationTemplate.RESTOCK_AVAILABLE:
        return this.renderRestockAvailable(data);

      default:
        throw new Error(`Unknown template: ${template}`);
    }
  }

  /**
   * Render RESTOCK_AVAILABLE template
   */
  private static renderRestockAvailable(data: Record<string, any>): RenderedNotification {
    const productName = data.productName || 'Your product';
    const recoveryUrl = data.recoveryUrl || '#';
    const customerName = data.customerName || '';

    const greeting = customerName ? `Hi ${customerName},` : 'Hi,';
    const body = `${greeting}

Good news! ${productName} is back in stock.

Buy now: ${recoveryUrl}

Thank you for your patience!`;

    return {
      subject: `Good news! ${productName} is back in stock`,
      body,
    };
  }
}

