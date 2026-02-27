-- AlterTable
ALTER TABLE "evidence" ADD COLUMN     "p_hash" TEXT;

-- CreateTable
CREATE TABLE "evidence_matches" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "match_type" TEXT NOT NULL DEFAULT 'SIMILAR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_links" (
    "id" TEXT NOT NULL,
    "complaint_a_id" TEXT NOT NULL,
    "complaint_b_id" TEXT NOT NULL,
    "link_reason" TEXT NOT NULL DEFAULT 'SIMILAR_EVIDENCE',
    "evidence_match_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evidence_matches_source_id_target_id_key" ON "evidence_matches"("source_id", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_links_complaint_a_id_complaint_b_id_key" ON "complaint_links"("complaint_a_id", "complaint_b_id");

-- AddForeignKey
ALTER TABLE "evidence_matches" ADD CONSTRAINT "evidence_matches_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_matches" ADD CONSTRAINT "evidence_matches_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_links" ADD CONSTRAINT "complaint_links_complaint_a_id_fkey" FOREIGN KEY ("complaint_a_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_links" ADD CONSTRAINT "complaint_links_complaint_b_id_fkey" FOREIGN KEY ("complaint_b_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
