/**
 * UserRepository
 *
 * ユーザー関連のDBアクセスを集約
 */

import { prisma } from '../lib/prisma';

export interface CreateUserInput {
  token: string;
  nickname: string;
}

export interface UpdateUserInput {
  nickname: string;
}

export class UserRepository {
  /**
   * トークンでユーザーを検索
   */
  async findByToken(token: string) {
    return prisma.user.findUnique({
      where: { token },
    });
  }

  /**
   * IDでユーザーを検索
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * ユーザーを作成
   */
  async create(input: CreateUserInput) {
    return prisma.user.create({
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
  async update(userId: string, input: UpdateUserInput) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        nickname: input.nickname,
      },
    });
  }
}

// シングルトンインスタンス
export const userRepository = new UserRepository();
