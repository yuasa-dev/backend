"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// POST /api/races - レース作成
app.post("/api/races", async (req, res) => {
    try {
        const { name, date, venue, raceNumber, horses } = req.body;
        if (!name || !date || !venue || !raceNumber || !horses || horses.length === 0) {
            return res.status(400).json({ error: "必須項目が不足しています" });
        }
        const race = await prisma.race.create({
            data: {
                name,
                date,
                venue,
                raceNumber,
                horses: {
                    create: horses.map((h) => ({
                        number: h.number,
                        name: h.name,
                    })),
                },
            },
        });
        return res.json({ id: race.id, url: `/race/${race.id}` });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "レース作成に失敗しました" });
    }
});
// GET /api/races/:id - レース情報取得
app.get("/api/races/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers["x-token"];
        const race = await prisma.race.findUnique({
            where: { id },
            include: {
                horses: {
                    orderBy: { number: "asc" },
                },
                predictions: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        honmei: true,
                        taikou: true,
                        tanana: true,
                        renka: true,
                    },
                },
            },
        });
        if (!race) {
            return res.status(404).json({ error: "レースが見つかりません" });
        }
        const predictions = race.predictions.map((p) => ({
            nickname: p.nickname,
            honmei: { number: p.honmei.number, name: p.honmei.name },
            taikou: { number: p.taikou.number, name: p.taikou.name },
            tanana: { number: p.tanana.number, name: p.tanana.name },
            renka: { number: p.renka.number, name: p.renka.name },
            comment: p.comment,
            isMine: token ? p.token === token : false,
        }));
        return res.json({
            id: race.id,
            name: race.name,
            date: race.date,
            venue: race.venue,
            raceNumber: race.raceNumber,
            horses: race.horses.map((h) => ({ id: h.id, number: h.number, name: h.name })),
            predictions,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "レース情報の取得に失敗しました" });
    }
});
// POST /api/races/:id/predictions - 予想登録・更新
app.post("/api/races/:id/predictions", async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers["x-token"];
        const { nickname, honmeiId, taikouId, tananaId, renkaId, comment } = req.body;
        if (!token) {
            return res.status(400).json({ error: "トークンが必要です" });
        }
        if (!nickname || !honmeiId || !taikouId || !tananaId || !renkaId) {
            return res.status(400).json({ error: "必須項目が不足しています" });
        }
        // レースの存在確認
        const race = await prisma.race.findUnique({ where: { id } });
        if (!race) {
            return res.status(404).json({ error: "レースが見つかりません" });
        }
        // 既存の予想を確認
        const existing = await prisma.prediction.findUnique({
            where: { raceId_token: { raceId: id, token } },
        });
        if (existing) {
            // 更新
            await prisma.prediction.update({
                where: { id: existing.id },
                data: {
                    nickname,
                    honmeiId,
                    taikouId,
                    tananaId,
                    renkaId,
                    comment: comment || null,
                },
            });
        }
        else {
            // 新規作成
            await prisma.prediction.create({
                data: {
                    raceId: id,
                    token,
                    nickname,
                    honmeiId,
                    taikouId,
                    tananaId,
                    renkaId,
                    comment: comment || null,
                },
            });
        }
        return res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "予想の登録に失敗しました" });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map