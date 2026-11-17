import { createGameServer } from './app';
import { createStore } from './persistence';

const port = Number(process.env.PORT ?? 2567);
const store = await createStore(process.env);
const game = await createGameServer(store);
const actual = await game.listen(port);
console.log(`[quan-nha-minh] server chạy ở cổng ${actual}`);
