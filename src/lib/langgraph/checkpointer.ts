/**
 * VIREON — PostgreSQL-Backed LangGraph Checkpointer
 * ==================================================
 * Persists workflow checkpoint tuples and interrupts directly to PostgreSQL
 * using the existing Supabase / Prisma infrastructure.
 *
 * Ensures Human Approval states and workflow threads survive server/process restarts.
 */

import { BaseCheckpointSaver } from "@langchain/langgraph";
import { prisma } from "../../../backend/src/config/prisma";

export class PostgresPrismaSaver extends BaseCheckpointSaver {
  private static tablesInitialized = false;

  public async ensureTables() {
    if (PostgresPrismaSaver.tablesInitialized) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
          thread_id TEXT NOT NULL,
          checkpoint_ns TEXT NOT NULL DEFAULT '',
          checkpoint_id TEXT NOT NULL,
          parent_checkpoint_id TEXT,
          checkpoint JSONB NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS langgraph_checkpoint_writes (
          thread_id TEXT NOT NULL,
          checkpoint_ns TEXT NOT NULL DEFAULT '',
          checkpoint_id TEXT NOT NULL,
          task_id TEXT NOT NULL,
          idx INT NOT NULL,
          channel TEXT NOT NULL,
          value JSONB NOT NULL,
          PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
        );
      `);
      PostgresPrismaSaver.tablesInitialized = true;
    } catch (err) {
      console.warn("[PostgresPrismaSaver] Table initialization warning:", err);
    }
  }

  async getTuple(config: any): Promise<any> {
    await this.ensureTables();
    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const checkpoint_id = config.configurable?.checkpoint_id;

    if (!thread_id) return undefined;

    try {
      let rows: any[];
      if (checkpoint_id) {
        rows = await prisma.$queryRawUnsafe(
          "SELECT * FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3 LIMIT 1",
          thread_id,
          checkpoint_ns,
          checkpoint_id
        );
      } else {
        rows = await prisma.$queryRawUnsafe(
          "SELECT * FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_ns = $2 ORDER BY created_at DESC, checkpoint_id DESC LIMIT 1",
          thread_id,
          checkpoint_ns
        );
      }

      if (!rows || rows.length === 0) return undefined;
      const row = rows[0];

      const writes: any[] = await prisma.$queryRawUnsafe(
        "SELECT task_id, channel, value FROM langgraph_checkpoint_writes WHERE thread_id = $1 AND checkpoint_ns = $2 AND checkpoint_id = $3 ORDER BY idx ASC",
        thread_id,
        checkpoint_ns,
        row.checkpoint_id
      );

      const pendingWrites = await Promise.all(
        writes.map(async (w: any) => [
          w.task_id,
          w.channel,
          await this.serde.loadsTyped("json", typeof w.value === "string" ? w.value : JSON.stringify(w.value)),
        ])
      );

      const checkpoint = await this.serde.loadsTyped(
        "json",
        typeof row.checkpoint === "string" ? row.checkpoint : JSON.stringify(row.checkpoint)
      );
      const metadata = await this.serde.loadsTyped(
        "json",
        typeof row.metadata === "string" ? row.metadata : JSON.stringify(row.metadata)
      );

      return {
        config: {
          configurable: {
            thread_id,
            checkpoint_ns,
            checkpoint_id: row.checkpoint_id,
          },
        },
        checkpoint,
        metadata,
        pendingWrites,
        parentConfig: row.parent_checkpoint_id
          ? {
              configurable: {
                thread_id,
                checkpoint_ns,
                checkpoint_id: row.parent_checkpoint_id,
              },
            }
          : undefined,
      };
    } catch (err) {
      console.warn("[PostgresPrismaSaver.getTuple Error]:", err);
      return undefined;
    }
  }

  async *list(config: any): AsyncGenerator<any, void, unknown> {
    await this.ensureTables();
    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    if (!thread_id) return;

    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        "SELECT * FROM langgraph_checkpoints WHERE thread_id = $1 AND checkpoint_ns = $2 ORDER BY created_at DESC",
        thread_id,
        checkpoint_ns
      );
      for (const row of rows) {
        const checkpoint = await this.serde.loadsTyped(
          "json",
          typeof row.checkpoint === "string" ? row.checkpoint : JSON.stringify(row.checkpoint)
        );
        const metadata = await this.serde.loadsTyped(
          "json",
          typeof row.metadata === "string" ? row.metadata : JSON.stringify(row.metadata)
        );
        yield {
          config: { configurable: { thread_id, checkpoint_ns, checkpoint_id: row.checkpoint_id } },
          checkpoint,
          metadata,
        };
      }
    } catch (err) {
      console.warn("[PostgresPrismaSaver.list Error]:", err);
    }
  }

  async put(config: any, checkpoint: any, metadata: any): Promise<any> {
    await this.ensureTables();
    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const checkpoint_id = checkpoint.id;
    const parent_checkpoint_id = config.configurable?.checkpoint_id;

    try {
      const [, serializedCheckpoint] = await this.serde.dumpsTyped(checkpoint);
      const [, serializedMetadata] = await this.serde.dumpsTyped(metadata);

      const checkStr = typeof serializedCheckpoint === "string"
        ? serializedCheckpoint
        : Buffer.from(serializedCheckpoint).toString("utf-8");

      const metaStr = typeof serializedMetadata === "string"
        ? serializedMetadata
        : Buffer.from(serializedMetadata).toString("utf-8");

      await prisma.$executeRawUnsafe(
        `INSERT INTO langgraph_checkpoints (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW())
         ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id)
         DO UPDATE SET checkpoint = $5::jsonb, metadata = $6::jsonb`,
        thread_id,
        checkpoint_ns,
        checkpoint_id,
        parent_checkpoint_id || null,
        checkStr,
        metaStr
      );

      return {
        configurable: {
          thread_id,
          checkpoint_ns,
          checkpoint_id,
        },
      };
    } catch (err) {
      console.warn("[PostgresPrismaSaver.put Error]:", err);
      return { configurable: { thread_id, checkpoint_ns, checkpoint_id } };
    }
  }

  async putWrites(config: any, writes: any[], taskId: string): Promise<void> {
    await this.ensureTables();
    const thread_id = config.configurable?.thread_id;
    const checkpoint_ns = config.configurable?.checkpoint_ns ?? "";
    const checkpoint_id = config.configurable?.checkpoint_id;

    try {
      for (let idx = 0; idx < writes.length; idx++) {
        const [channel, value] = writes[idx];
        const [, serializedVal] = await this.serde.dumpsTyped(value);
        const valStr = typeof serializedVal === "string"
          ? serializedVal
          : Buffer.from(serializedVal).toString("utf-8");

        await prisma.$executeRawUnsafe(
          `INSERT INTO langgraph_checkpoint_writes (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, value)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
           ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
           DO UPDATE SET value = $7::jsonb`,
          thread_id,
          checkpoint_ns,
          checkpoint_id,
          taskId,
          idx,
          channel,
          valStr
        );
      }
    } catch (err) {
      console.warn("[PostgresPrismaSaver.putWrites Error]:", err);
    }
  }

  async deleteThread(thread_id: string): Promise<void> {
    await this.ensureTables();
    try {
      await prisma.$executeRawUnsafe("DELETE FROM langgraph_checkpoints WHERE thread_id = $1", thread_id);
      await prisma.$executeRawUnsafe("DELETE FROM langgraph_checkpoint_writes WHERE thread_id = $1", thread_id);
    } catch (err) {
      console.warn("[PostgresPrismaSaver.deleteThread Error]:", err);
    }
  }
}

export const postgresPrismaSaver = new PostgresPrismaSaver();
