import { z } from 'zod';
import { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { RouteRegistry } from '#src/app/route-registry/route-registry.module.js';

class RoudaIncomingMessage extends IncomingMessage {
	body: string = '';
}
const routeEntrySchema = z.object({
	val: z.string(),
	type: z.enum(['endpoint', 'id']),
});
type RouteEntry = z.infer<typeof routeEntrySchema>;
const routeSchema = z.array(routeEntrySchema);
type Route = z.infer<typeof routeSchema>;

const reqEndpointSchema = z.object({
	method: z.string(),
	route: routeSchema,
});
type ReqEndpoint = {
	method: string;
	route: Route;
};

type Handler = (
	req: RoudaIncomingMessage,
	res: ServerResponse,
	entries: EndpointPair,
) => Promise<void>;
const endpointSchema = reqEndpointSchema.extend({
	handler: z.custom<Handler>((value) => typeof value === 'function'),
});
type Endpoint = {
	method: string;
	route: Route;
	handler: (
		req: RoudaIncomingMessage,
		res: ServerResponse,
		entries: EndpointPair,
	) => Promise<void>;
};
const endpointArraySchema = z.array(endpointSchema);
type EndpointArray = z.infer<typeof endpointArraySchema>;

const endpointPairSchema = z
	.object({
		endpoint: endpointSchema.optional(),
		reqEndpoint: reqEndpointSchema.optional(),
	})
	.transform(
		(pair): EndpointPair => ({
			endpoint: pair.endpoint,
			reqEndpoint: pair.reqEndpoint,
		}),
	);
type EndpointPair = {
	endpoint: Endpoint | undefined;
	reqEndpoint: ReqEndpoint | undefined;
};
/**
 * @summary: Meant to be used in conjunction with defineHandler()
 * @example 1 function defineHandler(handler: Handler): Handler {
  		return handlerContract.implementAsync(handler);
	}
 * @example 2 const handler = defineHandler(async (req, res, endpointPair) => {
  		// handler implementation
	});
 */
const handlerContract = z.function({
	input: [z.instanceof(RoudaIncomingMessage), z.instanceof(ServerResponse), endpointPairSchema],
	output: z.void(),
});

/**
 * 
 * @param handler each router call is going to include one of these.
 * @returns a validated callback guaranteed to work as perscribed
 * @example const handler = defineHandler(async (req, res, endpointPair) => {
  		// handler implementation
	});
 */
function defineHandler(handler: Handler): Handler {
	return handlerContract.implementAsync(handler);
}
const urlSchema = z
	.string()
	.trim()
	.transform((url) => {
		return url.split('/').slice(1);
	});
function getUrlRouteSchema(method: string, registry: RouteRegistry): z.ZodArray<z.ZodString> {
	return z.array(z.string()).refine((urlRoute: string[]) => {
		return (
			!registry.isShorterThanShortestRoute(method, urlRoute) &&
			!registry.isLongerThanLongestRoute(method, urlRoute)
		);
	});
}
export {
	urlSchema,
	getUrlRouteSchema,
	routeSchema,
	routeEntrySchema,
	endpointPairSchema,
	endpointSchema,
	endpointArraySchema,
	defineHandler,
	RoudaIncomingMessage,
	type ReqEndpoint,
	type Endpoint,
	type EndpointPair,
	type EndpointArray,
	type Route,
	type RouteEntry,
	type Handler,
};
