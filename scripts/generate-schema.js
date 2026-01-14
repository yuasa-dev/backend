/**
 * Prismaスキーマ生成スクリプト (JavaScript版)
 *
 * 環境変数 DATABASE_URL からプロバイダーを判定し、
 * schema.base.prisma から schema.prisma を生成します。
 *
 * 使用方法:
 *   node scripts/generate-schema.js
 */

const fs = require('fs');
const path = require('path');

// .env ファイルを読み込み（存在する場合）
try {
  require('dotenv').config();
} catch (e) {
  // dotenv がない場合は環境変数から直接取得
}

const PRISMA_DIR = path.join(__dirname, '..', 'prisma');
const BASE_SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.base.prisma');
const OUTPUT_SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma');

function detectProvider(databaseUrl) {
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return 'postgresql';
  }
  if (databaseUrl.startsWith('file:') || databaseUrl.startsWith('sqlite:')) {
    return 'sqlite';
  }
  throw new Error(`Unsupported DATABASE_URL format: ${databaseUrl}`);
}

function generateDatasourceBlock(provider) {
  return `datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}`;
}

function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Please set DATABASE_URL in .env file or environment.');
    console.error('');
    console.error('Examples:');
    console.error('  SQLite:     DATABASE_URL="file:./dev.db"');
    console.error('  PostgreSQL: DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
    process.exit(1);
  }

  const provider = detectProvider(databaseUrl);
  console.log(`Detected database provider: ${provider}`);

  // ベーススキーマを読み込み
  if (!fs.existsSync(BASE_SCHEMA_PATH)) {
    console.error(`Error: Base schema not found at ${BASE_SCHEMA_PATH}`);
    process.exit(1);
  }

  const baseSchema = fs.readFileSync(BASE_SCHEMA_PATH, 'utf-8');

  // プレースホルダーをdatasourceブロックに置換
  const datasourceBlock = generateDatasourceBlock(provider);
  const outputSchema = baseSchema.replace(
    '// __DATASOURCE_PLACEHOLDER__',
    datasourceBlock
  );

  // schema.prisma を出力
  fs.writeFileSync(OUTPUT_SCHEMA_PATH, outputSchema);
  console.log(`Generated schema.prisma with provider: ${provider}`);
  console.log(`Output: ${OUTPUT_SCHEMA_PATH}`);
}

main();
