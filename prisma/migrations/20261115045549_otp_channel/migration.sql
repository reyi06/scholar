-- AlterTable
ALTER TABLE "EmailVerification" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "destination" TEXT NOT NULL DEFAULT '';
