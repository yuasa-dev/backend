/**
 * postinstall スクリプト
 *
 * npm install 後に実行され、DATABASE_URL が設定されている場合のみ
 * Prisma Client を生成します。
 *
 * CI/CD 環境では DATABASE_URL がビルド時に設定されていない場合があるため、
 * その場合はスキップして build スクリプトで処理します。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// .env ファイルがあれば読み込み
try {
  require('dotenv').config();
} catch (e) {
  // dotenv がない場合は無視
}

const databaseUrl = process.env.DATABASE_URL;
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!databaseUrl) {
  console.log('postinstall: DATABASE_URL not set, skipping Prisma generation.');
  console.log('postinstall: Run "npm run build" to generate Prisma Client.');
  process.exit(0);
}

// schema.prisma が存在しない場合は生成をスキップ
// （build スクリプトで db:generate-schema が実行される）
if (!fs.existsSync(schemaPath)) {
  console.log('postinstall: schema.prisma not found, skipping.');
  console.log('postinstall: Run "npm run build" to generate schema and Prisma Client.');
  process.exit(0);
}

try {
  console.log('postinstall: Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('postinstall: Prisma Client generated successfully.');
} catch (error) {
  console.error('postinstall: Failed to generate Prisma Client.');
  console.error('postinstall: This is not fatal - run "npm run build" to retry.');
  process.exit(0); // エラーでも終了コード0（インストールを止めない）
}
