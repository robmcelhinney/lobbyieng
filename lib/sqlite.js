import sqlite3 from "sqlite3"
import { open } from "sqlite"

let dbPromise

async function applyPragmas(db) {
  await db.exec("PRAGMA journal_mode=WAL")
  await db.exec("PRAGMA synchronous=NORMAL")
  await db.exec("PRAGMA temp_store=MEMORY")
  await db.exec("PRAGMA cache_size=-20000")
  await db.exec("PRAGMA mmap_size=268435456")
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: "./lobbying.db",
      driver: sqlite3.Database
    }).then(async (db) => {
      await applyPragmas(db)
      return db
    })
  }

  return dbPromise
}

