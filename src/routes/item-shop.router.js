import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { PrismaClient as PrismaClient1 } from '@prisma-db-1/client';
import { PrismaClient as PrismaClient2 } from '@prisma-db-2/client';
import { Prisma } from "@prisma/client";

const router = express.Router();

const prismaUser = new PrismaClient1();
const prismaItem = new PrismaClient2();


router.put("/item-purchase/:characterName", authMiddleware, async (req, res, next) => { //아이템 구매
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: '로그인이 필요합니다.' });
        }

        const { userCode } = req.user;
        const { characterName } = req.params;

        const Character = await prismaUser.characters.findFirst({//캐릭터 여부 조회
            where: { characterName },
        });

        if (!Character || Character.characterUserCode !== userCode) {
            return res.status(409).json({ Message: '존재하지 않는 캐릭터 입니다.' });
        }

        const itemPurchaseList = req.body;

        const lostItemPurchaseList = [];

        // itemPurchaseList.forEach(async (element) => {
        for (const element of itemPurchaseList) {
            const { itemId, itemCount } = element;

            const purchaseCharacter = await prismaUser.characters.findFirst({//캐릭터 여부 조회
                where: { characterName },
            });

            const item = await prismaItem.items.findFirst({
                where: { itemId }
            })

            if (!item) { //존재하지 않는 아이템 리스트
                lostItemPurchaseList.push(itemId)
                continue
            }

            if (itemCount <= 0) {
                lostItemPurchaseList.push(itemId)
                continue
            }



            const afterCharacterMoney = purchaseCharacter.characterMoney - item.itemPrice * itemCount;//잔액 조회

            if (afterCharacterMoney < 0) {
                return res.status(200).json({ Message: "잔액이 부족합니다." })
            }

            const [characterMoneyUpdate, invenUpdate] = await prismaUser.$transaction(async (tx) => {
                const characterMoneyUpdate = await tx.characters.update({//금액 차감
                    where: {
                        characterName
                    },
                    data: {
                        characterMoney: afterCharacterMoney
                    }
                });

                const isExisItem = await tx.characterInvens.findFirst({ //인벤에 해당 아이템이 있는지
                    where: {
                        invenCharacterCode: purchaseCharacter.characterCode,
                        invenItemId: itemId
                    }
                })

                if (isExisItem) {
                    const afterInvenCount = isExisItem.invenItemCount + itemCount;

                    const invenUpdate = await tx.characterInvens.update({//아이템 있을시 Count추가
                        where: {
                            invenCode: isExisItem.invenCode
                        },
                        data: {
                            invenItemCount: afterInvenCount
                        }
                    });
                    return [characterMoneyUpdate, invenUpdate];
                } else {
                    const invenUpdate = await tx.characterInvens.create({ //아이템추가
                        data: {
                            invenCharacterCode: purchaseCharacter.characterCode,
                            invenItemId: itemId,
                            invenItemName: item.itemName,
                            invenItemCount: +itemCount
                        }
                    })
                    return [characterMoneyUpdate, invenUpdate];
                }



            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted // 격리 레벨
            })
        };
        return res.status(200).json({ Message: "구매가 완료 되었습니다.", "추가되지 않은 아이템": lostItemPurchaseList })
    } catch (err) {
        next(err)
    }

})

router.put("/item-sale/:characterName", authMiddleware, async (req, res, next) => { //인벤 아이템 판매
    try {
        const { authorization } = await req.cookies;
        if (!authorization) {
            return res.status(400).json({ Message: '로그인이 필요합니다.' });
        }

        const { userCode } = req.user;
        const { characterName } = req.params;
        const itemSaleList = req.body;
        const itemSalePercent = 0.6;

        const character = await prismaUser.characters.findFirst({ // 캐릭터 조회
            where: { characterName }
        })


        if (userCode != character.characterUserCode) { //유저에게 해당 캐릭터가 있는지 조회
            return res.status(400).json({ Message: `해당 아이디에는 ${characterName}이라는 캐릭터가 존재하지 않습니다.` })
        }

        const characterInvensList = await prismaUser.characterInvens.findMany({//인벤 아이템 조회
            where: {
                invenCharacterCode: character.characterCode
            }
        })


        if (!characterInvensList) { //인벤토리에 아이템 존재 확인
            return res.status(400).json({ Message: "인벤토리에 아이템이 없습니다." })
        }

        const lostItemPurchaseList = []; //판매하지 못한 리스트

        for (const element of itemSaleList) {
            const { itemId, itemCount } = element

            const currentCharacter = await prismaUser.characters.findFirst({ // 캐릭터 조회
                where: { characterName }
            })

            const characterInvenItem = await prismaUser.characterInvens.findFirst({//판매할 인벤 아이템 조회
                where: {
                    invenCharacterCode: character.characterCode,
                    invenItemId: itemId
                }
            })
            const item = await prismaItem.items.findFirst({ //해당 아이템 정보 조회
                where: { itemId }
            })


            if (!item) { // 해당 아이템이 존재하지 않을경우
                lostItemPurchaseList.push(itemId)
                continue;
            }
            if (itemCount > characterInvenItem.invenItemCount) {// 갯수가 적을 경우 
                lostItemPurchaseList.push(itemId)
                continue;
            }
            const afterInvenCount = characterInvenItem.invenItemCount - itemCount;

            const [characterMoneyUpdate, invenUpdate] = await prismaUser.$transaction(async (tx) => {



                const characterMoneyUpdate = await tx.characters.update({//금액 추가
                    where: {
                        characterName
                    },
                    data: {
                        characterMoney: currentCharacter.characterMoney + item.itemPrice * itemCount * itemSalePercent
                    }
                });


                if (afterInvenCount > 0) {
                    const invenUpdate = await tx.characterInvens.update({//갯수가 남을경우 인벤 아이템 차감
                        where: {
                            invenCode: characterInvenItem.invenCode
                        },
                        data: {
                            invenItemCount: characterInvenItem.invenItemCount - itemCount
                        }
                    });
                    return [characterMoneyUpdate, invenUpdate]
                } else {
                    const invenUpdate = await tx.characterInvens.delete({//갯수가 0개일 경우 인벤 아이템 삭제
                        where: {
                            invenCode: characterInvenItem.invenCode
                        }
                    })
                    return [characterMoneyUpdate, invenUpdate]
                }
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted // 격리 레벨
            })

        }


        return res.status(200).json({ Message: "판매가 완료 되었습니다.", "판매하지 못한 아이템": lostItemPurchaseList })

    } catch (err) {
        next(err)
    }
})

export default router;
