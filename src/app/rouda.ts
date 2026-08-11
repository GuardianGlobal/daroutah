import { App } from '#src/app/app.module.js';
import { RouteRegistry } from '#src/app/route-registry/route-registry.module.js';
import { ServerSession } from '#src/app/server/server-session.module.js';
import { Server } from 'node:http';
import { RouteWorker } from './route-worker/route-worker';

const routeRegistry = new RouteRegistry();
const server = new Server();
const session = new ServerSession(server);
const rouda = (): App => {
	return new App(session, routeRegistry, RouteWorker);
};
export { rouda };
