"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAndSaveRaces = fetchAndSaveRaces;
exports.getRacesByDate = getRacesByDate;
exports.getRaceById = getRaceById;
exports.getRaceByExternalId = getRaceByExternalId;
const client_1 = require("@prisma/client");
const fetchRaceList_1 = require("./fetchRaceList");
const fetchShutuba_1 = require("./fetchShutuba");
const rateLimiter_1 = require("./rateLimiter");
const prisma = new client_1.PrismaClient();
// レース情報をDBに保存（upsert）
async function saveRace(race) {
    const result = await prisma.externalRace.upsert({
        where: { externalId: race.externalId },
        update: {
            raceName: race.raceName,
            postTime: race.postTime,
            distance: race.distance,
            surface: race.surface,
            courseType: race.courseType,
            headCount: race.headCount,
        },
        create: {
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
        },
    });
    return result.id;
}
// 出走馬情報をDBに保存（upsert）
async function saveHorses(raceId, horses) {
    for (const horse of horses) {
        await prisma.externalHorse.upsert({
            where: {
                raceId_number: {
                    raceId,
                    number: horse.number,
                },
            },
            update: {
                name: horse.name,
                jockeyName: horse.jockeyName,
                trainerName: horse.trainerName,
                weight: horse.weight,
                weightDiff: horse.weightDiff,
                age: horse.age,
                sex: horse.sex,
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
            },
        });
    }
}
// 指定日のレース情報を取得してDBに保存
async function fetchAndSaveRaces(date) {
    console.log(`\n=== Fetching races for ${date.toISOString().split('T')[0]} ===\n`);
    let raceCount = 0;
    let horseCount = 0;
    // レース一覧を取得
    const venueRaces = await (0, rateLimiter_1.withRetry)(() => (0, fetchRaceList_1.fetchRaceList)(date));
    for (const venue of venueRaces) {
        console.log(`\nProcessing venue: ${venue.venue} (${venue.races.length} races)`);
        for (const race of venue.races) {
            try {
                // レース情報を保存
                const raceId = await saveRace(race);
                raceCount++;
                // 出馬表を取得
                await (0, rateLimiter_1.delay)(rateLimiter_1.DEFAULT_DELAY); // レート制限
                const horses = await (0, rateLimiter_1.withRetry)(() => (0, fetchShutuba_1.fetchShutuba)(race.externalId));
                // 出走馬を保存
                await saveHorses(raceId, horses);
                horseCount += horses.length;
                console.log(`  ${race.venue} ${race.raceNumber}R: ${race.raceName} - ${horses.length} horses saved`);
            }
            catch (error) {
                console.error(`  Failed to process ${race.venue} ${race.raceNumber}R:`, error);
            }
        }
    }
    console.log(`\n=== Summary ===`);
    console.log(`Venues: ${venueRaces.length}`);
    console.log(`Races: ${raceCount}`);
    console.log(`Horses: ${horseCount}`);
    return {
        venueCount: venueRaces.length,
        raceCount,
        horseCount,
    };
}
// DBからレース一覧を取得
async function getRacesByDate(date) {
    const races = await prisma.externalRace.findMany({
        where: { date },
        include: {
            horses: {
                orderBy: { number: 'asc' },
            },
        },
        orderBy: [
            { venue: 'asc' },
            { raceNumber: 'asc' },
        ],
    });
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
// 個別レースを取得
async function getRaceById(id) {
    return prisma.externalRace.findUnique({
        where: { id },
        include: {
            horses: {
                orderBy: { number: 'asc' },
            },
        },
    });
}
// externalIdでレースを取得
async function getRaceByExternalId(externalId) {
    return prisma.externalRace.findUnique({
        where: { externalId },
        include: {
            horses: {
                orderBy: { number: 'asc' },
            },
        },
    });
}
//# sourceMappingURL=raceService.js.map