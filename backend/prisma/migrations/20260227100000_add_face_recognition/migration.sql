-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "persons_of_interest" (
    "id"         TEXT        NOT NULL,
    "name"       TEXT        NOT NULL,
    "category"   TEXT        NOT NULL,
    "notes"      TEXT,
    "photo_url"  TEXT,
    "embedding"  vector(512),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_of_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detected_faces" (
    "id"                     TEXT        NOT NULL,
    "evidence_id"            TEXT        NOT NULL,
    "person_of_interest_id"  TEXT,
    "bounding_box"           JSONB       NOT NULL,
    "embedding"              vector(512) NOT NULL,
    "confidence"             DOUBLE PRECISION NOT NULL,
    "detected_at"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detected_faces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "detected_faces_evidence_id_idx" ON "detected_faces"("evidence_id");

-- CreateIndex for fast ANN cosine search on persons_of_interest embeddings
CREATE INDEX "persons_of_interest_embedding_idx" ON "persons_of_interest"
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "detected_faces" ADD CONSTRAINT "detected_faces_evidence_id_fkey"
    FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detected_faces" ADD CONSTRAINT "detected_faces_person_of_interest_id_fkey"
    FOREIGN KEY ("person_of_interest_id") REFERENCES "persons_of_interest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
