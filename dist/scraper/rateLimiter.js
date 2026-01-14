"use strict";
// レート制限用のユーティリティ
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DELAY = exports.delay = void 0;
exports.withRetry = withRetry;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.delay = delay;
// デフォルトの待機時間（ミリ秒）
exports.DEFAULT_DELAY = 2000;
// リトライ用の指数バックオフ
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
            if (attempt < maxRetries - 1) {
                const waitTime = baseDelay * Math.pow(2, attempt);
                console.log(`Waiting ${waitTime}ms before retry...`);
                await (0, exports.delay)(waitTime);
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=rateLimiter.js.map