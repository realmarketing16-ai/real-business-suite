-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'outbox',
    "error" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "sentAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailMessage_companyId_idx" ON "EmailMessage"("companyId");

-- CreateIndex
CREATE INDEX "EmailMessage_companyId_status_idx" ON "EmailMessage"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmailMessage_companyId_createdAt_idx" ON "EmailMessage"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailMessage_companyId_relatedType_idx" ON "EmailMessage"("companyId", "relatedType");

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
