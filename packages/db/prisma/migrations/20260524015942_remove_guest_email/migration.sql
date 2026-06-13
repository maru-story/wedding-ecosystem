/*
  Warnings:

  - You are about to drop the column `email` on the `guests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "guests" DROP COLUMN "email";

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "tenant_id" UUID,
    "action" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
