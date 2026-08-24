/*
  Warnings:

  - Added the required column `created_by` to the `generated_documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `generated_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "generated_documents" ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "fields_data" JSONB,
ADD COLUMN     "signature_image" TEXT,
ADD COLUMN     "signature_method" TEXT,
ADD COLUMN     "signed_at" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'gerado',
ADD COLUMN     "title" TEXT NOT NULL;
