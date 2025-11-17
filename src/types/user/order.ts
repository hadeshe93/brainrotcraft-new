export enum EUserOrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  Refunded = 'refunded',
  Cancelled = 'cancelled',
}
/**
 * Order interface based on database schema
 * Maps database fields to frontend-friendly structure
 */
export interface UserOrder {
  uuid: string;
  orderNumber: string;               // User-facing order ID
  userUuid: string;                  // Foreign key to users table
  orderAmount: number;               // Order total amount
  orderCurrency: string;             // Order currency type (e.g., "USD", "CNY")
  productUuid: string;               // Product identifier
  productName: string;               // Product name snapshot
  productPriceSnapshot: number;      // Price at time of order
  creditsAmountSnapshot: number;     // Credits amount at time of order
  paymentTime?: string;              // ISO string, null if not paid
  orderStatus: EUserOrderStatus;
  paymentMethod?: string;            // e.g., 'stripe', 'paypal', 'paddle'
  paymentPlatformOrderId?: string;   // External payment platform order ID
  customerId?: string;               // For subscription products only
  subscriptionId?: string;           // For subscription products only
  subscriptionCycle?: 'monthly' | 'yearly';
  subscriptionStartTime?: string;    // ISO string
  subscriptionEndTime?: string;      // ISO string
  refundAmount: number;              // Refunded amount
  refundTime?: string;               // ISO string
  remarks?: string;                  // Order notes
  createdAt: string;                 // ISO string
  updatedAt: string;                 // ISO string
}

/**
 * Paginated orders response structure
 * Consistent with existing PaginatedWorks pattern
 */
export interface PaginatedOrders {
  orders: UserOrder[];
  hasMore: boolean;
  total: number;
}

/**
 * Order status filter type for API queries
 */
export type OrderStatusFilter = UserOrder['orderStatus'] | 'all';
