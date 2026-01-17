"use strict";
/**
 * keibahyo Backend API Server
 *
 * すべてのDBアクセスはRepository層を経由して行います。
 * RLS相当のセキュリティを確保するため、userIdを必須としています。
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const repositories_1 = require("./repositories");
const scraper_1 = require("./scraper");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ============================================
// レート制限（レース情報更新用）
// ============================================
// 日付ごとの最終更新時刻を保存（メモリ内）
const lastFetchTime = new Map();
const FETCH_RATE_LIMIT_MINUTES = 10;
/**
 * レート制限をチェック
 * @returns null: 制限なし、Date: 次に更新可能な時刻
 */
function checkRateLimit(date) {
    const lastTime = lastFetchTime.get(date);
    if (!lastTime)
        return null;
    const now = new Date();
    const diffMs = now.getTime() - lastTime.getTime();
    const limitMs = FETCH_RATE_LIMIT_MINUTES * 60 * 1000;
    if (diffMs < limitMs) {
        return new Date(lastTime.getTime() + limitMs);
    }
    return null;
}
/**
 * 最終更新時刻を記録
 */
function recordFetchTime(date) {
    lastFetchTime.set(date, new Date());
}
/**
 * 指定日の最終更新時刻を取得
 */
function getLastFetchTime(date) {
    return lastFetchTime.get(date) || null;
}
// ============================================
// ヘルパー関数
// ============================================
/**
 * トークンからユーザーを取得
 */
async function getUserByToken(token) {
    if (!token)
        return null;
    return repositories_1.userRepository.findByToken(token);
}
/**
 * ユニークな招待コードを生成
 */
