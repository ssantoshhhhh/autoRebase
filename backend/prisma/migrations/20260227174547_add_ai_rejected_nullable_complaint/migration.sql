-- AlterEnum
ALTER TYPE "AnalysisStatus" ADD VALUE 'AI_REJECTED';

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_complaint_id_fkey";

-- AlterTable
ALTER TABLE "evidence" ALTER COLUMN "complaint_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
