/*
  Warnings:

  - You are about to drop the column `file_type` on the `evidence` table. All the data in the column will be lost.
  - You are about to drop the column `file_url` on the `evidence` table. All the data in the column will be lost.
  - You are about to drop the column `uploaded_by` on the `evidence` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mobile_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `file_name` to the `evidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_size_bytes` to the `evidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `media_category` to the `evidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime_type` to the `evidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `evidence` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploader_id` to the `evidence` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaCategory" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'GLOBAL_ADMIN';

-- DropForeignKey
ALTER TABLE "police_users" DROP CONSTRAINT "police_users_station_id_fkey";

-- AlterTable
ALTER TABLE "evidence" DROP COLUMN "file_type",
DROP COLUMN "file_url",
DROP COLUMN "uploaded_by",
ADD COLUMN     "ai_confidence" DOUBLE PRECISION,
ADD COLUMN     "ai_detection_reason" TEXT,
ADD COLUMN     "analysis_ended_at" TIMESTAMP(3),
ADD COLUMN     "analysis_error" TEXT,
ADD COLUMN     "analysis_json" JSONB,
ADD COLUMN     "analysis_started_at" TIMESTAMP(3),
ADD COLUMN     "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "cdn_url" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "file_size_bytes" INTEGER NOT NULL,
ADD COLUMN     "is_ai_generated" BOOLEAN,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "media_category" "MediaCategory" NOT NULL,
ADD COLUMN     "mime_type" TEXT NOT NULL,
ADD COLUMN     "overview" TEXT,
ADD COLUMN     "processing_time_ms" INTEGER,
ADD COLUMN     "risk_level" TEXT,
ADD COLUMN     "risk_reason" TEXT,
ADD COLUMN     "s3_bucket" TEXT,
ADD COLUMN     "s3_key" TEXT,
ADD COLUMN     "s3_region" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploader_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "police_users" ALTER COLUMN "station_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mobile_number" TEXT;

-- DropEnum
DROP TYPE "FileType";

-- CreateIndex
CREATE INDEX "evidence_complaint_id_idx" ON "evidence"("complaint_id");

-- CreateIndex
CREATE INDEX "evidence_uploader_id_idx" ON "evidence"("uploader_id");

-- CreateIndex
CREATE INDEX "evidence_media_category_idx" ON "evidence"("media_category");

-- CreateIndex
CREATE INDEX "evidence_analysis_status_idx" ON "evidence"("analysis_status");

-- CreateIndex
CREATE INDEX "evidence_risk_level_idx" ON "evidence"("risk_level");

-- CreateIndex
CREATE INDEX "evidence_is_deleted_idx" ON "evidence"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_number_key" ON "users"("mobile_number");

-- AddForeignKey
ALTER TABLE "police_users" ADD CONSTRAINT "police_users_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "police_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
