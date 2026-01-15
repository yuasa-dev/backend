"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchShutuba = fetchShutuba;
const cheerio = __importStar(require("cheerio"));
const iconv = __importStar(require("iconv-lite"));
const BASE_URL = 'https://race.netkeiba.com';
// 馬体重を解析（例: "456(-2)" → { weight: 456, weightDiff: -2 }）
function parseWeight(text) {
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
function parseAgeSex(text) {
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
async function fetchShutuba(raceId) {
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
    const horses = [];
    // 出馬表テーブルの各行を取得（.HorseListクラスを持つ行）
    $('.HorseList').each((_, row) => {
        const $row = $(row);
        // 馬名を取得（馬名がなければスキップ）
        const horseName = $row.find('.HorseName a').first().text().trim();
        if (!horseName)
            return;
        // 馬番を取得
        // 1. まずtd.Umabanのテキストから取得を試みる
        const umabanTd = $row.find('td[class*="Umaban"]');
        let number = parseInt(umabanTd.text().trim(), 10);
        // 2. 馬番が空の場合（枠順未確定時）はtr要素のid属性から取得
        // 例: id="tr_14" → 馬番14
        if (isNaN(number)) {
            const trId = $row.attr('id');
            if (trId) {
                const idMatch = trId.match(/tr_(\d+)/);
                if (idMatch) {
                    number = parseInt(idMatch[1], 10);
                }
            }
        }
        // それでも馬番が取得できない場合はスキップ
        if (isNaN(number))
            return;
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
//# sourceMappingURL=fetchShutuba.js.map