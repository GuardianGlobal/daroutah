import { z } from 'zod';
import {
	urlSchema,
	endpointArraySchema,
	type RouteEntry,
	type EndpointArray,
	type Endpoint,
	type Route,
	type Handler,
} from '../route-worker/route-worker.schema';

export class RouteRegistry {
	private registry: Map<string, EndpointArray> = new Map();
	/**
	 *
	 * @returns the full route registry for the specified request method
	 */
	getRegistry = (method: string): EndpointArray =>
		endpointArraySchema.parse(this.registry.get(method));
	/**
	 * Turns a route definition from in-built functions into a registered route in system.
	 * @param method Request methods like 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
	 * @param urls This can be an string or an array of strings.
	 * @param handler callback used to handle the request
	 */
	registerRoutes = (method: string, urls: string | string[], handler: Handler): void => {
		const stringOrStringArraySchema = z.union([
			z.string().transform((str) => [str]),
			z.array(z.string()),
		]);
		const result = stringOrStringArraySchema.safeParse(urls);
		if (!result.success) throw new Error('invalid urls argument');
		const _urls = result.data;
		for (let url of _urls) {
			const routeEntries = urlSchema.parse(url);
			const route: Route = routeEntries.map((entry: string): RouteEntry => {
				if (entry.trim().includes(':', 0) || entry.trim().includes('#', 0)) {
					return { val: entry, type: 'id' };
				}
				return { val: entry, type: 'endpoint' };
			});
			this.getRegistry(method).push({ method, route, handler });
		}
	};

	isShorterThanShortestRoute(method: string, route: string[]): boolean {
		const registry = this.getRegistry(method);
		const shortest = registry.sort((a: Endpoint, b: Endpoint) => {
			return a.route.length - b.route.length;
		})[0];
		return shortest.route.length > route.length;
	}
	isLongerThanLongestRoute(method: string, route: string[]): boolean {
		const registry = this.getRegistry(method);
		const lastIndex = registry.length - 1;
		const longest = registry.sort((a: Endpoint, b: Endpoint) => {
			return a.route.length - b.route.length;
		})[lastIndex < 0 ? 0 : lastIndex];
		return longest.route.length < route.length;
	}
}
