/**
 * 予想データマイグレーションスクリプト
 *
 * 馬番ベースの予想データを馬IDベースに変換します。
 *
 * 使用方法:
 *   npx ts-node scripts/migrate-predictions-to-horse-id.ts
 *
 * 注意: このスクリプトは一度だけ実行してください。
 *       本番環境で実行する前に、バックアップを取ってください。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePredictions() {
  console.log('=== 予想データマイグレーション開始 ===\n');

  // すべての予想を取得
  const predictions = await prisma.prediction.findMany({
    include: {
      race: {
        include: {
          horses: true,
        },
      },
    },
  });

  console.log(`対象予想数: ${predictions.length}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const prediction of predictions) {
    try {
      const horses = prediction.race.horses;

      // 馬番→馬IDのマップを作成
      const numberToId = new Map(horses.map((h) => [h.number, h.id]));

      // 単勝系の印を変換
      const honmeiId = prediction.honmei !== null ? numberToId.get(prediction.honmei) : null;
      const taikouId = prediction.taikou !== null ? numberToId.get(prediction.taikou) : null;
      const tananaId = prediction.tanana !== null ? numberToId.get(prediction.tanana) : null;

      // 複数馬の印を変換
      const convertList = (str: string | null): string | null => {
        if (!str) return null;
        const numbers = str.split(',').map(Number).filter((n) => !isNaN(n));
        const ids = numbers.map((n) => numberToId.get(n)).filter((id) => id !== undefined);
        return ids.length > 0 ? ids.join(',') : null;
      };

      const renkaIds = convertList(prediction.renka);
      const anaIds = convertList(prediction.ana);
      const jikuIds = convertList(prediction.jiku);
      const osaeIds = convertList(prediction.osae);

      // 変換できなかった馬番がある場合はスキップ
      const hasInvalidHonmei = prediction.honmei !== null && honmeiId === undefined;
      const hasInvalidTaikou = prediction.taikou !== null && taikouId === undefined;
      const hasInvalidTanana = prediction.tanana !== null && tananaId === undefined;

      if (hasInvalidHonmei || hasInvalidTaikou || hasInvalidTanana) {
        console.log(`スキップ: Prediction ${prediction.id} - 無効な馬番あり`);
        skipCount++;
        continue;
      }

      // 予想を更新
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          honmei: honmeiId ?? null,
          taikou: taikouId ?? null,
          tanana: tananaId ?? null,
          renka: renkaIds,
          ana: anaIds,
          jiku: jikuIds,
          osae: osaeIds,
        },
      });

      successCount++;

      if (successCount % 100 === 0) {
        console.log(`処理済み: ${successCount}/${predictions.length}`);
      }
    } catch (error) {
      console.error(`エラー: Prediction ${prediction.id}`, error);
      errorCount++;
    }
  }

  console.log('\n=== マイグレーション完了 ===');
  console.log(`成功: ${successCount}`);
  console.log(`スキップ: ${skipCount}`);
  console.log(`エラー: ${errorCount}`);
}

migratePredictions()
  .catch((error) => {
    console.error('マイグレーション失敗:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
