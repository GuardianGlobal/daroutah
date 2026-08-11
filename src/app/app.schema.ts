import { Server } from 'node:http';
import { z } from 'zod';
import type { Handler } from '#src/app/route-worker/route-worker.schema.js';
import {
	appStatusSchema,
	serverSessionSchema,
	type _ServerSession,
	type AppStatus,
} from '#src/app/server/server-session.schema.js';

const methodHandlerSchema = z.function({
	input: [z.string('endpoint'), z.custom<Handler>((value) => typeof value === 'function')],
	output: z.void(),
});
interface MethodHandler {
	(urlEndpoint: string, handler: Handler): void;
}

const listenerSchema = z.function({
	input: [z.string('hostname'), z.number('port')],
	output: z.void(),
});
type Listener = z.infer<typeof listenerSchema>;

const loggerSchema = z.function({
	input: [z.string('log')],
	output: z.void(),
});
type Logger = z.infer<typeof loggerSchema>;

const appSchema = z.object({
	get: methodHandlerSchema,
	post: methodHandlerSchema,
	put: methodHandlerSchema,
	patch: methodHandlerSchema,
	delete: methodHandlerSchema,
	head: methodHandlerSchema,
	options: methodHandlerSchema,
	use: methodHandlerSchema,
	listen: listenerSchema,
	log: loggerSchema,
	getStatus: z.function({
		output: appStatusSchema,
	}),
	setStatus: z.function({
		input: [appStatusSchema],
		output: z.void(),
	}),
	kill: z.function(),
	getState: z.function({
		output: serverSessionSchema,
	}),
});
interface _App {
	get: MethodHandler;
	post: MethodHandler;
	put: MethodHandler;
	patch: MethodHandler;
	delete: MethodHandler;
	head: MethodHandler;
	options: MethodHandler;
	use: MethodHandler;
	listen: Listener;
	log: Logger;
	getStatus: () => AppStatus;
	setStatus: (status: AppStatus) => void;
	kill: () => void;
	getState: () => _ServerSession;
}

export { appSchema, methodHandlerSchema, listenerSchema, loggerSchema };
export type { _App, MethodHandler, Listener, Logger };
