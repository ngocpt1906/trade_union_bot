import mongoose from "mongoose";

const COLLECTIONS = ["machines", "workers", "attendanceevents"] as const;

/**
 * One-time migration: ownerTelegramId (number) → ownerKey ("tg:{id}").
 * Safe to run on every startup (no-op when already migrated).
 */
export async function migrateOwnerKey(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  for (const name of COLLECTIONS) {
    const col = db.collection(name);
    const cursor = col.find({
      ownerTelegramId: { $exists: true },
      ownerKey: { $exists: false },
    });

    let batch: { _id: mongoose.Types.ObjectId; ownerTelegramId: number }[] = [];
    for await (const doc of cursor) {
      batch.push({
        _id: doc._id as mongoose.Types.ObjectId,
        ownerTelegramId: doc.ownerTelegramId as number,
      });
      if (batch.length >= 100) {
        await flushBatch(col, batch);
        batch = [];
      }
    }
    if (batch.length > 0) await flushBatch(col, batch);

    // Drop legacy indexes that reference ownerTelegramId (recreated by mongoose syncIndexes)
    const indexes = await col.indexes();
    for (const idx of indexes) {
      const keys = Object.keys(idx.key ?? {});
      if (keys.includes("ownerTelegramId") && idx.name && idx.name !== "_id_") {
        try {
          await col.dropIndex(idx.name);
        } catch {
          // ignore missing / in-use race
        }
      }
    }
  }
}

async function flushBatch(
  col: mongoose.mongo.Collection,
  batch: { _id: mongoose.Types.ObjectId; ownerTelegramId: number }[],
): Promise<void> {
  await col.bulkWrite(
    batch.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: { ownerKey: `tg:${doc.ownerTelegramId}` },
          $unset: { ownerTelegramId: "" },
        },
      },
    })),
  );
}
