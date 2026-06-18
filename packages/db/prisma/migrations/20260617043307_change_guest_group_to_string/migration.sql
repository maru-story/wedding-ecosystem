-- AlterTable
ALTER TABLE "guests" ALTER COLUMN "group" TYPE TEXT USING "group"::text;

-- DropEnum
DROP TYPE "GuestGroup";
