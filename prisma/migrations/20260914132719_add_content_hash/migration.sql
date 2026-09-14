-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
-- SQLite treats each NULL as distinct in a unique index, so existing rows (contentHash = NULL,
-- uploaded before this migration) never collide with each other here.
CREATE UNIQUE INDEX "MediaItem_albumId_contentHash_key" ON "MediaItem"("albumId", "contentHash");
