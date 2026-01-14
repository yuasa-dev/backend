-- CreateTable
CREATE TABLE "ExternalRace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "raceNumber" INTEGER NOT NULL,
    "raceName" TEXT NOT NULL,
    "postTime" TEXT,
    "distance" INTEGER,
    "surface" TEXT,
    "courseType" TEXT,
    "headCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExternalHorse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raceId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "jockeyName" TEXT,
    "trainerName" TEXT,
    "weight" INTEGER,
    "weightDiff" INTEGER,
    "age" INTEGER,
    "sex" TEXT,
    "scratched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalHorse_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "ExternalRace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRace_externalId_key" ON "ExternalRace"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalHorse_raceId_number_key" ON "ExternalHorse"("raceId", "number");
