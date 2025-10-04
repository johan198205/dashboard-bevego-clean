-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "metric_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "weight" REAL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupA" TEXT,
    "groupB" TEXT,
    "groupC" TEXT
);

-- CreateIndex
CREATE INDEX "metric_points_period_metric_idx" ON "metric_points"("period", "metric");

-- CreateIndex
CREATE INDEX "metric_points_metric_period_idx" ON "metric_points"("metric", "period");

-- CreateIndex
CREATE INDEX "metric_points_groupA_groupB_groupC_idx" ON "metric_points"("groupA", "groupB", "groupC");
