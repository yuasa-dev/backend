import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import { ScrapedHorse } from './types';

const BASE_URL = 'https://race.netkeiba.com';

// 馬体重を解析（例: "456(-2)" → { weight: 456, weightDiff: -2 }）
function parseWeight(text: string): { weight?: number; weightDiff?: number } {
  const match = text.match(/(\d+)\s*\(([+-]?\d+)\)/);
  if (match) {
    return {
      weight: parseInt(match[1], 10),
      weightDiff: parseInt(match[2], 10),
    };
  }

  // 増減なしの場合
  const simpleMatch = text.match(/(\d+)/);
  if (simpleMatch) {
    return { weight: parseInt(simpleMatch[1], 10) };
  }

  return {};
}

// 馬齢・性別を解析（例: "牡3" → { age: 3, sex: "牡" }）
function parseAgeSex(text: string): { age?: number; sex?: string } {
  const match = text.match(/([牡牝セ騸])(\d+)/);
  if (match) {
    return {
      sex: match[1],
      age: parseInt(match[2], 10),
    };
  }
  return {};
}

// 出馬表を取得
export async function fetchShutuba(raceId: string): Promise<ScrapedHorse[]> {
  const url = `${BASE_URL}/race/shutuba.html?race_id=${raceId}`;

  console.log(`Fetching shutuba: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KeibaBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch shutuba: ${response.status}`);
  }

  // EUC-JP からUTF-8に変換
  const buffer = await response.arrayBuffer();
  const html = iconv.decode(Buffer.from(buffer), 'EUC-JP');
  const $ = cheerio.load(html);

  const horses: ScrapedHorse[] = [];

  // 出馬表テーブルの各行を取得（.HorseListクラスを持つ行）
  $('.HorseList').each((_, row) => {
    const $row = $(row);

    // 馬番を取得（Umaban + 数字のクラス形式: Umaban1, Umaban2...）
    const umabanTd = $row.find('td[class*="Umaban"]');
    const number = parseInt(umabanTd.text().trim(), 10);

    if (isNaN(number)) return; // ヘッダー行などをスキップ

    // 馬名を取得
    const horseName = $row.find('.HorseName a').first().text().trim();

    if (!horseName) return;

    // 騎手名を取得
    const jockeyName = $row.find('.Jockey a').first().text().trim() || undefined;

    // 調教師名を取得
    const trainerName = $row.find('.Trainer a').first().text().trim() || undefined;

    // 馬体重を取得
    const weightText = $row.find('.Weight').text().trim();
    const { weight, weightDiff } = parseWeight(weightText);

    // 馬齢・性別を取得
    const ageSexText = $row.find('.Barei').text().trim();
    const { age, sex } = parseAgeSex(ageSexText);

    horses.push({
      number,
      name: horseName,
      jockeyName,
      trainerName,
      weight,
      weightDiff,
      age,
      sex,
    });
  });

  // 馬番順にソート
  horses.sort((a, b) => a.number - b.number);

  console.log(`Found ${horses.length} horses for race ${raceId}`);
  return horses;
}
