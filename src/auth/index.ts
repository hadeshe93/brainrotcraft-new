import NextAuth, { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { User, GoogleOneTapLoginPayload, EUserType } from '@/types/user';
import { Provider } from 'next-auth/providers/index';
import { debug } from '@/lib/debug';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_ENABLED, AUTH_GOOGLE_ONE_TAP_ENABLED, AUTH_GITHUB_ENABLED } from '@/constants/config';
import { upsertUser } from '@/services/user/profile';
import { getCloudflareEnv } from '@/services/base';
import { checkUsePaidRecords } from '@/services/user/subscription';

export const { handlers, auth, signIn, signOut } = await getNextAuthHandler();

async function getNextAuthHandler() {
  const nextAuthConfig = await buildNextAuthConfig();
  return NextAuth(nextAuthConfig);
}

// 动态构建 nextAuthConfig 的函数，用于 Cloudflare Worker 环境
async function buildNextAuthConfig(): Promise<NextAuthConfig> {
  const env = await getCloudflareEnv();
  const envVars = getEnvVars(env);
  const providers: Provider[] = [];

  // 谷歌一键登录
  if (AUTH_GOOGLE_ONE_TAP_ENABLED && AUTH_GOOGLE_ID && envVars.AUTH_GOOGLE_SECRET) {
    providers.push(
      Credentials({
        id: 'google-one-tap',
        name: 'google-one-tap',
        credentials: {},
        // @ts-ignore
        authorize: async (credentials: any) => {
          debug('credentials: %o', credentials);
          // Here you can add your own logic to find the user from the database
          // and return the user object
          const userRaw = JSON.parse(credentials?.payload || 'undefined') as GoogleOneTapLoginPayload | undefined;
          if (userRaw) {
            const user: User = {
              email: userRaw.email,
              nickname: userRaw.name,
              avatar: userRaw.picture,
              account_provider: 'google',
              provider_account_id: userRaw.sub,
            };
            return user;
          } else {
            return null;
          }
        },
      }),
    );
  }

  // 谷歌登录
  if (AUTH_GOOGLE_ENABLED && AUTH_GOOGLE_ID && envVars.AUTH_GOOGLE_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: AUTH_GOOGLE_ID,
        clientSecret: envVars.AUTH_GOOGLE_SECRET,
      }),
    );
  }

  // Github 登录
  if (AUTH_GITHUB_ENABLED && envVars.AUTH_GITHUB_ID && envVars.AUTH_GITHUB_SECRET) {
    providers.push(
      GithubProvider({
        clientId: envVars.AUTH_GITHUB_ID,
        clientSecret: envVars.AUTH_GITHUB_SECRET,
      }),
    );
  }
  const nextAuthConfig: NextAuthConfig = {
    secret: envVars.NEXT_AUTH_SECRET,
    trustHost: true,
    providers,
    callbacks: {
      async redirect({ url, baseUrl }) {
        // debug('redirect: %o', { url, baseUrl });
        
        // Allows relative callback URLs
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allows callback URLs on the same origin
        else if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      },
      async session({ session, token }) {
        // debug('session: %o', { session, token });
        if (token && token.user) {
          const user = token.user as User;
          const { hasEffectiveSubscription, hasOneTimePayment } = await checkUsePaidRecords(user.uuid);
          const hasPaid = hasEffectiveSubscription || hasOneTimePayment;
          user.userType = hasPaid ? EUserType.PAID : EUserType.FREE;
          // @ts-ignore
          session.user = user;
        }
        return session;
      },
      async jwt({ token, user, account }) {
        // debug('jwt: %o', { token, user, account });
        // Persist the OAuth access_token and or the user id to the token right after signin
        try {
          if (user && user.email && account) {
            const dbUser: User = {
              email: user.email,
              nickname: user.name || "",
              avatar: user.image || "",
              account_provider: account.provider,
              provider_account_id: account.providerAccountId,
            };
  
            try {
              const savedUser = await upsertUser(dbUser, env.DB!);
  
              token.user = {
                uuid: savedUser.uuid,
                email: savedUser.email,
                nickname: savedUser.nickname,
                avatar: savedUser.avatar,
                created_at: savedUser.created_at,
              };
            } catch (e) {
              console.error("save user failed:", e);
            }
          }
          return token;
        } catch (e) {
          console.error("jwt callback error:", e);
          return token;
        }
      },
    },
  };
  return {
    ...nextAuthConfig,
    providers,
  };
}

// 在 Cloudflare Worker 环境中获取环境变量的辅助函数
function getEnvVars(env: CloudflareEnv) {
  try {
    // 在 Cloudflare Worker 环境中，优先使用 getCloudflareContext
    return {
      AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: env.AUTH_GOOGLE_SECRET,
      // AUTH_GITHUB_ID: env.AUTH_GITHUB_ID,
      // AUTH_GITHUB_SECRET: env.AUTH_GITHUB_SECRET,
      NEXT_AUTH_SECRET: env.NEXT_AUTH_SECRET,
    };
  } catch (error) {
    // 在开发环境或非 Cloudflare 环境中，回退到 process.env
    debug('Failed to get Cloudflare context, falling back to process.env:', error);
    return {
      AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
      AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
      AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
      NEXT_AUTH_SECRET: process.env.NEXT_AUTH_SECRET,
    };
  }
}