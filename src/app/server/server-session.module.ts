import type { _ServerSession } from '#src/app/server/server-session.schema.js';
import type { AppStatus, ServerSessionLog } from '#src/app/server/server-session.schema.js';
import type { Server } from 'node:http';

export class ServerSession implements _ServerSession {
	constructor(public server: Server) {}
	createdAt: Date = new Date();
	status: AppStatus = 'offline';
	logs: ServerSessionLog[] = [];
}
