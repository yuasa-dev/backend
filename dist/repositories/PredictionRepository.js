"use strict";
/**
 * PredictionRepository
 *
 * 予想関連のDBアクセスを集約
 * すべてのメソッドでuserIdを必須とし、RLS相当のセキュリティを確保
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictionRepository = exports.PredictionRepository = void 0;
const prisma_1 = require("../lib/prisma");
class PredictionRepository {
    /**
     * レースの予想一覧を取得（グループまたは個人）
     * @param userId リクエストユーザーID（RLS: グループメンバーまたは個人予想のみ取得可能）
     * @param raceId レースID
     * @param groupId グループID（nullの場合は個人予想）
     */
    async findByRaceAndGroup(userId, raceId, groupId) {
        // グループ指定時はメンバー確認
        if (groupId) {
            const membership = await prisma_1.prisma.userGroup.findUnique({
                where: {
                    userId_groupId: { userId, groupId },
                },
            });
            if (!membership) {
                return null; // メンバーでない場合はアクセス拒否
            }
        }
        const predictions = await prisma_1.prisma.prediction.findMany({
            where: {
                raceId,
                groupId: groupId || null,
            },
            include: {
                user: { select: { id: true, nickname: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        return predictions.map((p) => ({
            userId: p.userId,
            nickname: p.user.nickname,
            isMine: p.userId === userId,
            honmei: p.honmei,
            taikou: p.taikou,
            tanana: p.tanana,
            renka: p.renka ? p.renka.split(',').map(Number).filter((n) => !isNaN(n)) : [],
            ana: p.ana ? p.ana.split(',').map(Number).filter((n) => !isNaN(n)) : [],
            comment: p.comment,
        }));
    }
    /**
     * ユーザーの予想を取得
     * @param userId 対象ユーザーID（RLS: 自分の予想のみ取得可能）
     */
    async findByUserAndRace(userId, raceId, groupId) {
        return prisma_1.prisma.prediction.findFirst({
            where: {
                userId,
                raceId,
                groupId: groupId ?? null,
            },
        });
    }
    /**
     * 予想を作成
     * @param input 予想データ（userIdは呼び出し元で認証済みであること）
     */
    async create(input) {
        // グループ指定時はメンバー確認
        if (input.groupId) {
            const membership = await prisma_1.prisma.userGroup.findUnique({
                where: {
                    userId_groupId: { userId: input.userId, groupId: input.groupId },
                },
            });
            if (!membership) {
                throw new Error('グループのメンバーではありません');
            }
        }
        return prisma_1.prisma.prediction.create({
            data: {
                userId: input.userId,
                raceId: input.raceId,
                groupId: input.groupId || null,
                honmei: input.honmei,
                taikou: input.taikou,
                tanana: input.tanana,
                renka: input.renka,
                ana: input.ana,
                comment: input.comment,
            },
        });
    }
    /**
     * 予想を更新
     * @param userId 対象ユーザーID（RLS: 自分の予想のみ更新可能）
     */
    async update(userId, raceId, groupId, input) {
        // findFirstで該当レコードを見つけてから更新
        const existing = await prisma_1.prisma.prediction.findFirst({
            where: {
                userId,
                raceId,
                groupId: groupId ?? null,
            },
        });
        if (!existing) {
            throw new Error('予想が見つかりません');
        }
        return prisma_1.prisma.prediction.update({
            where: { id: existing.id },
            data: input,
        });
    }
    /**
     * 予想を作成または更新（upsert）
     * @param userId 対象ユーザーID（RLS: 自分の予想のみ操作可能）
     */
    async upsert(input) {
        // グループ指定時はメンバー確認
        if (input.groupId) {
            const membership = await prisma_1.prisma.userGroup.findUnique({
                where: {
                    userId_groupId: { userId: input.userId, groupId: input.groupId },
                },
            });
            if (!membership) {
                throw new Error('グループのメンバーではありません');
            }
        }
        // findFirstで既存レコードを確認してからcreateまたはupdate
        const existing = await prisma_1.prisma.prediction.findFirst({
            where: {
                userId: input.userId,
                raceId: input.raceId,
                groupId: input.groupId ?? null,
            },
        });
        if (existing) {
            return prisma_1.prisma.prediction.update({
                where: { id: existing.id },
                data: {
                    honmei: input.honmei,
                    taikou: input.taikou,
                    tanana: input.tanana,
                    renka: input.renka,
                    ana: input.ana,
                    comment: input.comment,
                },
            });
        }
        return prisma_1.prisma.prediction.create({
            data: {
                userId: input.userId,
                raceId: input.raceId,
                groupId: input.groupId ?? null,
                honmei: input.honmei,
                taikou: input.taikou,
                tanana: input.tanana,
                renka: input.renka,
                ana: input.ana,
                comment: input.comment,
            },
        });
    }
    /**
     * ユーザーが予想済みかどうかを確認
     * @param userId 対象ユーザーID
     */
    async hasPrediction(userId, raceId, groupId) {
        const prediction = await this.findByUserAndRace(userId, raceId, groupId);
        return !!prediction;
    }
}
exports.PredictionRepository = PredictionRepository;
// シングルトンインスタンス
exports.predictionRepository = new PredictionRepository();
//# sourceMappingURL=PredictionRepository.js.map