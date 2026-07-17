-- AlterTable
-- CheckpointTask is empty (no code writes checkpoints yet), so the required
-- column needs no backfill and no default.
ALTER TABLE `CheckpointTask` ADD COLUMN `title` VARCHAR(191) NOT NULL;
