-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'STATION_ADMIN', 'OFFICER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('EMERGENCY', 'HIGH', 'MODERATE', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STATUS_UPDATE', 'ASSIGNMENT', 'EMERGENCY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditUserType" AS ENUM ('CITIZEN', 'POLICE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "aadhaar_masked" TEXT,
    "internal_ref" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geofence_id" TEXT,
    "complaint_count" INTEGER NOT NULL DEFAULT 0,
    "risk_flag_count" INTEGER NOT NULL DEFAULT 0,
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_stations" (
    "id" TEXT NOT NULL,
    "station_name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_km" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "contact_number" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "police_users" (
    "id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OFFICER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "police_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "tracking_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "assigned_officer_id" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'FILED',
    "priority_level" "PriorityLevel" NOT NULL DEFAULT 'INFORMATIONAL',
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "incident_type" TEXT,
    "summary_text" TEXT,
    "structured_json" JSONB,
    "transcript" TEXT,
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "location_address" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "duplicate_of" TEXT,
    "version_count" INTEGER NOT NULL DEFAULT 1,
    "legal_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_updates" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "update_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "complaint_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "hash_checksum" TEXT,
    "encrypted_key" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_type" "AuditUserType" NOT NULL,
    "user_id" TEXT,
    "police_user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "complaint_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_aadhaar_masked_key" ON "users"("aadhaar_masked");

-- CreateIndex
CREATE UNIQUE INDEX "users_internal_ref_key" ON "users"("internal_ref");

-- CreateIndex
CREATE UNIQUE INDEX "police_users_email_key" ON "police_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_tracking_id_key" ON "complaints"("tracking_id");

-- CreateIndex
CREATE INDEX "complaints_station_id_idx" ON "complaints"("station_id");

-- CreateIndex
CREATE INDEX "complaints_priority_level_idx" ON "complaints"("priority_level");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_geofence_id_fkey" FOREIGN KEY ("geofence_id") REFERENCES "police_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "police_users" ADD CONSTRAINT "police_users_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "police_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "police_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_officer_id_fkey" FOREIGN KEY ("assigned_officer_id") REFERENCES "police_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_updates" ADD CONSTRAINT "complaint_updates_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_police_user_id_fkey" FOREIGN KEY ("police_user_id") REFERENCES "police_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
