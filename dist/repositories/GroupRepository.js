"use strict";
/**
 * GroupRepository
 *
 * グループ関連のDBアクセスを集約
 * すべてのメソッドでuserIdを必須とし、RLS相当のセキュリティを確保
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupRepository = exports.GroupRepository = void 0;
const prisma_1 = require("../lib/prisma");
class GroupRepository {
    /**
     * ユーザーが所属するグループ一覧を取得
     * @param userId 対象ユーザーID（RLS: 自分の所属グループのみ取得可能）
     */
    async findByUserId(userId) {
        const memberships = await prisma_1.prisma.userGroup.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        _count: { select: { members: true } },
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
        return memberships.map((m) => ({
            id: m.group.id,
            name: m.group.name,
            inviteCode: m.group.inviteCode,
            memberCount: m.group._count.members,
            isOwner: m.group.ownerId === userId,
            joinedAt: m.joinedAt.toISOString(),
        }));
    }
    /**
     * グループを作成し、作成者をメンバーとして追加
     * @param userId 作成者のユーザーID
     */
    async create(userId, input) {
        return prisma_1.prisma.group.create({
            data: {
                name: input.name,
                inviteCode: input.inviteCode,
                ownerId: userId,
                members: {
                    create: { userId },
                },
            },
            include: {
                _count: { select: { members: true } },
            },
        });
    }
    /**
     * 招待コードでグループを検索
     */
    async findByInviteCode(inviteCode) {
        return prisma_1.prisma.group.findUnique({
            where: { inviteCode },
        });
    }
    /**
     * グループIDでグループを取得（メンバー確認付き）
     * @param userId リクエストユーザーID（RLS: メンバーのみ取得可能）
     */
    async findByIdForUser(groupId, userId) {
        const membership = await prisma_1.prisma.userGroup.findUnique({
            where: {
                userId_groupId: { userId, groupId },
            },
            include: {
                group: {
                    include: {
                        owner: { select: { id: true, nickname: true } },
                        _count: { select: { members: true } },
                    },
                },
            },
        });
        if (!membership) {
            return null;
        }
        return {
            ...membership.group,
            isOwner: membership.group.ownerId === userId,
        };
    }
    /**
     * グループのメンバー一覧を取得
     * @param userId リクエストユーザーID（RLS: メンバーのみ取得可能）
     */
    async findMembers(groupId, userId) {
        // まずメンバーか確認
        const isMember = await this.isMember(groupId, userId);
        if (!isMember) {
            return null;
        }
        const members = await prisma_1.prisma.userGroup.findMany({
            where: { groupId },
            include: {
                user: { select: { id: true, nickname: true } },
            },
            orderBy: { joinedAt: 'asc' },
        });
        const group = await prisma_1.prisma.group.findUnique({
            where: { id: groupId },
            select: { ownerId: true },
        });
        return members.map((m) => ({
            id: m.user.id,
            nickname: m.user.nickname,
            isOwner: m.user.id === group?.ownerId,
            joinedAt: m.joinedAt.toISOString(),
        }));
    }
    /**
     * ユーザーがグループのメンバーか確認
     */
    async isMember(groupId, userId) {
        const membership = await prisma_1.prisma.userGroup.findUnique({
            where: {
                userId_groupId: { userId, groupId },
            },
        });
        return !!membership;
    }
    /**
     * グループに参加
     * @param userId 参加するユーザーID
     */
    async join(groupId, userId) {
        return prisma_1.prisma.userGroup.create({
            data: {
                userId,
                groupId,
            },
        });
    }
    /**
     * グループから脱退
     * @param userId 脱退するユーザーID（RLS: 自分自身のみ脱退可能）
     */
    async leave(groupId, userId) {
        const group = await prisma_1.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                _count: { select: { members: true } },
            },
        });
        if (!group) {
            return { success: false, error: 'グループが見つかりません' };
        }
        // オーナーかつ他にメンバーがいる場合は脱退不可
        if (group.ownerId === userId && group._count.members > 1) {
            return { success: false, error: 'オーナーは他のメンバーがいる間は脱退できません' };
        }
        // 最後のメンバーの場合はグループごと削除
        if (group._count.members === 1) {
            await prisma_1.prisma.group.delete({ where: { id: groupId } });
            return { success: true, deleted: true };
        }
        // 通常の脱退
        await prisma_1.prisma.userGroup.delete({
            where: {
                userId_groupId: { userId, groupId },
            },
        });
        return { success: true, deleted: false };
    }
    /**
     * 招待コードの重複チェック
     */
    async isInviteCodeExists(inviteCode) {
        const existing = await prisma_1.prisma.group.findUnique({
            where: { inviteCode },
        });
        return !!existing;
    }
}
exports.GroupRepository = GroupRepository;
// シングルトンインスタンス
exports.groupRepository = new GroupRepository();
//# sourceMappingURL=GroupRepository.js.map