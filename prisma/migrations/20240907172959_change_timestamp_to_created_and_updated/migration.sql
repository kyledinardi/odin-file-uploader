/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Folder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "timestamp",
ADD COLUMN     "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
