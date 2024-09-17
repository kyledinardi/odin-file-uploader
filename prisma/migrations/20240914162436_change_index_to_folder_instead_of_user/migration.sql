/*
  Warnings:

  - You are about to drop the column `shareExpires` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `shareUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "isIndex" BOOLEAN;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "shareExpires",
DROP COLUMN "shareUrl";
