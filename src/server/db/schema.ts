import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
  type AnyPgColumn,
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
  // FK vers photos (référence circulaire projets↔photos → AnyPgColumn) :
  // supprimer la photo remet la référence à NULL au lieu de laisser un ID mort.
  coverPhotoId: uuid("cover_photo_id").references(
    (): AnyPgColumn => photos.id,
    { onDelete: "set null" },
  ),
  displayOrder: integer("display_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  // SEO par projet
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogPhotoId: uuid("og_photo_id").references((): AnyPgColumn => photos.id, {
    onDelete: "set null",
  }),
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
/* Tarifs (plusieurs items, gérés comme les projets)                   */
/* ------------------------------------------------------------------ */

export const pricings = pgTable("pricings", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  intro: text("intro"), // paragraphes (sauts de ligne conservés)
  includes: jsonb("includes").$type<string[]>().notNull().default([]),
  price: text("price"),
  image: jsonb("image").$type<StoredImage>(),
  published: boolean("published").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Pricing = typeof pricings.$inferSelect;

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
  // Nom du site (navbar, loader, titres d'onglet, manifest). NULL → « Ambre Clément ».
  siteName: text("site_name"),
  // Thème typographique du site public (id du registre lib/typography-themes).
  // NULL → thème par défaut (« signature »).
  typography: text("typography"),
  // Graisse globale du thème : "light" | "bold" — NULL = normale.
  typographyWeight: text("typography_weight"),
  // Domaine affiché dans le cadre (© 2026 xxx). NULL → dérivé de SITE_URL.
  frameDomain: text("frame_domain"),
  email: text("email"),
  contactTitle: text("contact_title"),
  contactText: text("contact_text"),
  contactPhone: text("contact_phone"),
  contactLocation: text("contact_location"), // ex. « Nantes, France »
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

/**
 * Événements analytics (anonymes, mêmes ids que `visits`) — trois familles :
 *  • interactions : clic sur un lien important (`social:instagram`, `email_copy`,
 *    `contact_email`, …) — posées via `data-track` sur les liens/boutons ;
 *  • `vital:LCP|CLS|INP` : Web Vitals (valeur dans `value`, ms ou score) ;
 *  • `client_error` : erreur JS non interceptée (message tronqué dans `meta`).
 */
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(), // uuid généré côté client
    name: text("name").notNull(),
    path: text("path").notNull(),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    value: doublePrecision("value"), // vitals uniquement (ms ou score CLS)
    meta: text("meta"), // erreurs : message tronqué
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("events_created_at_idx").on(t.createdAt),
    index("events_name_idx").on(t.name),
  ],
);

export type AnalyticsEvent = typeof events.$inferSelect;

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
  // Thème du back-office, PROPRE À CHAQUE UTILISATEUR (NULL → thème par défaut).
  theme: text("theme"),
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
