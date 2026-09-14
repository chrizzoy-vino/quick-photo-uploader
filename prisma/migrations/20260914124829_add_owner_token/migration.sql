/*
  Warnings:

  - Added the required column `ownerToken` to the `MediaItem` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MediaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "albumId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaderName" TEXT NOT NULL,
    "ownerToken" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "displayPath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Bestehende Zeilen (vor Einführung des Lösch-Tokens hochgeladen) bekommen je ein zufälliges
-- Token; ohne das im Browser des ursprünglichen Uploaders gespeicherte Gegenstück sind sie damit
-- nur noch über den Admin-Bereich löschbar, nicht mehr durch den Uploader selbst.
INSERT INTO "new_MediaItem" ("albumId", "createdAt", "displayPath", "filename", "id", "originalPath", "size", "thumbnailPath", "type", "uploaderName", "ownerToken") SELECT "albumId", "createdAt", "displayPath", "filename", "id", "originalPath", "size", "thumbnailPath", "type", "uploaderName", lower(hex(randomblob(16))) FROM "MediaItem";
DROP TABLE "MediaItem";
ALTER TABLE "new_MediaItem" RENAME TO "MediaItem";
CREATE INDEX "MediaItem_albumId_idx" ON "MediaItem"("albumId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
