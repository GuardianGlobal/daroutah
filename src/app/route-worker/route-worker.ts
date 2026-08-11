import type { IncomingMessage, ServerResponse } from 'node:http';
import { RouteRegistry } from '../route-registry/route-registry.module.js';
import {
	getUrlRouteSchema,
	urlSchema,
	type Endpoint,
	type ReqEndpoint,
	type EndpointPair,
	type Route,
} from './route-worker.schema.js';

export class RouteWorker {
	constructor(
		private readonly routeRegistry: RouteRegistry,
		private readonly url: string,
		private readonly method: string,
	) {}
	async handleRoute(req: IncomingMessage, res: ServerResponse) {
		const endpointPair: EndpointPair = this.handleUrl();
		void this.handleResponse(req, res, endpointPair);
	}
	private handleUrl(): EndpointPair {
		const urlRoute = urlSchema.safeParse(this.url)?.data;
		if (!urlRoute) {
			return { endpoint: undefined, reqEndpoint: undefined };
		}
		return this.filterRoutes(urlRoute);
	}
	private async handleResponse(
		req: IncomingMessage,
		res: ServerResponse,
		e: EndpointPair,
	): Promise<undefined> {
		if (!e.endpoint) {
			res.setHeader('Status', 404);
			res.write('Not found');
			res.end();
		} else {
			void e.endpoint.handler(req, res, e);
		}
	}
	filterRoutes(urlRoute: string[] | undefined): EndpointPair {
		const urlRouteSchema = getUrlRouteSchema(this.method, this.routeRegistry);
		const result = urlRouteSchema.safeParse(urlRoute);
		if (!result.data) {
			return { endpoint: undefined, reqEndpoint: undefined };
		}
		const validatedRoute = result.data;
		return this.assessRouteCandidates(validatedRoute);
	}
	private assessRouteCandidates(validatedRoute: string[]): EndpointPair {
		const reqEndpoint: ReqEndpoint = {
			method: this.method,
			route: [],
		};
		const candidates = this.routeRegistry
			.getRegistry(this.method)
			.filter(
				(endpoint: Endpoint) =>
					validatedRoute[0] === endpoint.route[0].val &&
					validatedRoute.length === endpoint.route.length,
			);
		if (!candidates)
			return {
				endpoint: undefined,
				reqEndpoint: undefined,
			};
		let endpoint: Endpoint | undefined;
		for (const candidate of candidates) {
			endpoint = this.assessCandidateRoute(
				reqEndpoint,
				candidate,
				candidate.route,
				validatedRoute,
				0,
			);
			if (endpoint) break;
		}
		if (!endpoint) {
			return {
				endpoint: undefined,
				reqEndpoint: undefined,
			};
		}
		return {
			endpoint,
			reqEndpoint,
		};
	}
	private assessCandidateRoute(
		reqEndpoint: ReqEndpoint,
		candidate: Endpoint,
		candidateRoute: Route,
		validatedRoute: string[],
		index: number,
	): Endpoint | undefined {
		const [currentEntry, ...remainingEntries] = candidateRoute;
		const currentReqEntry = validatedRoute[index];
		if (!currentEntry) {
			return candidate;
		}
		if (currentEntry.val !== currentReqEntry) {
			if (currentEntry.type !== 'id') {
				return;
			}
			reqEndpoint.route.push({
				val: currentReqEntry,
				type: 'id',
			});
		} else {
			reqEndpoint.route.push({
				val: currentReqEntry,
				type: 'endpoint',
			});
		}
		if (!remainingEntries) {
			return candidate;
		}
		return this.assessCandidateRoute(
			reqEndpoint,
			candidate,
			remainingEntries,
			validatedRoute,
			++index,
		);
	}
}
