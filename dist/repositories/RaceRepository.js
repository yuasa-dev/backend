"use strict";
/**
 * RaceRepository
 *
 * レース関連のDBアクセスを集約
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.raceRepository = exports.RaceRepository = void 0;
const prisma_1 = require("../lib/prisma");
class RaceRepository {
    /**
     * 指定日のレース一覧を取得
     */
    async findByDate(date) {
        return prisma_1.prisma.externalRace.findMany({
            where: { date },
            include: {
                horses: {
                    orderBy: { number: 'asc' },
                },
            },
            orderBy: [{ venue: 'asc' }, { raceNumber: 'asc' }],
        });
    }
    /**
     * 競馬場ごとにグループ化したレース一覧を取得
     */
    async findByDateGroupedByVenue(date) {
        const races = await this.findByDate(date);
        // 競馬場ごとにグループ化
        const venueMap = new Map();
        for (const race of races) {
            const existing = venueMap.get(race.venue) || [];
            existing.push(race);
            venueMap.set(race.venue, existing);
        }
        return Array.from(venueMap.entries()).map(([venue, races]) => ({
            venue,
            races,
        }));
    }
    /**
     * IDでレースを取得（馬情報含む）
     */
    async findById(id) {
        return prisma_1.prisma.externalRace.findUnique({
            where: { id },
            include: {
                horses: {
                    orderBy: { number: 'asc' },
                },
            },
        });
    }
    /**
     * 外部IDでレースを取得
     */
    async findByExternalId(externalId) {
        return prisma_1.prisma.externalRace.findUnique({
            where: { externalId },
        });
    }
    /**
     * レースを作成（馬情報含む）
     */
    async create(input, horses) {
        return prisma_1.prisma.externalRace.create({
            data: {
                externalId: input.externalId,
                date: input.date,
                venue: input.venue,
                raceNumber: input.raceNumber,
                raceName: input.raceName,
                postTime: input.postTime,
                distance: input.distance,
                surface: input.surface,
                courseType: input.courseType,
                headCount: input.headCount,
                status: input.status || 'scheduled',
                horses: {
                    create: horses.map((h) => ({
                        number: h.number,
                        name: h.name,
                        jockeyName: h.jockeyName,
                        trainerName: h.trainerName,
                        weight: h.weight,
                        weightDiff: h.weightDiff,
                        age: h.age,
                        sex: h.sex,
                        scratched: h.scratched || false,
                    })),
                },
            },
            include: {
                horses: true,
            },
        });
    }
    /**
     * レースを更新
     */
    async update(id, input) {
        return prisma_1.prisma.externalRace.update({
            where: { id },
            data: input,
        });
    }
    /**
     * レースを削除（関連する馬情報も削除）
     */
    async delete(id) {
        // 先に馬情報を削除
        await prisma_1.prisma.externalHorse.deleteMany({
            where: { raceId: id },
        });
        // 予想も削除
        await prisma_1.prisma.prediction.deleteMany({
            where: { raceId: id },
        });
        // レースを削除
        return prisma_1.prisma.externalRace.delete({
            where: { id },
        });
    }
    /**
     * 馬情報を更新（upsert）
     */
    async upsertHorses(raceId, horses) {
        const operations = horses.map((horse) => prisma_1.prisma.externalHorse.upsert({
            where: {
                raceId_number: { raceId, number: horse.number },
            },
            create: {
                raceId,
                number: horse.number,
                name: horse.name,
                jockeyName: horse.jockeyName,
                trainerName: horse.trainerName,
                weight: horse.weight,
                weightDiff: horse.weightDiff,
                age: horse.age,
                sex: horse.sex,
                scratched: horse.scratched || false,
            },
            update: {
                name: horse.name,
                jockeyName: horse.jockeyName,
                trainerName: horse.trainerName,
                weight: horse.weight,
                weightDiff: horse.weightDiff,
                age: horse.age,
                sex: horse.sex,
                scratched: horse.scratched || false,
            },
        }));
        return prisma_1.prisma.$transaction(operations);
    }
}
exports.RaceRepository = RaceRepository;
// シングルトンインスタンス
exports.raceRepository = new RaceRepository();
//# sourceMappingURL=RaceRepository.js.map