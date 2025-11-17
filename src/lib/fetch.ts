import { APIResponse } from "@/types/services/response";
import { ECommonErrorCode } from "@/types/services/errors";

export async function fetchService<TData extends Record<string, any> = any>(url: string, options: RequestInit): Promise<APIResponse<TData>> {
  const response = await fetch(url, options);
  if (response.status === 200) {
    return await response.json();
  } else {
    return {
      success: false as const,
      message: '',
      errorCode: ECommonErrorCode.NETWORK_ERROR,
      status: response.status,
    };
  }
}
