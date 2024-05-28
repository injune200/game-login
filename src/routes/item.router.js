import express from 'express';
import authMiddleware from '../middlewares/auth.middleware.js';
import { PrismaClient as PrismaClient1 } from '@prisma-db-1/client';
import { PrismaClient as PrismaClient2 } from '@prisma-db-2/client';

const router = express.Router();

const prismaUser = new PrismaClient1();
const prismaItem = new PrismaClient2();

router.post('/item-create', async (req, res, next) => {
  // 아이템 생성
  try {
    const { itemName, stats, itemPrice } = req.body;

    const isExisUser = await prismaItem.items.findFirst({
      //중복 여부 조회
      where: { itemName },
    });

    if (isExisUser) {
      return res.status(409).json({ Message: '이미 존재하는 아이템입니다.' });
    }

    const item = await prismaItem.items.create({
      //변수 저장
      data: {
        itemName,
        stats: {
          create: {
            itemHealth: stats.itemHealth,
            itemPower: stats.itemPower,
          },
        },
        itemPrice,
      },
    });

    return res.status(201).json({ message: '아이템 등록이 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

router.get('/item-list', async (req, res, next) => {
  // 아이템 목록 조회
  try {
    const items = await prismaItem.items.findMany({
      select: {
        itemId: true,
        itemName: true,
        itemPrice: true,
      },
    });

    if (!items) {
      return res.status(400).json({ Message: '아이템이 존재하지 않습니다.' });
    }

    return res.status(201).json({ '아이템 목록': items });
  } catch (err) {
    next(err);
  }
});

router.put('/item-update/:itemName', async (req, res, next) => {
  // 아이템 수정
  try {
    const { itemName, itemHealth, itemPower } = req.body;
    const currentItemName = req.params.itemName;

    const item = await prismaItem.items.findFirst({
      where: {
        itemName: currentItemName,
      },
    });

    if (!item) {
      return res.status(400).json({ Message: '아이템이 존재하지 않습니다.' });
    }

    const itemUpdate = await prismaItem.items.update({
      where: {
        itemName: currentItemName,
      },
      data: {
        itemName,
        itemHealth,
        itemPower,
      },
    });

    return res.status(201).json({ Message: itemUpdate });
  } catch (err) {
    next(err);
  }
});

router.get('/item-list/:itemName', async (req, res, next) => {
  // 아이템 상세 조회
  try {
    const { itemName } = req.params;

    const items = await prismaItem.items.findFirst({
      where: { itemName },
      select: {
        itemId: true,
        itemName: true,
        stats: {
          select: {
            itemHealth: true,
            itemPower: true,
          },
        },
        itemPrice: true,
      },
    });

    if (!items) {
      return res.status(400).json({ Message: '아이템이 존재하지 않습니다.' });
    }

    return res.status(201).json({ Message: items });
  } catch (err) {
    next(err);
  }
});

router.delete('/item-delete/:itemName', async (req, res, next) => {
  //아이템 삭제
  try {
    const { itemName } = req.params;
    const item = await prismaItem.items.findFirst({
      where: { itemName },
    });
    if (!item) {
      res.status(400).json({ Message: '해당 아이템은 존재하지 않습니다.' });
    }
    const deleteItem = await prismaItem.items.delete({
      where: { itemName },
    });
    return res.status(201).json({ Message: '아이템 삭제가 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

export default router;
