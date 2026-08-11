import { z } from 'zod';
import { Server } from 'node:http';
const serverSessionLogSchema = z.object({
	timeStamp: z.date(),
	log: z.string(),
});
type ServerSessionLog = z.infer<typeof serverSessionLogSchema>;

const appStatusSchema = z.enum([
	'offline',
	'starting',
	'listening',
	'shutting down',
	'error',
	'terminated',
]);
type AppStatus = z.infer<typeof appStatusSchema>;

const serverSessionSchema = z.object({
	createdAt: z.date(),
	server: z.instanceof(Server),
	status: appStatusSchema,
	logs: z.array(serverSessionLogSchema),
});
type _ServerSession = z.infer<typeof serverSessionSchema>;

export type { AppStatus, ServerSessionLog, _ServerSession };
export { appStatusSchema, serverSessionLogSchema, serverSessionSchema };
