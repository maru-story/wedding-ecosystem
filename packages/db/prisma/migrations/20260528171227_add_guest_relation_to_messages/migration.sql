-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "guest_id" UUID;

-- CreateIndex
CREATE INDEX "messages_guest_id_idx" ON "messages"("guest_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
