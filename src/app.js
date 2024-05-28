import express from 'express';
import cookieParser from 'cookie-parser';
import UserRouter from './routes/users.router.js';
import CharacterRouter from './routes/character.router.js';
import ItemRouter from './routes/item.router.js';
import ItemShopRouter from './routes/item-shop.router.js';
import logMiddleware from './middlewares/log.middleware.js';
import errorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import dotEnv from "dotenv";

dotEnv.config();

const app = express();
const PORT = process.env.DATABASE_PORT;

app.use(logMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use('/', [UserRouter, CharacterRouter, ItemRouter,ItemShopRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸습니다.');
});
