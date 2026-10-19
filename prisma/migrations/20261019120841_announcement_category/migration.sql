-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "audience" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME NOT NULL,
    "author" TEXT NOT NULL
);
INSERT INTO "new_Announcement" ("audience", "author", "body", "id", "pinned", "publishedAt", "title") SELECT "audience", "author", "body", "id", "pinned", "publishedAt", "title" FROM "Announcement";
DROP TABLE "Announcement";
ALTER TABLE "new_Announcement" RENAME TO "Announcement";
CREATE INDEX "Announcement_category_idx" ON "Announcement"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
