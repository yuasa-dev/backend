/*
  Warnings:

  - You are about to drop the `Horse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewPrediction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Race` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `honmeiId` on the `Prediction` table. All the data in the column will be lost.
  - You are about to drop the column `nickname` on the `Prediction` table. All the data in the column will be lost.
  - You are about to drop the column `renkaId` on the `Prediction` table. All the data in the column will be lost.
  - You are about to drop the column `taikouId` on the `Prediction` table. All the data in the column will be lost.
  - You are about to drop the column `tananaId` on the `Prediction` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `Prediction` table. All the data in the column will be lost.
  - Made the column `userId` on table `Prediction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "NewPrediction_userId_raceId_groupId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Horse";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NewPrediction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Race";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "groupId" TEXT,
    "honmei" INTEGER,
    "taikou" INTEGER,
    "tanana" INTEGER,
    "renka" TEXT,
    "ana" TEXT,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prediction_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "ExternalRace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prediction_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Prediction" ("comment", "createdAt", "id", "raceId", "updatedAt", "userId") SELECT "comment", "createdAt", "id", "raceId", "updatedAt", "userId" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
CREATE UNIQUE INDEX "Prediction_userId_raceId_groupId_key" ON "Prediction"("userId", "raceId", "groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
