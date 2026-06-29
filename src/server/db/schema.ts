import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { DEFAULT_ANIMATIONS, type AnimationSettings } from "@/lib/animations";
import { relations } from "drizzle-orm";

/** Une déclinaison d'image générée par sharp (un format à une largeur donnée). */
export type ImageVariant = { width: number; url: string };
export type ImageVariants = { avif: ImageVariant[]; webp: ImageVariant[] };

/* ------------------------------------------------------------------ */
/* Taxonomies                                                          */
/* ------------------------------------------------------------------ */

/** Type d'onglet : galerie de photos seules, ou collection de projets. */
export type CategoryType = "photos" | "projects";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").$type<CategoryType>().notNull().default("projects"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

/* ------------------------------------------------------------------ */
/* Projets                                                             */
/* ------------------------------------------------------------------ */

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  location: text("location"),
  shotDate: date("shot_date"),
  coverPhotoId: uuid("cover_photo_id"),
  displayOrder: integer("display_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  // SEO par projet
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogPhotoId: uuid("og_photo_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

export const photos = pgTable("photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  // Pour les photos SEULES (projectId null) : catégorie/onglet d'appartenance
  // (catégorie de type 'photos'). Null quand la photo est dans un projet.
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "cascade",
  }),
  collection: text("collection"), // hérité (déprécié, remplacé par categoryId)
  storageKey: text("storage_key").notNull(), // clé R2 de l'original
  altText: text("alt_text").notNull(), // contrainte SEO/a11y au niveau base
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  lqip: text("lqip"), // placeholder base64 / blurhash
  variants: jsonb("variants").$type<ImageVariants>().notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* Table de liaison projets <-> tags (N:N) */
export const projectTags = pgTable(
  "project_tags",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.tagId] })],
);

/* ------------------------------------------------------------------ */
/* Contenu global                                                      */
/* ------------------------------------------------------------------ */

export const pages = pgTable("pages", {
  key: text("key").primaryKey(), // 'home' | 'about' | 'contact'
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogPhotoId: uuid("og_photo_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Un lien réseau social : la plateforme (clé du registre) + l'URL. */
export type SocialLink = { platform: string; url: string };

/** Une image stockée (variants responsive) hors table photos (ex. page Contact). */
export type StoredImage = {
  variants: ImageVariants;
  lqip: string;
  width: number;
  height: number;
};

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1), // singleton
  instagramUrl: text("instagram_url"), // legacy — repris dans `socials`
  linkedinUrl: text("linkedin_url"), // legacy — repris dans `socials`
  email: text("email"),
  contactTitle: text("contact_title"),
  contactText: text("contact_text"),
  contactImage: jsonb("contact_image").$type<StoredImage>(),
  legalNotice: text("legal_notice"),
  // Réseaux sociaux éditables et extensibles (n'importe quel réseau du registre).
  socials: jsonb("socials").$type<SocialLink[]>().notNull().default([]),
  // Réglages des animations (on/off + intensité par effet).
  animations: jsonb("animations")
    .$type<AnimationSettings>()
    .notNull()
    .default(DEFAULT_ANIMATIONS),
  theme: text("theme").notNull().default("neutral"), // accent shadcn
  defaultSeo: jsonb("default_seo")
    .$type<{ title?: string; description?: string }>()
    .notNull()
    .default({}),
});

/* ------------------------------------------------------------------ */
/* Utilisateurs (admin)                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Analytics — visites (sans donnée personnelle, ids anonymes)         */
/* ------------------------------------------------------------------ */

export const visits = pgTable(
  "visits",
  {
    id: text("id").primaryKey(), // uuid généré côté client (pour MAJ durée)
    path: text("path").notNull(),
    visitorId: text("visitor_id").notNull(), // localStorage, anonyme
    sessionId: text("session_id").notNull(), // sessionStorage
    durationMs: integer("duration_ms"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("visits_created_at_idx").on(t.createdAt)],
);

export type Visit = typeof visits.$inferSelect;

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  // NULL tant que l'utilisateur invité n'a pas choisi son mot de passe (1re connexion).
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name"),
  // "admin" (accès total) ou "editor" (contenu uniquement).
  role: text("role").notNull().default("admin"),
  // Jeton d'invitation à usage unique → page de définition du mot de passe.
  inviteToken: text("invite_token").unique(),
  invitedAt: timestamp("invited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const projectsRelations = relations(projects, ({ one, many }) => ({
  category: one(categories, {
    fields: [projects.categoryId],
    references: [categories.id],
  }),
  photos: many(photos),
  projectTags: many(projectTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  projects: many(projects),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  project: one(projects, {
    fields: [photos.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [photos.categoryId],
    references: [categories.id],
  }),
}));

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, {
    fields: [projectTags.projectId],
    references: [projects.id],
  }),
  tag: one(tags, { fields: [projectTags.tagId], references: [tags.id] }),
}));

export type Project = typeof projects.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Category = typeof categories.$inferSelect;
