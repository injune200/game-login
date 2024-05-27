import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { PrismaClient as PrismaClient1 } from '@prisma-db-1/client'

const router = express.Router();

const prismaUser = new PrismaClient1()

router.post("/character", authMiddleware, async (req, res, next) => {//캐릭터 생성
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: "로그인이 필요합니다." })
        }

        const { userCode } = req.user;
        const { characterName } = req.body;
        const isExischaracter = await prismaUser.characters.findFirst({ //캐릭터이름 중복여부 조회
            where: { characterName }
        });
        if (isExischaracter) {
            res.status(400).json({ Message: "해당 캐릭터는 이미 존재합니다." })
        }
        const character = await prismaUser.characters.create({
            data: {
                characterUserCode: userCode,
                characterName
            }
        });
        return res.status(201).json({ data: character });
    } catch (err) {
        next(err);
    }

})

router.get("/character", authMiddleware, async (req, res, next) => {//해당 ID캐릭터 전체 조회
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: "로그인이 필요합니다." })
        }

        const { userCode } = req.user;
        const character = await prismaUser.characters.findMany({
            where: { characterUserCode: userCode },
        });
        return res.status(201).json({ data: character });
    } catch (err) {
        next(err);
    }

})

router.delete("/character/:characterName", authMiddleware, async (req, res, next) => {//캐릭터 삭제
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: "로그인이 필요합니다." })
        }

        const { userCode } = req.user;
        const { characterName } = req.params;
        const character = await prismaUser.characters.findMany({
            where: { characterName: characterName },
        });
        if (!character) {
            res.status(400).json({ Message: "해당 캐릭터는 존재하지 않습니다." });
        }
        const deleteCharacter = await prismaUser.characters.delete({
            where: { characterName: characterName }
        });
        return res.status(201).json({ Message: "캐릭터 삭제가 완료되었습니다." });
    } catch (err) {
        next(err);
    }

})

router.get("/character/:characterName", authMiddleware, async (req, res, next) => {//해당 ID캐릭터 상세 조회
    try {
        const { authorization } = await req.cookies;


        const { characterName } = req.params;

        const characterUserCode = await prismaUser.characters.findFirst({
            where: { characterName }
        });
        if (!characterUserCode) {
            return res.status(400).json({ Message: "해당 캐릭터는 존재하지 않습니다." })
        }

        if (authorization) {
            const { userCode } = req.user;
            if (userCode == characterUserCode.characterUserCode) {
                const character = await prismaUser.characters.findFirst({
                    where: { characterName },
                    select: {
                        characterName: true,
                        characterHealth: true,
                        characterPower: true,
                        characterMoney: true
                    }
                });
                return res.status(201).json({ data: character });
            } else {
                const character = await prismaUser.characters.findFirst({
                    where: { characterName },
                    select: {
                        characterName: true,
                        characterHealth: true,
                        characterPower: true
                    }
                });
                return res.status(201).json({ data: character });
            }
        } else {
            const character = await prismaUser.characters.findFirst({
                where: { characterName },
                select: {
                    characterName: true,
                    characterHealth: true,
                    characterPower: true
                }
            });
            return res.status(201).json({ data: character });
        }


    } catch (err) {
        next(err);
    }

})

export default router;