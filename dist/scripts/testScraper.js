#!/usr/bin/env ts-node
"use strict";
/**
 * スクレイパーのテストスクリプト
 * レース一覧の取得のみをテスト（DBには保存しない）
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fetchRaceList_1 = require("../scraper/fetchRaceList");
async function main() {
    const dateStr = process.argv[2] || '2025-01-12'; // デフォルトは開催日がある日付
    console.log(`テスト日付: ${dateStr}`);
    try {
        const venues = await (0, fetchRaceList_1.fetchRaceList)(dateStr);
        console.log('\n=== 結果 ===');
        console.log(`競馬場数: ${venues.length}`);
        for (const venue of venues) {
            console.log(`\n[${venue.venue}] ${venue.kaisaiInfo}`);
            for (const race of venue.races) {
                console.log(`  ${race.raceNumber}R: ${race.raceName} (${race.postTime || '時刻不明'}) - ${race.surface || '?'}${race.distance || '?'}m ${race.headCount || '?'}頭`);
                console.log(`      race_id: ${race.externalId}`);
            }
        }
    }
    catch (error) {
        console.error('エラー:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=testScraper.js.map