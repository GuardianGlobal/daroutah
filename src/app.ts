import { rouda } from '#src/app/rouda.js';
const app = rouda();
await app.bootstrap('localhost', 3000);
export { app };
