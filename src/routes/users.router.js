import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import { PrismaClient as PrismaClient1} from '@prisma-db-1/client'


const router = express.Router();


const prismaUser = new PrismaClient1()

router.post("/sign-up", async (req, res, next) => { // 회원가입
    try {
        const { userId, password } = req.body;

        const isExisUser = await prismaUser.users.findFirst({ //중복 여부 조회
            where: { userId }
        });

        if (isExisUser) {
            return res.status(409).json({ Message: "이미 존재하는 아이디입니다." });
        }

        const regExp = /^[a-z0-9]*$/


        if (!(regExp.test(userId))) {
            return res.status(409).json({ Message: "아이디는 숫자와 영소문자 조합이어야 합니다." })
        }


        if (password.length < 6) { // 비밀번호 길이 확인
            return res.status(409).json({ Message: "비밀번호는 최소 6자리 이상으로 입력해 주세요." });
        }

        const hashedPsaaword = await bcrypt.hash(password, 10); // 비밀번호 암호화

        const user = await prismaUser.users.create({ //변수 저장
            data: {
                userId,
                password: hashedPsaaword
            }
        });

        return res.status(201).json({ Message: "회원가입이 완료되었습니다." });
    } catch (err) {
        next(err);
    }
})

router.post("/sign-in", async (req, res, next) => { //로그인
    try {
        const { userId, password } = req.body;

        const user = await prismaUser.users.findFirst({ //userId와 일치하는 정보 불러오기
            where: { userId }
        });

        if (!user) { //존재 여부 확인
            return res.status(401).json({ message: "존재하지 않는 아이디입니다." });
        }

        if (!await bcrypt.compare(password, user.password)) {//비번 일치 확인
            return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
        }

        const token = jwt.sign({
            userCode: user.userCode
        },
            "customized_secret_key")

        res.cookie("authorization", `Bearer ${token}`);

        return res.status(200).json({ Message: "로그인 성공했습니다." });
    } catch (err) {
        next(err);
    }

})

router.get("/sign-list", async (req, res, next) => { //회원리스트 조회
    const users = await prismaUser.users.findMany({})

    return res.status(200).json({ Message: users })
})


router.delete("/sign-delete", authMiddleware, async (req, res, next) => {//회원 삭제
    try {

        const { authorization } = await req.cookies;
        if(!authorization){
            return res.status(400).json({Message: "로그인이 필요합니다."})
        }

        const enter_password  = req.body.password;
        const { password, userCode } = req.user;

        const result = await bcrypt.compare(enter_password,password)

        if (result) {
            const deleteCharacter = await prismaUser.users.delete({
                where: { userCode }
            });
            return res.status(201).json({ Message: "회원 탈퇴가 완료되었습니다." });
        } else {
            return res.status(400).json({ Message: "비밀번호가 일치하지 않습니다." });
        }

    } catch (err) {
        next(err);
    }

})


export default router;