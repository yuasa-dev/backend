"use strict";
/**
 * UserRepository
 *
 * ユーザー関連のDBアクセスを集約
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const prisma_1 = require("../lib/prisma");
class UserRepository {
    /**
     * トークンでユーザーを検索
     */
    async findByToken(token) {
        return prisma_1.prisma.user.findUnique({
            where: { token },
        });
    }
    /**
     * IDでユーザーを検索
     */
    async findById(id) {
        return prisma_1.prisma.user.findUnique({
            where: { id },
        });
    }
    /**
     * ユーザーを作成
     */
    async create(input) {
        return prisma_1.prisma.user.create({
            data: {
                token: input.token,
                nickname: input.nickname,
            },
        });
    }
    /**
     * ユーザーを更新
     * @param userId 更新対象のユーザーID（RLS: 自分自身のみ更新可能）
     */
    async update(userId, input) {
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                nickname: input.nickname,
            },
        });
    }
}
exports.UserRepository = UserRepository;
// シングルトンインスタンス
exports.userRepository = new UserRepository();
//# sourceMappingURL=UserRepository.js.map