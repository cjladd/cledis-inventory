-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('PREP', 'WASTE', 'MANUAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'ES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "locationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "toastLocationId" TEXT,
    "toastClientId" TEXT,
    "toastClientSecret" TEXT,
    "writeBackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "alertWindowMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "dayStartHour" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "parLevel" DOUBLE PRECISION NOT NULL,
    "safetyStock" DOUBLE PRECISION NOT NULL,
    "toastItemId" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "toastMenuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveAdjustment" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleEvent" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "toastOrderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "predictedDepletionAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastSnapshot" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "avgSalesRate" DOUBLE PRECISION NOT NULL,
    "seasonality" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_locationId_idx" ON "User"("locationId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Location_toastLocationId_key" ON "Location"("toastLocationId");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_toastLocationId_idx" ON "Location"("toastLocationId");

-- CreateIndex
CREATE INDEX "InventoryItem_locationId_idx" ON "InventoryItem"("locationId");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_toastItemId_idx" ON "InventoryItem"("toastItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_locationId_name_key" ON "InventoryItem"("locationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_locationId_toastItemId_key" ON "InventoryItem"("locationId", "toastItemId");

-- CreateIndex
CREATE INDEX "MenuItem_locationId_idx" ON "MenuItem"("locationId");

-- CreateIndex
CREATE INDEX "MenuItem_isActive_idx" ON "MenuItem"("isActive");

-- CreateIndex
CREATE INDEX "MenuItem_toastMenuItemId_idx" ON "MenuItem"("toastMenuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_locationId_toastMenuItemId_key" ON "MenuItem"("locationId", "toastMenuItemId");

-- CreateIndex
CREATE INDEX "Recipe_menuItemId_idx" ON "Recipe"("menuItemId");

-- CreateIndex
CREATE INDEX "Recipe_inventoryItemId_idx" ON "Recipe"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_menuItemId_inventoryItemId_key" ON "Recipe"("menuItemId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "LiveAdjustment_inventoryItemId_idx" ON "LiveAdjustment"("inventoryItemId");

-- CreateIndex
CREATE INDEX "LiveAdjustment_userId_idx" ON "LiveAdjustment"("userId");

-- CreateIndex
CREATE INDEX "LiveAdjustment_type_idx" ON "LiveAdjustment"("type");

-- CreateIndex
CREATE INDEX "LiveAdjustment_createdAt_idx" ON "LiveAdjustment"("createdAt");

-- CreateIndex
CREATE INDEX "SaleEvent_locationId_idx" ON "SaleEvent"("locationId");

-- CreateIndex
CREATE INDEX "SaleEvent_menuItemId_idx" ON "SaleEvent"("menuItemId");

-- CreateIndex
CREATE INDEX "SaleEvent_toastOrderId_idx" ON "SaleEvent"("toastOrderId");

-- CreateIndex
CREATE INDEX "SaleEvent_createdAt_idx" ON "SaleEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaleEvent_toastOrderId_menuItemId_key" ON "SaleEvent"("toastOrderId", "menuItemId");

-- CreateIndex
CREATE INDEX "Alert_inventoryItemId_idx" ON "Alert"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_resolvedByUserId_idx" ON "Alert"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "Alert_status_createdAt_idx" ON "Alert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_inventoryItemId_status_idx" ON "Alert"("inventoryItemId", "status");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_inventoryItemId_idx" ON "ForecastSnapshot"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_dayOfWeek_idx" ON "ForecastSnapshot"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastSnapshot_inventoryItemId_dayOfWeek_key" ON "ForecastSnapshot"("inventoryItemId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "AuditLog_locationId_idx" ON "AuditLog"("locationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveAdjustment" ADD CONSTRAINT "LiveAdjustment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveAdjustment" ADD CONSTRAINT "LiveAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleEvent" ADD CONSTRAINT "SaleEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleEvent" ADD CONSTRAINT "SaleEvent_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

