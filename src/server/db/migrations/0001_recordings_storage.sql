ALTER TABLE "recordings" ADD COLUMN "storage" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "started_by" text;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "excluded" jsonb DEFAULT '[]'::jsonb NOT NULL;