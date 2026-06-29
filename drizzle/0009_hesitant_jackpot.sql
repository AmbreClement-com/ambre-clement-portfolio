ALTER TABLE "site_settings" ALTER COLUMN "animations" SET DEFAULT '{"cursorEnabled":true,"cursorIntensity":100,"photoHoverEnabled":true,"photoHoverIntensity":100,"scrollWaveEnabled":true,"scrollWaveIntensity":100,"infiniteScrollEnabled":true,"pageTransitionEnabled":true,"pageTransitionSpeed":"medium","loaderEnabled":true,"loaderSpeed":"medium","projectTransitionEnabled":true,"projectTransitionSpeed":"medium"}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invite_token_unique" UNIQUE("invite_token");