CREATE TABLE "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"visitor_id" text NOT NULL,
	"session_id" text NOT NULL,
	"duration_ms" integer,
	"referrer" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visits_created_at_idx" ON "visits" USING btree ("created_at");