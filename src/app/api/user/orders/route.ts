import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareEnv } from '@/services/base';
import { getUserOrdersPaginated } from '@/services/user/order';
import { EUserOrderStatus, OrderStatusFilter } from '@/types/user';
import { APIErrors } from '@/lib/api-response';
import { ECommonErrorCode, EValidationErrorCode } from '@/types/services/errors';
import { auth } from '@/auth';

/**
 * GET /api/user/orders
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * - status: Order status filter ('all' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled')
 * - sort: Sort order (default: 'desc') - currently only supports 'desc' by creation time
 *
 * Returns paginated list of user orders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Authentication and authorization check
    const session = await auth();
    const isAuthenticated = !!session?.user;

    if (!isAuthenticated) {
      return await APIErrors.forbidden(ECommonErrorCode.USER_NOT_AUTHENTICATED);
    }
    const userId = session.user.uuid!;

    // Parse and validate query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items per page
    const statusParam = searchParams.get('status') || 'all';

    // Validate page and limit
    if (page < 1 || limit < 1) {
      return await APIErrors.badRequest(EValidationErrorCode.INVALID_PARAMETER);
    }

    // Validate status filter
    const validStatuses: OrderStatusFilter[] = [
      'all',
      EUserOrderStatus.Pending,
      EUserOrderStatus.Paid,
      EUserOrderStatus.Failed,
      EUserOrderStatus.Refunded,
      EUserOrderStatus.Cancelled,
    ];
    const statusFilter: OrderStatusFilter = validStatuses.includes(statusParam as OrderStatusFilter)
      ? (statusParam as OrderStatusFilter)
      : 'all';

    // Get Cloudflare context and database connection
    const env = await getCloudflareEnv();
    const db = env.DB;

    if (!db) {
      return await APIErrors.internalError(ECommonErrorCode.CONFIG_ERROR);
    }

    // Fetch user orders with pagination and filtering
    const ordersData = await getUserOrdersPaginated(userId, page, limit, statusFilter, db);

    // Return standardized response
    return NextResponse.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders: ordersData.orders,
        pagination: {
          page,
          limit,
          total: ordersData.total,
          hasMore: ordersData.hasMore,
          totalPages: Math.ceil(ordersData.total / limit),
        },
        filters: {
          status: statusFilter,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return await APIErrors.internalError(ECommonErrorCode.INTERNAL_SERVER_ERROR);
  }
}
