import type {} from 'vitest/globals';
import { RouteWorker } from './route-worker';
import { RouteRegistry } from '../route-registry/route-registry.module.js';
import * as routes from '../routes/routes.js';
import { urlSchema } from './route-worker.schema';

describe('RouteWorker', () => {
	describe('filterRoutes', () => {
		const method = 'GET';
		const url = '/tenants/200/employees/132/name';
		const expected = {
			endpoint: {
				method: 'GET',
				route: [
					{ val: 'tenants', type: 'endpoint' },
					{ val: ':id', type: 'id' },
					{ val: 'employees', type: 'endpoint' },
					{ val: ':id', type: 'id' },
					{ val: 'name', type: 'endpoint' },
				],
				handler: expect.any(Function),
			},
			reqEndpoint: {
				method: 'GET',
				route: [
					{ val: 'tenants', type: 'endpoint' },
					{ val: '200', type: 'id' },
					{ val: 'employees', type: 'endpoint' },
					{ val: '132', type: 'id' },
					{ val: 'name', type: 'endpoint' },
				],
			},
		};
		const routeRegistry: RouteRegistry = new RouteRegistry();
		const router: RouteWorker = new RouteWorker(routeRegistry, url, method);
		it('returns invalid EndpointPair for undefined input', () => {
			const stringArr = undefined;
			const result = router.filterRoutes(stringArr);
			expect(result).toStrictEqual({
				endpoint: undefined,
				reqEndpoint: undefined,
			});
		});
		it('returns a valid EndpointPair for valid input', () => {
			const urlRoute = urlSchema.parse(url);
			const result = router.filterRoutes(urlRoute);
			expect(result).toMatchObject(expected);
		});
	});
});