function generateInviteCode() {
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
        const token = req.headers['x-token'];
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
        const existingUser = await repositories_1.userRepository.findByToken(token);
        if (existingUser) {
            return res.status(400).json({ error: '既に登録済みです' });
        }
        // ユーザー作成
        const user = await repositories_1.userRepository.create({
            token,
            nickname: nickname.trim(),
        });
        return res.json({
            id: user.id,
            nickname: user.nickname,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'ユーザー登録に失敗しました' });
    }
});
// GET /api/users/me - 自分の情報取得
app.get('/api/users/me', async (req, res) => {
    try {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(400).json({ error: 'トークンが必要です' });
        }
        const user = await repositories_1.userRepository.findByToken(token);
        if (!user) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }
        return res.json({
            id: user.id,
            nickname: user.nickname,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
    }
});
// PUT /api/users/me - ニックネーム変更
app.put('/api/users/me', async (req, res) => {
    try {
        const token = req.headers['x-token'];
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
        const user = await repositories_1.userRepository.findByToken(token);
        if (!user) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }
        // RLS: 自分自身のみ更新可能
        const updatedUser = await repositories_1.userRepository.update(user.id, {
            nickname: nickname.trim(),
        });
        return res.json({
            id: updatedUser.id,
            nickname: updatedUser.nickname,
        });
    }
    catch (error) {
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
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        // RLS: 自分の所属グループのみ取得可能
        const groups = await repositories_1.groupRepository.findByUserId(user.id);
        return res.json({ groups });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'グループ一覧の取得に失敗しました' });
    }
});
// POST /api/groups - グループ作成
app.post('/api/groups', async (req, res) => {
    try {
        const token = req.headers['x-token'];
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
        let inviteCode;
        let isUnique = false;
        do {
            inviteCode = generateInviteCode();
            isUnique = !(await repositories_1.groupRepository.isInviteCodeExists(inviteCode));
        } while (!isUnique);
        // グループ作成（RLS: 作成者として自分を設定）
        const group = await repositories_1.groupRepository.create(user.id, {
            name: name.trim(),
            inviteCode,
        });
        return res.json({
            id: group.id,
            name: group.name,
            inviteCode: group.inviteCode,
            memberCount: group._count.members,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'グループの作成に失敗しました' });
    }
});
// POST /api/groups/join - 招待コードで参加
app.post('/api/groups/join', async (req, res) => {
    try {
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        const { inviteCode } = req.body;
        if (!inviteCode || inviteCode.trim().length === 0) {
            return res.status(400).json({ error: '招待コードを入力してください' });
        }
        const group = await repositories_1.groupRepository.findByInviteCode(inviteCode.trim().toUpperCase());
        if (!group) {
            return res.status(404).json({ error: '招待コードが無効です' });
        }
        // 既に参加しているかチェック
        const isMember = await repositories_1.groupRepository.isMember(group.id, user.id);
        if (isMember) {
            return res.status(400).json({ error: '既にこのグループに参加しています' });
        }
        // グループに参加
        await repositories_1.groupRepository.join(group.id, user.id);
        return res.json({
            success: true,
            group: {
                id: group.id,
                name: group.name,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'グループへの参加に失敗しました' });
    }
});
// GET /api/groups/:id - グループ詳細
app.get('/api/groups/:id', async (req, res) => {
    try {
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        const { id } = req.params;
        // RLS: メンバーのみ取得可能
        const group = await repositories_1.groupRepository.findByIdForUser(id, user.id);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'グループ情報の取得に失敗しました' });
    }
});
// GET /api/groups/:id/members - メンバー一覧
app.get('/api/groups/:id/members', async (req, res) => {
    try {
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        const { id } = req.params;
        // RLS: メンバーのみ取得可能
        const members = await repositories_1.groupRepository.findMembers(id, user.id);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'メンバー一覧の取得に失敗しました' });
    }
});
// DELETE /api/groups/:id/leave - グループ脱退
app.delete('/api/groups/:id/leave', async (req, res) => {
    try {
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        const { id } = req.params;
        // RLS: 自分自身のみ脱退可能
        const result = await repositories_1.groupRepository.leave(id, user.id);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        return res.json({ success: true });
    }
    catch (error) {
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
        const venues = await (0, scraper_1.getRacesByDate)(date);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'レース一覧の取得に失敗しました' });
    }
});
// GET /api/races/:id - レース詳細取得
app.get('/api/races/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const race = await (0, scraper_1.getRaceById)(id);
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'レース情報の取得に失敗しました' });
    }
});
// DELETE /api/races/cleanup - 文字化けしたレースを削除
app.delete('/api/races/cleanup', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date || typeof date !== 'string') {
            return res
                .status(400)
                .json({ error: '日付を指定してください（YYYY-MM-DD形式）' });
        }
        // 文字化けしたレースを検出（正常な日本語の会場名パターンにマッチしないもの）
        const validVenuePattern = /^[0-9]+回\s*(中山|東京|阪神|京都|中京|小倉|新潟|福島|札幌|函館)/;
        const races = await repositories_1.raceRepository.findByDate(date);
        const corruptedRaces = races.filter(race => !validVenuePattern.test(race.venue));
        let deletedCount = 0;
        for (const race of corruptedRaces) {
            await repositories_1.raceRepository.delete(race.id);
            deletedCount++;
        }
        return res.json({
            success: true,
            date,
            deletedCount,
            deletedRaces: corruptedRaces.map(r => ({ id: r.id, venue: r.venue, raceName: r.raceName })),
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'レースの削除に失敗しました' });
    }
});
// DELETE /api/races/delete-by-date - 指定日のレースをすべて削除
app.delete('/api/races/delete-by-date', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date || typeof date !== 'string') {
            return res
                .status(400)
                .json({ error: '日付を指定してください（YYYY-MM-DD形式）' });
        }
        const races = await repositories_1.raceRepository.findByDate(date);
        let deletedCount = 0;
        for (const race of races) {
            await repositories_1.raceRepository.delete(race.id);
            deletedCount++;
        }
        return res.json({
            success: true,
            date,
            deletedCount,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'レースの削除に失敗しました' });
    }
});
// GET /api/races/fetch-status?date=YYYY-MM-DD - 更新状態を取得
app.get('/api/races/fetch-status', async (req, res) => {
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
        const lastTime = getLastFetchTime(date);
        const nextAvailable = checkRateLimit(date);
        return res.json({
            date,
            lastFetchTime: lastTime?.toISOString() || null,
            canFetch: !nextAvailable,
            nextAvailableTime: nextAvailable?.toISOString() || null,
            retryAfterSeconds: nextAvailable
                ? Math.ceil((nextAvailable.getTime() - Date.now()) / 1000)
                : 0,
            rateLimitMinutes: FETCH_RATE_LIMIT_MINUTES,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: '更新状態の取得に失敗しました' });
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
        // レート制限チェック
        const nextAvailable = checkRateLimit(date);
        if (nextAvailable) {
            const lastTime = getLastFetchTime(date);
            return res.status(429).json({
                error: `レース情報の更新は${FETCH_RATE_LIMIT_MINUTES}分に1回までです`,
                lastFetchTime: lastTime?.toISOString(),
                nextAvailableTime: nextAvailable.toISOString(),
                retryAfterSeconds: Math.ceil((nextAvailable.getTime() - Date.now()) / 1000),
            });
        }
        const result = await (0, scraper_1.fetchAndSaveRaces)(date);
        // 最終更新時刻を記録
        recordFetchTime(date);
        const lastTime = getLastFetchTime(date);
        return res.json({
            success: true,
            date,
            ...result,
            lastFetchTime: lastTime?.toISOString(),
        });
    }
    catch (error) {
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
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        const { id } = req.params;
        const { groupId } = req.query;
        // レース情報取得
        const race = await (0, scraper_1.getRaceById)(id);
        if (!race) {
            return res.status(404).json({ error: 'レースが見つかりません' });
        }
        // グループID（nullまたは文字列）
        const groupIdValue = groupId && typeof groupId === 'string' ? groupId : null;
        // RLS: グループメンバーまたは個人予想のみ取得可能
        const predictions = await repositories_1.predictionRepository.findByRaceAndGroup(user?.id || '', id, groupIdValue);
        // グループ指定時にメンバーでない場合
        if (groupIdValue && predictions === null) {
            return res
                .status(403)
                .json({ error: 'このグループのメンバーではありません' });
        }
        // グループメンバー一覧取得（グループ指定時）
        let members = [];
        if (groupIdValue && user) {
            const memberList = await repositories_1.groupRepository.findMembers(groupIdValue, user.id);
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
                id: h.id, // 馬ID（予想の紐づけに使用）
                number: h.number,
                name: h.name,
                jockeyName: h.jockeyName,
                scratched: h.scratched,
            })),
            predictions: predictions || [],
            members,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: '予想一覧の取得に失敗しました' });
    }
});
// POST /api/races/:id/predictions - 予想登録・更新
app.post('/api/races/:id/predictions', async (req, res) => {
    try {
        const token = req.headers['x-token'];
        const user = await getUserByToken(token);
        if (!user) {
            return res.status(401).json({ error: '認証が必要です' });
        }
        const { id } = req.params;
        const { groupId, honmei, taikou, tanana, renka, ana, jiku, osae, comment } = req.body;
        // デバッグ: リクエストボディの内容を確認
        console.log('=== Prediction Save Debug ===');
        console.log('jiku:', jiku, 'type:', typeof jiku, 'isArray:', Array.isArray(jiku));
        console.log('osae:', osae, 'type:', typeof osae, 'isArray:', Array.isArray(osae));
        console.log('renka:', renka, 'type:', typeof renka, 'isArray:', Array.isArray(renka));
        // レース存在確認
        const race = await repositories_1.raceRepository.findById(id);
        if (!race) {
            return res.status(404).json({ error: 'レースが見つかりません' });
        }
        // renka, ana, jiku, osae を文字列に変換
        const renkaStr = Array.isArray(renka) && renka.length > 0
            ? renka.filter((n) => typeof n === 'number').join(',')
            : null;
        const anaStr = Array.isArray(ana) && ana.length > 0
            ? ana.filter((n) => typeof n === 'number').join(',')
            : null;
        const jikuStr = Array.isArray(jiku) && jiku.length > 0
            ? jiku.filter((n) => typeof n === 'number').join(',')
            : null;
        const osaeStr = Array.isArray(osae) && osae.length > 0
            ? osae.filter((n) => typeof n === 'number').join(',')
            : null;
        // RLS: 自分の予想のみ操作可能（upsertでグループメンバー確認も実施）
        try {
            await repositories_1.predictionRepository.upsert({
                userId: user.id,
                raceId: id,
                groupId: groupId || null,
                honmei: honmei || null,
                taikou: taikou || null,
                tanana: tanana || null,
                renka: renkaStr,
                ana: anaStr,
                jiku: jikuStr,
                osae: osaeStr,
                comment: comment || null,
            });
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('メンバーではありません')) {
                return res
                    .status(403)
                    .json({ error: 'このグループのメンバーではありません' });
            }
            throw err;
        }
        return res.json({ success: true });
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map