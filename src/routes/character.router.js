import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { PrismaClient as PrismaClient1 } from '@prisma-db-1/client';
import { PrismaClient as PrismaClient2 } from '@prisma-db-2/client';
import { Prisma } from "@prisma/client";

const router = express.Router();

const prismaUser = new PrismaClient1();
const prismaItem = new PrismaClient2();

router.post('/character', authMiddleware, async (req, res, next) => {
    //캐릭터 생성
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: '로그인이 필요합니다.' });
        }

        const { userCode } = req.user;
        const { characterName } = req.body;
        const isExischaracter = await prismaUser.characters.findFirst({
            //캐릭터이름 중복여부 조회
            where: { characterName },
        });
        if (isExischaracter) {
            res.status(400).json({ Message: '해당 캐릭터는 이미 존재합니다.' });
        }
        const character = await prismaUser.characters.create({
            data: {
                characterUserCode: userCode,
                characterName,
            },
        });
        return res.status(201).json({ data: character });
    } catch (err) {
        next(err);
    }
});

router.get('/character', authMiddleware, async (req, res, next) => {
    //해당 ID캐릭터 전체 조회
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: '로그인이 필요합니다.' });
        }

        const { userCode } = req.user;
        const character = await prismaUser.characters.findMany({
            where: { characterUserCode: userCode },
        });
        return res.status(201).json({ data: character });
    } catch (err) {
        next(err);
    }
});

router.delete('/character/:characterName', authMiddleware, async (req, res, next) => {
    //캐릭터 삭제
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: '로그인이 필요합니다.' });
        }

        const { userCode } = req.user;
        const { characterName } = req.params;
        const character = await prismaUser.characters.findMany({
            where: { characterName: characterName },
        });
        if (!character) {
            res.status(400).json({ Message: '해당 캐릭터는 존재하지 않습니다.' });
        }
        const deleteCharacter = await prismaUser.characters.delete({
            where: { characterName: characterName },
        });
        return res.status(201).json({ Message: '캐릭터 삭제가 완료되었습니다.' });
    } catch (err) {
        next(err);
    }
});

router.get('/character/:characterName', authMiddleware, async (req, res, next) => {
    //해당 ID캐릭터 상세 조회
    try {
        const { authorization } = await req.cookies;

        const { characterName } = req.params;

        const characterUserCode = await prismaUser.characters.findFirst({
            where: { characterName },
        });
        if (!characterUserCode) {
            return res.status(400).json({ Message: '해당 캐릭터는 존재하지 않습니다.' });
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
                        characterMoney: true,
                        CharacterEquip: {
                            select: {
                                equipItemId: true
                            }
                        },
                        CharacterInven: {
                            select: {
                                invenItemId: true,
                                invenItemName: true,
                                invenItemCount: true
                            }
                        }

                    },
                });
                return res.status(201).json({ data: character });
            } else {
                const character = await prismaUser.characters.findFirst({
                    where: { characterName },
                    select: {
                        characterName: true,
                        characterHealth: true,
                        characterPower: true,
                    },
                });
                return res.status(201).json({ data: character });
            }
        } else {
            const character = await prismaUser.characters.findFirst({
                where: { characterName },
                select: {
                    characterName: true,
                    characterHealth: true,
                    characterPower: true,
                },
            });
            return res.status(201).json({ data: character });
        }
    } catch (err) {
        next(err);
    }
});

router.get("/character/:characterName/inven", authMiddleware, async (req, res, next) => {//캐릭터 인벤 조회
    const { authorization } = await req.cookies;
    if (!authorization) {
        return res.status(400).json({ Message: '로그인이 필요합니다.' });
    }

    const { characterName } = req.params;
    const { userCode } = req.user;

    const character = await prismaUser.characters.findFirst({
        where: { characterName }
    })

    if (userCode == character.characterUserCode) {
        const characterInvensList = await prismaUser.characterInvens.findMany({
            where: {
                invenCharacterCode: character.characterCode
            },
            select: {
                invenItemId: true,
                invenItemName: true,
                invenItemCount: true
            }


        })

        return res.status(200).json({ Message: characterInvensList })
    } else {
        return res.status(400).json({ Message: `해당 아이디에는 ${characterName}이라는 캐릭터가 존재하지 않습니다.` })
    }


})

