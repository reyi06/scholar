-- Money moves from a float to integer centavos.
--
-- Existing rows are converted rather than dropped: `amount` held whole pesos,
-- so multiplying by 100 preserves every recorded value exactly.

ALTER TABLE "Grant" ADD COLUMN "amountCentavos" INTEGER NOT NULL DEFAULT 0;

UPDATE "Grant" SET "amountCentavos" = CAST(ROUND("amount" * 100) AS INTEGER);

ALTER TABLE "Grant" DROP COLUMN "amount";
