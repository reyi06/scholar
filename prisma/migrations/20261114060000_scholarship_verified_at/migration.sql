-- Last date a listing was confirmed against the provider's own published
-- information. Nullable: every existing row has never been checked.
ALTER TABLE "Scholarship" ADD COLUMN "verifiedAt" TIMESTAMP(3);
