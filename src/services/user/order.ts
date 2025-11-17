import { orders } from "@/db/schema";
import { createDrizzleClient } from "@/db/client";
import { eq, and, desc, count } from "drizzle-orm";
import { debug } from "@/lib/debug";
import type { UserOrder, PaginatedOrders, OrderStatusFilter } from "@/types/user";

/**
 * Get user orders with pagination
 * @param userUuid - User's UUID
 * @param page - Page number (1-based)
 * @param limit - Items per page
 * @param statusFilter - Optional status filter
 * @param db - D1Database instance
 * @returns Promise<PaginatedOrders>
 */
export async function getUserOrdersPaginated(
  userUuid: string, 
  page: number = 1, 
  limit: number = 20,
  statusFilter: OrderStatusFilter = 'all',
  db: D1Database
): Promise<PaginatedOrders> {
  const drizzle = createDrizzleClient(db);
  const offset = (page - 1) * limit;
  
  try {
    // Build where conditions
    const whereConditions = [eq(orders.userUuid, userUuid)];
    if (statusFilter !== 'all') {
      whereConditions.push(eq(orders.orderStatus, statusFilter));
    }

    // Get total count
    const totalResult = await drizzle
      .select({ count: count() })
      .from(orders)
      .where(and(...whereConditions));
    
    const total = totalResult[0]?.count || 0;
    
    // Get paginated orders
    const ordersData = await drizzle
      .select({
        uuid: orders.uuid,
        orderNumber: orders.orderNumber,
        userUuid: orders.userUuid,
        orderAmount: orders.orderAmount,
        orderCurrency: orders.orderCurrency,
        productUuid: orders.productUuid,
        productName: orders.productName,
        productPriceSnapshot: orders.productPriceSnapshot,
        creditsAmountSnapshot: orders.creditsAmountSnapshot,
        paymentTime: orders.paymentTime,
        orderStatus: orders.orderStatus,
        paymentMethod: orders.paymentMethod,
        paymentPlatformOrderId: orders.paymentPlatformOrderId,
        subscriptionId: orders.subscriptionId,
        subscriptionCycle: orders.subscriptionCycle,
        subscriptionStartTime: orders.subscriptionStartTime,
        subscriptionEndTime: orders.subscriptionEndTime,
        refundAmount: orders.refundAmount,
        refundTime: orders.refundTime,
        remarks: orders.remarks,
        orderCreatedAt: orders.orderCreatedAt,
        orderUpdatedAt: orders.orderUpdatedAt,
      })
      .from(orders)
      .where(and(...whereConditions))
      .orderBy(desc(orders.orderCreatedAt))
      .limit(limit)
      .offset(offset);
    
    // Map database results to UserOrder interface
    const userOrders: UserOrder[] = ordersData.map(order => ({
      uuid: order.uuid,
      orderNumber: order.orderNumber,
      userUuid: order.userUuid,
      orderAmount: order.orderAmount,
      orderCurrency: order.orderCurrency,
      productUuid: order.productUuid,
      productName: order.productName,
      productPriceSnapshot: order.productPriceSnapshot,
      creditsAmountSnapshot: order.creditsAmountSnapshot,
      paymentTime: order.paymentTime ? new Date(order.paymentTime * 1000).toISOString() : undefined,
      orderStatus: order.orderStatus as UserOrder['orderStatus'],
      paymentMethod: order.paymentMethod || undefined,
      paymentPlatformOrderId: order.paymentPlatformOrderId || undefined,
      subscriptionId: order.subscriptionId || undefined,
      subscriptionCycle: order.subscriptionCycle as UserOrder['subscriptionCycle'] || undefined,
      subscriptionStartTime: order.subscriptionStartTime 
        ? new Date(order.subscriptionStartTime * 1000).toISOString() 
        : undefined,
      subscriptionEndTime: order.subscriptionEndTime 
        ? new Date(order.subscriptionEndTime * 1000).toISOString() 
        : undefined,
      refundAmount: order.refundAmount || 0,
      refundTime: order.refundTime ? new Date(order.refundTime * 1000).toISOString() : undefined,
      remarks: order.remarks || undefined,
      createdAt: new Date(order.orderCreatedAt * 1000).toISOString(),
      updatedAt: new Date(order.orderUpdatedAt * 1000).toISOString(),
    }));
    
    return {
      orders: userOrders,
      hasMore: offset + limit < total,
      total,
    };
  } catch (error) {
    debug('Error in getUserOrdersPaginated:', error);
    return {
      orders: [],
      hasMore: false,
      total: 0,
    };
  }
}

/**
 * Get single order by UUID
 * @param orderUuid - Order's UUID
 * @param userUuid - User's UUID (for permission check)
 * @param db - D1Database instance
 * @returns Promise<UserOrder | null>
 */
export async function getUserOrderByUuid(
  orderUuid: string,
  userUuid: string,
  db: D1Database
): Promise<UserOrder | null> {
  const drizzle = createDrizzleClient(db);
  
  try {
    const orderData = await drizzle
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.uuid, orderUuid),
          eq(orders.userUuid, userUuid)
        )
      )
      .limit(1);
    
    if (orderData.length === 0) {
      return null;
    }
    
    const order = orderData[0];
    
    return {
      uuid: order.uuid,
      orderNumber: order.orderNumber,
      userUuid: order.userUuid,
      orderAmount: order.orderAmount,
      orderCurrency: order.orderCurrency,
      productUuid: order.productUuid,
      productName: order.productName,
      productPriceSnapshot: order.productPriceSnapshot,
      creditsAmountSnapshot: order.creditsAmountSnapshot,
      paymentTime: order.paymentTime ? new Date(order.paymentTime * 1000).toISOString() : undefined,
      orderStatus: order.orderStatus as UserOrder['orderStatus'],
      paymentMethod: order.paymentMethod || undefined,
      paymentPlatformOrderId: order.paymentPlatformOrderId || undefined,
      subscriptionId: order.subscriptionId || undefined,
      subscriptionCycle: order.subscriptionCycle as UserOrder['subscriptionCycle'] || undefined,
      subscriptionStartTime: order.subscriptionStartTime 
        ? new Date(order.subscriptionStartTime * 1000).toISOString() 
        : undefined,
      subscriptionEndTime: order.subscriptionEndTime 
        ? new Date(order.subscriptionEndTime * 1000).toISOString() 
        : undefined,
      refundAmount: order.refundAmount || 0,
      refundTime: order.refundTime ? new Date(order.refundTime * 1000).toISOString() : undefined,
      remarks: order.remarks || undefined,
      createdAt: new Date(order.orderCreatedAt * 1000).toISOString(),
      updatedAt: new Date(order.orderUpdatedAt * 1000).toISOString(),
    };
  } catch (error) {
    debug('Error in getUserOrderByUuid:', error);
    return null;
  }
}