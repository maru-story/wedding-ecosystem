-- AlterTable
ALTER TABLE "events" ALTER COLUMN "event_date" SET DATA TYPE TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "check_ins_scanner_device_id_idx" ON "check_ins"("scanner_device_id");
