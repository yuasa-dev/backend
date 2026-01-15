#!/usr/bin/env ts-node
"use strict";
/**
 * レース情報取得バッチスクリプト
 *
 * 使用方法:
 *   npx ts-node src/scripts/fetchRaces.ts [日付]
 *
 * 例:
 *   npx ts-node src/scripts/fetchRaces.ts              # 今日のレースを取得
 *   npx ts-node src/scripts/fetchRaces.ts 2025-01-12   # 指定日のレースを取得
 *   npx ts-node src/scripts/fetchRaces.ts +1           # 明日のレースを取得
 *   npx ts-node src/scripts/fetchRaces.ts +7           # 1週間後のレースを取得
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scraper_1 = require("../scraper");
// Dateオブジェクトを日本時間のYYYY-MM-DD文字列に変換
function formatDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
async function main() {
    const arg = process.argv[2];
    let dateStr;
    if (!arg) {
        // 引数なしの場合は今日
        dateStr = formatDateStr(new Date());
    }
    else if (arg.startsWith('+') || arg.startsWith('-')) {
        // 相対日付（+1, -1など）
        const days = parseInt(arg, 10);
        const date = new Date();
        date.setDate(date.getDate() + days);
        dateStr = formatDateStr(date);
    }
    else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
        // YYYY-MM-DD形式 - そのまま使用
        dateStr = arg;
    }
    else {
        console.error('無効な日付形式です。YYYY-MM-DD形式または+/-Nで指定してください');
        process.exit(1);
    }
    console.log(`対象日: ${dateStr}`);
    try {
        const result = await (0, scraper_1.fetchAndSaveRaces)(dateStr);
        console.log('\n✅ 完了');
        console.log(`  競馬場数: ${result.venueCount}`);
        console.log(`  レース数: ${result.raceCount}`);
        console.log(`  出走馬数: ${result.horseCount}`);
    }
    catch (error) {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    }
    process.exit(0);
}
main();
//# sourceMappingURL=fetchRaces.js.map