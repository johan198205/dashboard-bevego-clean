/*
  Warnings:

  - Added the required column `periodId` to the `metric_points` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_metric_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "weight" REAL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupA" TEXT,
    "groupB" TEXT,
    "groupC" TEXT,
    "periodId" TEXT NOT NULL,
    "periodStart" DATETIME,
    "periodEnd" DATETIME,
    "ingestionBatchId" TEXT,
    "superseded" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_metric_points" ("createdAt", "groupA", "groupB", "groupC", "id", "metric", "period", "source", "value", "weight", "periodId", "superseded") 
SELECT "createdAt", "groupA", "groupB", "groupC", "id", "metric", "period", "source", "value", "weight", "period", false FROM "metric_points";
DROP TABLE "metric_points";
ALTER TABLE "new_metric_points" RENAME TO "metric_points";
CREATE INDEX "metric_points_period_metric_idx" ON "metric_points"("period", "metric");
CREATE INDEX "metric_points_metric_period_idx" ON "metric_points"("metric", "period");
CREATE INDEX "metric_points_groupA_groupB_groupC_idx" ON "metric_points"("groupA", "groupB", "groupC");
CREATE INDEX "metric_points_periodId_metric_source_idx" ON "metric_points"("periodId", "metric", "source");
CREATE INDEX "metric_points_periodId_superseded_idx" ON "metric_points"("periodId", "superseded");
CREATE UNIQUE INDEX "metric_points_periodId_metric_source_groupA_groupB_groupC_key" ON "metric_points"("periodId", "metric", "source", "groupA", "groupB", "groupC");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
