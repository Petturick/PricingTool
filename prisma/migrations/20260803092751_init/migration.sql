-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatRate" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Webshop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "competitorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Webshop_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Webshop_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleNumber" TEXT NOT NULL,
    "ean" TEXT,
    "gtin" TEXT,
    "name" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "ownPrice" DECIMAL,
    "vatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "packagingUnit" TEXT,
    "packagingQty" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stockStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "checkFrequencyHours" INTEGER NOT NULL DEFAULT 24,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Competitor_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "productMatchId" TEXT,
    "url" TEXT NOT NULL,
    "rawPrice" DECIMAL,
    "normalizedPrice" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "packagingUnit" TEXT,
    "packagingQty" INTEGER,
    "stockStatus" TEXT,
    "lastCheckedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitorOffer_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "competitorOfferId" TEXT NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "matchStatus" TEXT NOT NULL,
    "matchEvidence" JSONB NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductMatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductMatch_competitorOfferId_fkey" FOREIGN KEY ("competitorOfferId") REFERENCES "CompetitorOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductMatch_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorOfferId" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL,
    "foundPrice" DECIMAL,
    "currency" TEXT NOT NULL,
    "stockStatus" TEXT,
    "productTitle" TEXT,
    "packagingUnit" TEXT,
    "checkMethod" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "isSuccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceCheck_competitorOfferId_fkey" FOREIGN KEY ("competitorOfferId") REFERENCES "CompetitorOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorOfferId" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "normalizedPrice" DECIMAL,
    "currency" TEXT NOT NULL,
    "stockStatus" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_competitorOfferId_fkey" FOREIGN KEY ("competitorOfferId") REFERENCES "CompetitorOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OwnPriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OwnPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "productId" TEXT,
    "competitorOfferId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alert_competitorOfferId_fkey" FOREIGN KEY ("competitorOfferId") REFERENCES "CompetitorOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "threshold" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "countryId" TEXT,
    "productGroupId" TEXT,
    "competitorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlertRule_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlertRule_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlertRule_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER,
    "processedRows" INTEGER,
    "errorRows" INTEGER,
    "errors" JSONB,
    "warnings" JSONB,
    "importedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportTask_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Webshop_name_countryId_key" ON "Webshop"("name", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_name_key" ON "ProductGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_articleNumber_key" ON "Product"("articleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_name_countryId_key" ON "Competitor"("name", "countryId");

-- CreateIndex
CREATE INDEX "CompetitorOffer_productMatchId_idx" ON "CompetitorOffer"("productMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_competitorOfferId_key" ON "ProductMatch"("competitorOfferId");

-- CreateIndex
CREATE INDEX "ProductMatch_matchStatus_idx" ON "ProductMatch"("matchStatus");

-- CreateIndex
CREATE INDEX "PriceCheck_checkedAt_idx" ON "PriceCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_recordedAt_idx" ON "PriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "OwnPriceHistory_recordedAt_idx" ON "OwnPriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");