router.put("/character/:characterName/equip", authMiddleware, async (req, res, next) => { //아이템 장착
    const { authorization } = await req.cookies;
    if (!authorization) {
        return res.status(400).json({ Message: '로그인이 필요합니다.' });
    }

    const { characterName } = req.params;
    const { userCode } = req.user;
    const equipItemList = req.body;

    const character = await prismaUser.characters.findFirst({ //캐릭터 조회
        where: {
            characterName,
            characterUserCode: userCode
        }
    });

    if (!character) {
        return res.status(400).json({ Message: '해당 캐릭터는 존재하지 않습니다.' });
    }

    const characterInvenItemList = await prismaUser.characterInvens.findMany({ //캐릭터 인벤조회
        where: {
            invenCharacterCode: character.characterCode
        }
    })

    if (!characterInvenItemList) {
        return res.status(400).json({ Message: '인벤에 아이템이 존재하지 않습니다.' });
    }

    const lostItemEquipList = [];

    for (const element of equipItemList) {

        const { itemId } = element;

        const item = await prismaItem.items.findFirst({ //해당 아이템 정보 조회
            where: { itemId }
        })


        if (!item) { // 해당 아이템이 존재하지 않을경우
            lostItemEquipList.push(itemId)
            continue;
        }

        const characterInvenItem = await prismaUser.characterInvens.findFirst({ //캐릭터인벤 아이템 조회
            where: {
                invenCharacterCode: character.characterCode,
                invenItemId: itemId
            }
        })
        if (!characterInvenItem) {
            lostItemEquipList.push(itemId)
            continue;
        }
        const characterEquipItem = await prismaUser.characterEquip.findFirst({ //캐릭터 장착 아이템 조회
            where: {
                equipCharacterCode: character.characterCode,
                equipItemId: itemId
            }
        })

        if (characterEquipItem == null) { //해당 아이템이 장착중이 아니라면 장착함
            const currentCharacter = await prismaUser.characters.findFirst({ //현재 캐릭터 조회
                where: {
                    characterName,
                    characterUserCode: userCode
                }
            });

            const itemStat = await prismaItem.itemStats.findFirst({
                where: {
                    statItemId: itemId
                }
            });

            const inven = await prismaUser.characterInvens.findFirst({
                where: {
                    invenCharacterCode: character.characterCode,
                    invenItemId: itemId
                }
            })

            const afterInvenCount = characterInvenItem.invenItemCount - 1
            const afterCharacterHealth = currentCharacter.characterHealth + itemStat.itemHealth;
            const afterCharacterPower = currentCharacter.characterPower + itemStat.itemPower;

            console.log(itemStat.itemHealth,":",itemStat.itemPower)

            const equipItem = await prismaUser.characterEquip.create({
                data: {
                    equipCharacterCode: character.characterCode,
                    equipItemId: itemId
                }
            })

            if (afterInvenCount != 0) { //인벤 아이템 0개일 경우 삭제
                const invenItemUpdate = await prismaUser.characterInvens.update({
                    where: {
                        invenCode: inven.invenCode
                    },
                    data: {
                        invenItemCount: afterInvenCount
                    }
                })
            } else {
                const invenItemUpdate = await prismaUser.characterInvens.delete({
                    where: {
                        invenCode: inven.invenCode
                    }
                })
            }

            const characterUpdate = await prismaUser.characters.update({
                where: {
                    characterCode: currentCharacter.characterCode
                },
                data: {
                    characterHealth: afterCharacterHealth,
                    characterPower: afterCharacterPower
                }
            })
        } else {
            lostItemEquipList.push(itemId)
            continue;
        }
    }

    return res.status(200).json({ Message: "완료되었습니다.", "장착하지 못한 아이템": lostItemEquipList });

})


router
export default router;
