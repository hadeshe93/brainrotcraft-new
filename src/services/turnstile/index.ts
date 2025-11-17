
// 服务端密钥
const CF_TURNSTILE_SECRET_KEY = process.env.CF_TURNSTILE_SECRET_KEY;
// CF 验证端点
const CF_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface VerifyTurnstileTokenOptions {
  token: string;
  ip: string;
}

export async function verifyTurnstileToken(options: VerifyTurnstileTokenOptions) {
  const { token, ip } = options;
  const cfFormData = new FormData();
  cfFormData.append("secret", CF_TURNSTILE_SECRET_KEY);
  cfFormData.append("response", token);
  cfFormData.append("remoteip", ip);
  const cfTurnstileValidateResponse = await fetch(CF_TURNSTILE_VERIFY_URL, {
    method: "POST",
    body: cfFormData,
  });
  const cfTurnstileValidateResponseJson = await cfTurnstileValidateResponse.json() as any;
  const isSuccess = !!cfTurnstileValidateResponseJson?.success;
  if (!isSuccess) {
    console.error('[CF Turnstile] Validate failed:', JSON.stringify(cfTurnstileValidateResponseJson));
  }
  return isSuccess;
}