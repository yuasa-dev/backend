import * as cheerio from 'cheerio';
import { ScrapedRace, VenueRaces } from './types';

const BASE_URL = 'https://race.netkeiba.com';

// YYYY-MM-DD形式をYYYYMMDD形式に変換
function formatDateParam(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

// 距離とコースタイプを解析（例: "ダ1200m" → { distance: 1200, surface: "ダート" }）
function parseDistanceInfo(text: string): { distance?: number; surface?: string } {
  const match = text.match(/([芝ダ障])(\d+)/);
  if (!match) return {};

  const surfaceMap: Record<string, string> = {
    '芝': '芝',
    'ダ': 'ダート',
    '障': '障害'
  };

  return {
    distance: parseInt(match[2], 10),
    surface: surfaceMap[match[1]] || match[1]
  };
}

// 頭数を解析（例: "16頭" → 16）
function parseHeadCount(text: string): number | undefined {
  const match = text.match(/(\d+)頭/);
  return match ? parseInt(match[1], 10) : undefined;
}

// race_idを抽出（例: "../race/result.html?race_id=202506010401" → "202506010401"）
function extractRaceId(href: string): string | null {
  const match = href.match(/race_id=(\d+)/);
  return match ? match[1] : null;
}

// 指定日のレース一覧を取得（dateはYYYY-MM-DD形式）
export async function fetchRaceList(date: string): Promise<VenueRaces[]> {
  const dateParam = formatDateParam(date);
  const url = `${BASE_URL}/top/race_list_sub.html?kaisai_date=${dateParam}`;

  console.log(`Fetching race list: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; KeibaBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch race list: ${response.status}`);
  }

  // race_list_sub.htmlはUTF-8で配信される
  const html = await response.text();
  const $ = cheerio.load(html);

  const venueRaces: VenueRaces[] = [];

  // 各競馬場のセクションを取得
  // netkeibaのHTMLでは、各競馬場は dl.RaceList_DataList として表示される
  $('dl.RaceList_DataList').each((_, dlElement) => {
    const $dl = $(dlElement);

    // 競馬場名と開催情報を取得
    const $dt = $dl.find('dt');
    const venueText = $dt.find('p').first().text().trim();
    const kaisaiInfo = $dt.find('p').last().text().trim();

    if (!venueText) return;

    const races: ScrapedRace[] = [];

    // 各レースを取得
    $dl.find('dd ul li').each((_, liElement) => {
      const $li = $(liElement);
      const $link = $li.find('a').first();
      const href = $link.attr('href') || '';
      const externalId = extractRaceId(href);

      if (!externalId) return;

      // レース番号
      const raceNumText = $li.find('.Race_Num').text().trim();
      const raceNumber = parseInt(raceNumText.replace(/\D/g, ''), 10);

      // レース名
      const raceName = $li.find('.ItemTitle').text().trim() || `${raceNumber}R`;

      // 発走時刻
      const postTime = $li.find('.RaceList_Itemtime').text().trim() || undefined;

      // 距離情報
      const distanceText = $li.find('.RaceList_ItemLong').text().trim();
      const { distance, surface } = parseDistanceInfo(distanceText);

      // 頭数
      const headCountText = $li.find('.RaceList_ItemCnt').text().trim();
      const headCount = parseHeadCount(headCountText);

      races.push({
        externalId,
        date: date,
        venue: venueText,
        raceNumber,
        raceName,
        postTime,
        distance,
        surface,
        headCount,
      });
    });

    if (races.length > 0) {
      venueRaces.push({
        venue: venueText,
        kaisaiInfo,
        races,
      });
    }
  });

  console.log(`Found ${venueRaces.length} venues with races`);
  return venueRaces;
}
