import { AutoRouter, StatusError, IttyRouterOptions, IRequest } from 'itty-router';
import { NextRequest } from 'next/server';

type IttyRequest = IRequest & NextRequest;
type IttyRouterHandlerArgs = [IttyRequest];
type IttyRouterHandler = (...args: IttyRouterHandlerArgs) => any | Promise<any>;

export function createAutoRouter(options?: IttyRouterOptions) {
	const router = AutoRouter({
		missing() {
			return new Response('Not found', { status: 404 });
		},
		catch(err: Error) {
			console.error('[catch error]', err);
			if (err instanceof StatusError) {
				return new Response(err.message, { status: err.status });
			}
			if (err instanceof Error) {
				return new Response(err.message, { status: 500 });
			}
			return new Response(`Unexpected error.`, { status: 500 });
		},
		...(options || {}),
	});
	return router;
}

export function defineRouteHandler(fn: IttyRouterHandler) {
	return fn;
}
