-- CreateEnum
CREATE TYPE "StorageArea" AS ENUM ('COOLER', 'LINE', 'DRY', 'WALKIN');

-- CreateEnum
CREATE TYPE "CountType" AS ENUM ('ORDER', 'PREP');

-- CreateTable
CREATE TABLE "InventoryCount" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "storageArea" "StorageArea" NOT NULL DEFAULT 'COOLER',
    "countType" "CountType" NOT NULL,
    "note" TEXT,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryCount_inventoryItemId_countedAt_idx" ON "InventoryCount"("inventoryItemId", "countedAt");

-- CreateIndex
CREATE INDEX "InventoryCount_userId_idx" ON "InventoryCount"("userId");

-- CreateIndex
CREATE INDEX "InventoryCount_countedAt_idx" ON "InventoryCount"("countedAt");

-- CreateIndex
CREATE INDEX "InventoryCount_countType_idx" ON "InventoryCount"("countType");

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
