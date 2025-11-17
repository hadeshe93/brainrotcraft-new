/**
 * 获取反馈列表
 * - https://brainrotcraft.app/api/admin/feedback/list?token=FrXA-YGL-CUbNLwCk2GykkAlzOD6KCJA5vSN
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIErrors } from '@/lib/api-response';
import { EValidationErrorCode } from '@/types/services/errors';
import { getFeedbackList } from '@/services/feedback';

const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || '';
  if (token !== ADMIN_API_TOKEN) {
    return await APIErrors.unauthorized(EValidationErrorCode.INVALID_PARAMETER);
  }

  const list = await getFeedbackList();
  return NextResponse.json({
    success: true,
    data: list,
  });
}
