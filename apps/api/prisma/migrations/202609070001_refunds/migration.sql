ALTER TABLE "Booking"
  ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
  ADD COLUMN "refundReason" TEXT,
  ADD COLUMN "refundReference" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundApprovedBy" TEXT;
