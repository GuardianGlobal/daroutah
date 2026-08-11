import type { _App } from './app.schema';
import { RoudaIncomingMessage, type Handler } from '#src/app/route-worker/route-worker.schema.js';
import {
	appStatusSchema,
	type AppStatus,
	type _ServerSession,
} from '#src/app/server/server-session.schema.js';
import type { RouteRegistry } from '#src/app/route-registry/route-registry.module.js';
import type { IncomingMessage, ServerEventMap, ServerResponse } from 'node:http';
import { RouteWorker } from '#src/app/route-worker/route-worker.js';
import { z } from 'zod';

export class App implements _App {
	constructor(
		private readonly session: _ServerSession,
		private readonly registry: RouteRegistry,
		private readonly routeWorker: typeof RouteWorker,
	) {}
	private __shuttingDown: boolean = false;
	private __serverErrorHandlerRegistered: boolean = false;
	private __shutdownHooksRegistered: boolean = false;
	private __logHandle: string = `[SERVER] ->`;
	private __changeStatus = (status: AppStatus): void => {
		this.session.status = status;
	};
	private __parseRequestBody = async (req: IncomingMessage): Promise<string> => {
		return new Promise((resolve, reject) => {
			const chunks: Uint8Array[] = [];
			req.on('data', (chunk) => {
				chunks.push(chunk);
			});
			req.on('end', () => {
				try {
					const data = Buffer.concat(chunks).toString();
					resolve(data);
				} catch (error) {
					reject(error);
				}
			});
			req.on('error', (error) => {
				this.__changeStatus('error');
				this.log(error.message);
				throw error;
			});
		});
	};
	private __dispatchRouteWorker = async (
		req: RoudaIncomingMessage,
		res: ServerResponse,
		registry: RouteRegistry,
	) => {
		const result = z.string().safeParse(req.method);
		const url = z.string().parse(req.url);
		if (!result.success) {
			this.log('invalid: missing method');
			res.end('invalid: missing method');
		}
		const method = result.data as string;

		if (method !== 'GET') {
			req.body = await this.__parseRequestBody(req);
		}
		const worker = new this.routeWorker(registry, url, method);
		void worker.handleRoute(req, res);
	};
	get = (urlEndpoint: string, handler: Handler): void => {
		const method = 'GET';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	post = (urlEndpoint: string, handler: Handler): void => {
		const method = 'POST';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	put = (urlEndpoint: string, handler: Handler): void => {
		const method = 'PUT';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	patch = (urlEndpoint: string, handler: Handler): void => {
		const method = 'PATCH';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	delete = (urlEndpoint: string, handler: Handler): void => {
		const method = 'DELETE';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	head = (urlEndpoint: string, handler: Handler): void => {
		const method = 'HEAD';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	options = (urlEndpoint: string, handler: Handler): void => {
		const method = 'OPTIONS';
		this.log(`[NEW ${method} ROUTE] registered @ ` + urlEndpoint);
		this.registry.registerRoutes(method, urlEndpoint, handler);
	};
	use = (urlEndpoint: string, handler: Handler): void => {
		//* @GuardianGlobal ---------------------------
		// Security
		// Observation
		// Authorization
		// Middleware
	};
	listen = async (hostname: string, port: number): Promise<boolean> => {
		return new Promise((resolve, reject) => {
			this.session.server.listen(port, hostname, () => {
				this.log('server on...\nlistening to ' + hostname + ':' + port);
				this.__changeStatus('listening');
				resolve(true);
			});
			this.session.server.on('error', (error: unknown) => reject(error));
		});
	};
	log = (log: string): void => {
		console.log(log);
		this.session.logs.push({
			timeStamp: new Date(),
			log: `${this.__logHandle} ${log}`,
		});
	};
	getStatus = (): AppStatus => this.session.status;
	setStatus = (status: AppStatus): void => {
		this.session.status = appStatusSchema.parse(status);
	};
	async kill(signal = 'manual'): Promise<void> {
		if (this.__shuttingDown) {
			this.log(`Shutdown already in progress. Ignoring ${signal}.`);
			return;
		}
		this.__shuttingDown = true;
		this.__changeStatus('shutting down');
		this.log(`Shutting down app. Reason: ${signal}`);
		if (!this.session.server.listening) {
			this.__changeStatus('terminated');
			this.log('Server was not listening. App terminated.');
			return;
		}

		await new Promise<void>((resolve, reject) => {
			this.session.server.close((error?: Error) => {
				if (error) {
					reject(error);
					return;
				}

				resolve();
			});
		});
		this.__changeStatus('terminated');
		this.log('Server closed. App terminated.');
	}
	getState = (): _ServerSession => this.session;
	on(eventName: keyof ServerEventMap, handler: (...args: any[]) => void) {
		if (this.session.server.listening) return this.session.server.on(eventName, handler);
	}
	bootstrap = async (hostname: string, port: number): Promise<void> => {
		this.__changeStatus('starting');
		this.__registerServerErrorHandler();
		this.__registerShutdownHooks();
		this.log('Bootstrapping app.');
		this.listen(hostname, port);

		this.session.server.on(
			'request',
			async (req: RoudaIncomingMessage, res: ServerResponse) => {
				this.log(`${req.method} request received for ${req.url}`);
				void this.__dispatchRouteWorker(req, res, this.registry);
			},
		);
	};

	private __registerServerErrorHandler(): void {
		if (this.__serverErrorHandlerRegistered) {
			return;
		}

		this.__serverErrorHandlerRegistered = true;
		this.session.server.on('error', async (error: Error & { code?: string }) => {
			this.log(`Server error: ${error.code ?? error.name} - ${error.message}`);
			this.__changeStatus('error');
			try {
				// Clean up the status and attempt to close bindings
				await this.kill(`CRASH_${error.code ?? 'UNKNOWN'}`);
			} catch (killError) {
				this.log(`Failed during emergency crash shutdown: ${(killError as Error).message}`);
			} finally {
				// Force the entire OS process to die so the port releases
				this.__changeStatus('terminated');
				process.exit(1);
			}
		});
	}
	private __registerShutdownHooks(): void {
		if (this.__shutdownHooksRegistered) {
			return;
		}

		this.__shutdownHooksRegistered = true;

		process.once('SIGINT', () => {
			void this.kill('SIGINT')
				.then(() => process.exit(0))
				.catch((error: Error) => {
					this.log(`Failed to shut down cleanly: ${error.message}`);
					process.exit(1);
				});
		});

		process.once('SIGTERM', () => {
			void this.kill('SIGTERM')
				.then(() => process.exit(0))
				.catch((error: Error) => {
					this.log(`Failed to shut down cleanly: ${error.message}`);
					process.exit(1);
				});
		});
	}
}
