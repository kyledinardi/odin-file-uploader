/*
  Warnings:

  - Made the column `shareExpires` on table `Folder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "shareUrl" TEXT,
ALTER COLUMN "shareExpires" SET NOT NULL,
ALTER COLUMN "shareExpires" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shareExpires" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "shareUrl" TEXT;
