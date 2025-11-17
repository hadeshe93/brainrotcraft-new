import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { FeedbackPayload } from '@/types/blocks/feedback';
import { nanoid } from 'nanoid';
import Zod from 'zod/v4';
import { CF_TURNSTILE_SITEKEY } from '@/constants/config';
import { EValidationErrorCode, ECommonErrorCode } from '@/types/services/errors';
import { formDataToJSON } from '@/lib/form-data';
import { createErrorResponse } from '@/lib/api-response';
import { createFeedback } from '@/services/feedback';
import { verifyTurnstileToken } from '@/services/turnstile';

const schema = Zod.object({
  name: Zod.string(),
  email: Zod.email(),
  message: Zod.string(),
  cfTurnstileToken: Zod.string(),
});

export async function POST(request: NextRequest) {
  // 先获取 FormData 并解析出 generateType
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    const errorCode = EValidationErrorCode.FORM_DATA_PARSE_ERROR;
    return await createErrorResponse({ errorCode });
  }

  // 使用 formDataToJSON 将 FormData 转换为 JSON 对象
  let jsonData: FeedbackPayload;
  try {
    jsonData = formDataToJSON(formData, {
      autoTypeConversion: false,
      preserveArrays: false,
    }) as unknown as FeedbackPayload;
  } catch (error) {
    const errorCode = EValidationErrorCode.FORM_DATA_INVALID;
    return await createErrorResponse({ errorCode });
  }

  const headersList = await headers();
  // 整理参数
  const country = (headersList.get('cf-ipcountry') || '').toLowerCase();
  const ip = headersList.get('CF-Connecting-IP') || '';
  const { cfTurnstileToken, ...payload } = jsonData;

  // 需要 Turnstile Token
  if (!cfTurnstileToken) {
    return await createErrorResponse({ errorCode: EValidationErrorCode.TURNSTILE_TOKEN_REQUIRED });
  }

  // 入参校验
  const isQualified = checkPayload({ ...payload, cfTurnstileToken });
  if (!isQualified) {
    return await createErrorResponse({ errorCode: EValidationErrorCode.FORM_DATA_INVALID });
  }

  // CF Turnstile 验证
  const isSuccess = await verifyTurnstileToken({
    token: cfTurnstileToken,
    ip,
  });
  if (!isSuccess) {
    return await createErrorResponse({ errorCode: EValidationErrorCode.TURNSTILE_VERIFICATION_FAILED });
  }

  // 创建反馈
  const id = nanoid();
  const success = await createFeedback({
    id,
    uuid: id,
    biz: CF_TURNSTILE_SITEKEY,
    country,
    content: JSON.stringify(payload),
  });
  if (!success) {
    return await createErrorResponse({ errorCode: ECommonErrorCode.INTERNAL_SERVER_ERROR });
  }
  return Response.json({
    success,
    message: '',
  });
}

function checkPayload(payload: FeedbackPayload) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    console.error('[checkPayload] Check payload failed:', result.error);
    return false;
  }
  return true;
}
