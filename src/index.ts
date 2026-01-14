/**
 * keibahyo Backend API Server
 *
 * すべてのDBアクセスはRepository層を経由して行います。
 * RLS相当のセキュリティを確保するため、userIdを必須としています。
 */

import express from 'express';
import cors from 'cors';
import {
  userRepository,
  groupRepository,
  raceRepository,
  predictionRepository,
} from './repositories';
import { fetchAndSaveRaces, getRacesByDate, getRaceById } from './scraper';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============================================
// ヘルパー関数
// ============================================

/**
 * トークンからユーザーを取得
 */
async function getUserByToken(token: string | undefined) {
  if (!token) return null;
  return userRepository.findByToken(token);
}

/**
 * ユニークな招待コードを生成
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// ユーザー関連API
// ============================================

// POST /api/users/register - ユーザー登録
app.post('/api/users/register', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const { nickname } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'トークンが必要です' });
    }

    if (!nickname || nickname.trim().length === 0) {
      return res.status(400).json({ error: 'ニックネームを入力してください' });
    }

    if (nickname.length > 20) {
      return res
        .status(400)
        .json({ error: 'ニックネームは20文字以内で入力してください' });
    }

    // 既存ユーザーチェック
    const existingUser = await userRepository.findByToken(token);
    if (existingUser) {
      return res.status(400).json({ error: '既に登録済みです' });
    }

    // ユーザー作成
    const user = await userRepository.create({
      token,
      nickname: nickname.trim(),
    });

    return res.json({
      id: user.id,
      nickname: user.nickname,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

// GET /api/users/me - 自分の情報取得
app.get('/api/users/me', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;

    if (!token) {
      return res.status(400).json({ error: 'トークンが必要です' });
    }

    const user = await userRepository.findByToken(token);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    return res.json({
      id: user.id,
      nickname: user.nickname,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

// PUT /api/users/me - ニックネーム変更
app.put('/api/users/me', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const { nickname } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'トークンが必要です' });
    }

    if (!nickname || nickname.trim().length === 0) {
      return res.status(400).json({ error: 'ニックネームを入力してください' });
    }

    if (nickname.length > 20) {
      return res
        .status(400)
        .json({ error: 'ニックネームは20文字以内で入力してください' });
    }

    const user = await userRepository.findByToken(token);
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // RLS: 自分自身のみ更新可能
    const updatedUser = await userRepository.update(user.id, {
      nickname: nickname.trim(),
    });

    return res.json({
      id: updatedUser.id,
      nickname: updatedUser.nickname,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ニックネームの変更に失敗しました' });
  }
});

// ============================================
// グループ関連API
// ============================================

// GET /api/groups - 所属グループ一覧
app.get('/api/groups', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    // RLS: 自分の所属グループのみ取得可能
    const groups = await groupRepository.findByUserId(user.id);

    return res.json({ groups });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'グループ一覧の取得に失敗しました' });
  }
});

// POST /api/groups - グループ作成
app.post('/api/groups', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'グループ名を入力してください' });
    }

    if (name.length > 30) {
      return res
        .status(400)
        .json({ error: 'グループ名は30文字以内で入力してください' });
    }

    // ユニークな招待コードを生成
    let inviteCode: string;
    let isUnique = false;
    do {
      inviteCode = generateInviteCode();
      isUnique = !(await groupRepository.isInviteCodeExists(inviteCode));
    } while (!isUnique);

    // グループ作成（RLS: 作成者として自分を設定）
    const group = await groupRepository.create(user.id, {
      name: name.trim(),
      inviteCode,
    });

    return res.json({
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      memberCount: group._count.members,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'グループの作成に失敗しました' });
  }
});

// POST /api/groups/join - 招待コードで参加
app.post('/api/groups/join', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { inviteCode } = req.body;

    if (!inviteCode || inviteCode.trim().length === 0) {
      return res.status(400).json({ error: '招待コードを入力してください' });
    }

    const group = await groupRepository.findByInviteCode(
      inviteCode.trim().toUpperCase()
    );

    if (!group) {
      return res.status(404).json({ error: '招待コードが無効です' });
    }

    // 既に参加しているかチェック
    const isMember = await groupRepository.isMember(group.id, user.id);
    if (isMember) {
      return res.status(400).json({ error: '既にこのグループに参加しています' });
    }

    // グループに参加
    await groupRepository.join(group.id, user.id);

    return res.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'グループへの参加に失敗しました' });
  }
});

// GET /api/groups/:id - グループ詳細
app.get('/api/groups/:id', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { id } = req.params;

    // RLS: メンバーのみ取得可能
    const group = await groupRepository.findByIdForUser(id, user.id);

    if (!group) {
      return res
        .status(403)
        .json({ error: 'このグループのメンバーではありません' });
    }

    return res.json({
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      owner: group.owner,
      memberCount: group._count.members,
      isOwner: group.isOwner,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'グループ情報の取得に失敗しました' });
  }
});

// GET /api/groups/:id/members - メンバー一覧
app.get('/api/groups/:id/members', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { id } = req.params;

    // RLS: メンバーのみ取得可能
    const members = await groupRepository.findMembers(id, user.id);

    if (!members) {
      return res
        .status(403)
        .json({ error: 'このグループのメンバーではありません' });
    }

    return res.json({
      members: members.map((m) => ({
        ...m,
        isMe: m.id === user.id,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'メンバー一覧の取得に失敗しました' });
  }
});

// DELETE /api/groups/:id/leave - グループ脱退
app.delete('/api/groups/:id/leave', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { id } = req.params;

    // RLS: 自分自身のみ脱退可能
    const result = await groupRepository.leave(id, user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'グループからの脱退に失敗しました' });
  }
});

// ============================================
// レース関連API
// ============================================

// GET /api/races?date=YYYY-MM-DD - 指定日のレース一覧取得
app.get('/api/races', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      return res
        .status(400)
        .json({ error: '日付を指定してください（YYYY-MM-DD形式）' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: '日付はYYYY-MM-DD形式で指定してください' });
    }

    const venues = await getRacesByDate(date);

    return res.json({
      date,
      venues: venues.map((v) => ({
        venue: v.venue,
        races: v.races.map((r) => ({
          id: r.id,
          externalId: r.externalId,
          raceNumber: r.raceNumber,
          raceName: r.raceName,
          postTime: r.postTime,
          distance: r.distance,
          surface: r.surface,
          headCount: r.headCount,
          status: r.status,
          horseCount: r.horses.length,
        })),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'レース一覧の取得に失敗しました' });
  }
});

// GET /api/races/:id - レース詳細取得
app.get('/api/races/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const race = await getRaceById(id);

    if (!race) {
      return res.status(404).json({ error: 'レースが見つかりません' });
    }

    return res.json({
      id: race.id,
      externalId: race.externalId,
      date: race.date,
      venue: race.venue,
      raceNumber: race.raceNumber,
      raceName: race.raceName,
      postTime: race.postTime,
      distance: race.distance,
      surface: race.surface,
      courseType: race.courseType,
      headCount: race.headCount,
      status: race.status,
      horses: race.horses.map((h) => ({
        id: h.id,
        number: h.number,
        name: h.name,
        jockeyName: h.jockeyName,
        trainerName: h.trainerName,
        weight: h.weight,
        weightDiff: h.weightDiff,
        age: h.age,
        sex: h.sex,
        scratched: h.scratched,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'レース情報の取得に失敗しました' });
  }
});

// POST /api/races/fetch - 指定日のレース情報をスクレイピング
app.post('/api/races/fetch', async (req, res) => {
  try {
    const { date } = req.body;

    if (!date || typeof date !== 'string') {
      return res
        .status(400)
        .json({ error: '日付を指定してください（YYYY-MM-DD形式）' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: '日付はYYYY-MM-DD形式で指定してください' });
    }

    const targetDate = new Date(date);
    const result = await fetchAndSaveRaces(targetDate);

    return res.json({
      success: true,
      date,
      ...result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'レース情報の取得に失敗しました' });
  }
});

// ============================================
// 予想関連API
// ============================================

// GET /api/races/:id/predictions - 予想一覧取得
app.get('/api/races/:id/predictions', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);
    const { id } = req.params;
    const { groupId } = req.query;

    // レース情報取得
    const race = await getRaceById(id);
    if (!race) {
      return res.status(404).json({ error: 'レースが見つかりません' });
    }

    // グループID（nullまたは文字列）
    const groupIdValue =
      groupId && typeof groupId === 'string' ? groupId : null;

    // RLS: グループメンバーまたは個人予想のみ取得可能
    const predictions = await predictionRepository.findByRaceAndGroup(
      user?.id || '',
      id,
      groupIdValue
    );

    // グループ指定時にメンバーでない場合
    if (groupIdValue && predictions === null) {
      return res
        .status(403)
        .json({ error: 'このグループのメンバーではありません' });
    }

    // グループメンバー一覧取得（グループ指定時）
    let members: { id: string; nickname: string }[] = [];
    if (groupIdValue && user) {
      const memberList = await groupRepository.findMembers(
        groupIdValue,
        user.id
      );
      if (memberList) {
        members = memberList.map((m) => ({ id: m.id, nickname: m.nickname }));
      }
    }

    return res.json({
      race: {
        id: race.id,
        externalId: race.externalId,
        date: race.date,
        venue: race.venue,
        raceNumber: race.raceNumber,
        raceName: race.raceName,
        postTime: race.postTime,
        distance: race.distance,
        surface: race.surface,
        status: race.status,
      },
      horses: race.horses
        .filter((h) => !h.scratched)
        .map((h) => ({
          number: h.number,
          name: h.name,
          jockeyName: h.jockeyName,
          scratched: h.scratched,
        })),
      predictions: predictions || [],
      members,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '予想一覧の取得に失敗しました' });
  }
});

// POST /api/races/:id/predictions - 予想登録・更新
app.post('/api/races/:id/predictions', async (req, res) => {
  try {
    const token = req.headers['x-token'] as string | undefined;
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { id } = req.params;
    const { groupId, honmei, taikou, tanana, renka, ana, comment } = req.body;

    // レース存在確認
    const race = await raceRepository.findById(id);
    if (!race) {
      return res.status(404).json({ error: 'レースが見つかりません' });
    }

    // renka, ana を文字列に変換
    const renkaStr =
      Array.isArray(renka) && renka.length > 0
        ? renka.filter((n: number) => typeof n === 'number').join(',')
        : null;
    const anaStr =
      Array.isArray(ana) && ana.length > 0
        ? ana.filter((n: number) => typeof n === 'number').join(',')
        : null;

    // RLS: 自分の予想のみ操作可能（upsertでグループメンバー確認も実施）
    try {
      await predictionRepository.upsert({
        userId: user.id,
        raceId: id,
        groupId: groupId || null,
        honmei: honmei || null,
        taikou: taikou || null,
        tanana: tanana || null,
        renka: renkaStr,
        ana: anaStr,
        comment: comment || null,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('メンバーではありません')) {
        return res
          .status(403)
          .json({ error: 'このグループのメンバーではありません' });
      }
      throw err;
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '予想の登録に失敗しました' });
  }
});

// ============================================
// 後方互換性のためのエイリアス
// ============================================

// /api/external-races/* → /api/races/* へのリダイレクト
app.get('/api/external-races', (req, res) => {
  const { date } = req.query;
  res.redirect(`/api/races?date=${date}`);
});

app.get('/api/external-races/:id', (req, res) => {
  res.redirect(`/api/races/${req.params.id}`);
});

// POSTリダイレクトは307を使用（メソッドを維持）
app.post('/api/external-races/fetch', (req, res) => {
  res.redirect(307, '/api/races/fetch');
});

app.get('/api/external-races/:id/predictions', (req, res) => {
  const { groupId } = req.query;
  const url = groupId
    ? `/api/races/${req.params.id}/predictions?groupId=${groupId}`
    : `/api/races/${req.params.id}/predictions`;
  res.redirect(url);
});

app.post('/api/external-races/:id/predictions', (req, res) => {
  res.redirect(307, `/api/races/${req.params.id}/predictions`);
});

// ============================================
// サーバー起動
// ============================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
