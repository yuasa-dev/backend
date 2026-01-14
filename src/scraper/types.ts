// スクレイピングで取得するデータの型定義

export interface ScrapedRace {
  externalId: string;      // netkeibaのrace_id
  date: string;            // YYYY-MM-DD
  venue: string;           // 競馬場名
  raceNumber: number;      // 1-12
  raceName: string;        // レース名
  postTime?: string;       // 発走時刻 HH:MM
  distance?: number;       // 距離(m)
  surface?: string;        // 芝/ダート
  courseType?: string;     // 右/左/直線
  headCount?: number;      // 出走頭数
}

export interface ScrapedHorse {
  number: number;          // 馬番
  name: string;            // 馬名
  jockeyName?: string;     // 騎手名
  trainerName?: string;    // 調教師名
  weight?: number;         // 馬体重
  weightDiff?: number;     // 馬体重増減
  age?: number;            // 馬齢
  sex?: string;            // 性別
}

export interface VenueRaces {
  venue: string;           // 競馬場名
  kaisaiInfo: string;      // 開催情報（例: 1回4日目）
  races: ScrapedRace[];
}
