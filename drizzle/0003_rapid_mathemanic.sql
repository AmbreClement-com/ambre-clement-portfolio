ALTER TABLE "categories" ADD COLUMN "type" text DEFAULT 'projects' NOT NULL;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;