import jwt from 'jsonwebtoken';
import { PrismaClient as PrismaClient1 } from '@prisma-db-1/client';
import dotEnv from "dotenv";

dotEnv.config();

const prismaUser = new PrismaClient1();

export default async function (req, res, next) {
  //사용자 검증
  try {
    const { authorization } = await req.cookies; // 이전 검증

    if (!authorization) {
      return next();
    }

    const [tokenType, token] = authorization.split(' ');

    if (tokenType !== 'Bearer') throw new Error('토큰 타입이 일치하지 않습니다.');

    const decodedToken = jwt.verify(token, process.env.SESSION_SECRET_KEY);
    const userCode = decodedToken.userCode;

    const user = await prismaUser.users.findFirst({
      where: { userCode: userCode },
    });
    if (!user) {
      res.clearCookie('authorization');
      throw new Error('토큰 사용자가 존재하지 않습니다.');
    }

    req.user = user; //사용자 정보 할당

    next(); // 다음 미들웨어 실행
  } catch (error) {
    res.clearCookie('authorization'); // 특정쿠키를 삭제시킨다
    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: '토큰이 만료되었습니다.' });
        break;
      case 'JsonWebTokenError':
        return res.status(401).json({ message: '토큰 인증에 실패하였습니다.' });
        break;
      default:
        return res.status(401).json({ message: error.message ?? '비 정상적인 요청입니다.' }); //토큰 타입이 일치하지 않습니다. 가아니라면 출력
    }
  }
}
