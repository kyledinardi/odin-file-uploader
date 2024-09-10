/*
  Warnings:

  - Added the required column `url` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "parentfolderId" INTEGER;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentfolderId_fkey" FOREIGN KEY ("parentfolderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
