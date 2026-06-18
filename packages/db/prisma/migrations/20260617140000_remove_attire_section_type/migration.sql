-- Delete all invitation_sections with section_type = 'attire'
DELETE FROM "invitation_sections" WHERE "section_type" = 'attire';

-- Remove the 'attire' value from SectionType enum
ALTER TYPE "SectionType" RENAME TO "SectionType_old";

CREATE TYPE "SectionType" AS ENUM ('cover', 'bride_groom', 'bride', 'groom', 'story', 'verse', 'countdown', 'akad_resepsi', 'rsvp', 'gallery', 'video', 'gift', 'messages', 'closing', 'music');

ALTER TABLE "invitation_sections" ALTER COLUMN "section_type" TYPE "SectionType" USING ("section_type"::text::"SectionType");

DROP TYPE "SectionType_old";
