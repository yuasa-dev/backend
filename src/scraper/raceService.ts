import { PrismaClient } from '@prisma/client';
import { fetchRaceList } from './fetchRaceList';
import { fetchShutuba } from './fetchShutuba';
import { delay, DEFAULT_DELAY, withRetry } from './rateLimiter';
import { ScrapedRace, ScrapedHorse } from './types';

const prisma = new PrismaClient();

// レース情報をDBに保存（upsert）
async function saveRace(race: ScrapedRace): Promise<string> {
  const result = await prisma.externalRace.upsert({
    where: { externalId: race.externalId },
    update: {
      venue: race.venue,
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

// 出走馬情報をDBに保存（馬名で照合して馬番を更新）
async function saveHorses(raceId: string, horses: ScrapedHorse[]): Promise<void> {
  // 既存の馬データを取得
  const existingHorses = await prisma.externalHorse.findMany({
    where: { raceId },
  });

  // 馬名でマップを作成
  const existingByName = new Map(existingHorses.map((h) => [h.name, h]));
  const scrapedNames = new Set(horses.map((h) => h.name));

  for (const horse of horses) {
    const existing = existingByName.get(horse.name);

    if (existing) {
      // 既存の馬を更新（馬番が変わっていても馬名で照合して更新）
      await prisma.externalHorse.update({
        where: { id: existing.id },
        data: {
          number: horse.number,
          jockeyName: horse.jockeyName,
          trainerName: horse.trainerName,
          weight: horse.weight,
          weightDiff: horse.weightDiff,
          age: horse.age,
          sex: horse.sex,
          scratched: false,
        },
      });
    } else {
      // 新しい馬を作成
      await prisma.externalHorse.create({
        data: {
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

  // スクレイピングデータにない馬は出走取消としてマーク
  for (const existing of existingHorses) {
    if (!scrapedNames.has(existing.name)) {
      await prisma.externalHorse.update({
        where: { id: existing.id },
        data: { scratched: true },
      });
    }
  }
}

// 指定日のレース情報を取得してDBに保存（dateはYYYY-MM-DD形式）
export async function fetchAndSaveRaces(date: string): Promise<{
  venueCount: number;
  raceCount: number;
  horseCount: number;
}> {
  console.log(`\n=== Fetching races for ${date} ===\n`);

  let raceCount = 0;
  let horseCount = 0;

  // レース一覧を取得
  const venueRaces = await withRetry(() => fetchRaceList(date));

  for (const venue of venueRaces) {
    console.log(`\nProcessing venue: ${venue.venue} (${venue.races.length} races)`);

    for (const race of venue.races) {
      try {
        // レース情報を保存
        const raceId = await saveRace(race);
        raceCount++;

        // 出馬表を取得
        await delay(DEFAULT_DELAY); // レート制限
        const horses = await withRetry(() => fetchShutuba(race.externalId));

        // 出走馬を保存
        await saveHorses(raceId, horses);
        horseCount += horses.length;

        console.log(`  ${race.venue} ${race.raceNumber}R: ${race.raceName} - ${horses.length} horses saved`);
      } catch (error) {
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
export async function getRacesByDate(date: string) {
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
  const venueMap = new Map<string, typeof races>();
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
export async function getRaceById(id: string) {
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
export async function getRaceByExternalId(externalId: string) {
  return prisma.externalRace.findUnique({
    where: { externalId },
    include: {
      horses: {
        orderBy: { number: 'asc' },
      },
    },
  });
}
