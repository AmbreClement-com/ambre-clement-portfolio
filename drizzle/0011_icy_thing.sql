CREATE TABLE "pricings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"intro" text,
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price" text,
	"image" jsonb,
	"published" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" DROP COLUMN "pricing";