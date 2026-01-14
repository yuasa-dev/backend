-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT,
    "nickname" TEXT NOT NULL,
    "honmeiId" INTEGER NOT NULL,
    "taikouId" INTEGER NOT NULL,
    "tananaId" INTEGER NOT NULL,
    "renkaId" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prediction_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prediction_honmeiId_fkey" FOREIGN KEY ("honmeiId") REFERENCES "Horse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_taikouId_fkey" FOREIGN KEY ("taikouId") REFERENCES "Horse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_tananaId_fkey" FOREIGN KEY ("tananaId") REFERENCES "Horse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_renkaId_fkey" FOREIGN KEY ("renkaId") REFERENCES "Horse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prediction" ("comment", "createdAt", "honmeiId", "id", "nickname", "raceId", "renkaId", "taikouId", "tananaId", "token", "updatedAt") SELECT "comment", "createdAt", "honmeiId", "id", "nickname", "raceId", "renkaId", "taikouId", "tananaId", "token", "updatedAt" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
CREATE UNIQUE INDEX "Prediction_raceId_token_key" ON "Prediction"("raceId", "token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_token_key" ON "User"("token");
