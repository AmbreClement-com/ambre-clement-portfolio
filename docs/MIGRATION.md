# Migration en production — infrastructure client

Runbook complet : passage de l'infrastructure de développement (comptes
personnels) à une infrastructure **possédée par la cliente**, sans interruption
de service. Architecture cible : GitHub (org cliente) + Vercel Pro + Neon +
Cloudflare R2/DNS. Coût : ~20 $/mois (Vercel Pro), le reste gratuit.

Légende : 🧑 = action à faire à la main · 🤖 = préparé/automatisé dans le dépôt.

---

## Phase 0 — Création des comptes (avec la cliente, ~1 h)

Tout se crée avec **l'adresse email de la cliente**. Chaque compte : mot de
passe fort (gestionnaire de mots de passe) + **2FA activée immédiatement**.

1. 🧑 **GitHub** : créer un compte, puis une **organisation** (ex. `ambre-clement`).
   Plan Free. Inviter votre compte perso comme membre (rôle *maintainer*).
2. 🧑 **Vercel** : créer un compte (connexion « Continue with GitHub » avec le
   compte cliente), créer une **team** et passer au plan **Pro** (l'usage
   commercial est interdit sur le plan Hobby). Vous inviter comme membre.
3. 🧑 **Cloudflare** : créer un compte (email cliente). Rien d'autre à ce stade.
4. 🧑 **Neon** : créer un compte (email cliente), plan Free. Vous inviter
   (Settings → People) si l'offre le permet, sinon partager l'accès plus tard.

## Phase 1 — Code

5. 🧑 **Transfert du dépôt** : GitHub → repo actuel → Settings → Danger Zone →
   *Transfer ownership* → vers l'organisation cliente. L'historique, les
   branches et les Actions suivent. (Votre remote local : `git remote set-url
   origin git@github.com:<org>/<repo>.git`.)
6. 🧑 **Projet Vercel client** : dans la team cliente → *Add New Project* →
   importer le dépôt depuis l'org GitHub. **Ne pas encore configurer le
   domaine.** Build par défaut (le script `build` inclut les migrations).
   ⚠️ Désactiver l'auto-deploy si vous voulez garder le contrôle (Settings →
   Git → *Ignored Build Step*) — ou l'accepter : sur le compte client,
   l'auto-deploy sur `main` est un choix raisonnable.

## Phase 2 — Base de données (Neon client)

7. 🧑 Dans le Neon client : *New project* (région `eu-central-1` / Francfort,
   Postgres 17). Récupérer la `DATABASE_URL` (pooled).
8. 🧑 **Copie des données** (la base fait ~10 Mo, c'est instantané) :
   ```bash
   pg_dump --no-owner --no-privileges "$ANCIENNE_DATABASE_URL" > dump.sql
   psql "$NOUVELLE_DATABASE_URL" < dump.sql
   ```
   Vérifier : `psql "$NOUVELLE_DATABASE_URL" -c "select count(*) from photos;"`

## Phase 3 — Images (R2 client + domaine media)

9. 🧑 Cloudflare client → R2 → *Create bucket* :
   - `ac-media` (bucket principal) — région EU ;
   - `ac-backups` (sauvegardes) — région EU.
10. 🧑 Sur `ac-media` → Settings → **Custom domain** → `media.<domaine>` (le
    domaine aura été ajouté à Cloudflare en Phase 5 — sinon utiliser d'abord
    l'URL `r2.dev` de test puis re-basculer). C'est CE domaine qui rend le
    stockage remplaçable plus tard sans toucher à la base.
11. 🧑 R2 → *Manage API tokens* → créer 2 jetons :
    - `app-media` : lecture/écriture **limité au bucket `ac-media`** ;
    - `backups` : lecture `ac-media` + lecture/écriture `ac-backups`.
12. 🧑 **Copie des objets** depuis le stockage actuel (rclone) :
    ```bash
    rclone sync ancien:BUCKET_ACTUEL \
      ":s3,endpoint=https://<account_id>.r2.cloudflarestorage.com,access_key_id=…,secret_access_key=…:ac-media" \
      --fast-list --transfers 8 --progress
    ```
    (Config `ancien:` selon le fournisseur actuel — S3-compatible aussi.)
13. 🤖 **Bascule des URLs en base** — script fourni, dry-run d'abord :
    ```bash
    DATABASE_URL=$NOUVELLE npx tsx scripts/migrate-media-urls.ts \
      --from https://<base-publique-actuelle> --to https://media.<domaine>
    # vérifier les comptages, puis relancer avec --apply
    ```

## Phase 4 — Variables d'environnement & déploiement de validation

14. 🧑 Vercel client → Settings → Environment Variables (Production) :

    | Variable | Valeur |
    |---|---|
    | `DATABASE_URL` | URL Neon **client** (pooled) |
    | `AUTH_SECRET` | **RÉGÉNÉRÉ** : `openssl rand -base64 32` |
    | `NEXT_PUBLIC_SITE_URL` | `https://<domaine>` (final, sans slash) |
    | `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
    | `S3_REGION` | `auto` |
    | `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | jeton `app-media` |
    | `S3_BUCKET` | `ac-media` |
    | `S3_PUBLIC_URL` | `https://media.<domaine>` |

    (Preview/Development : pointer sur la branche Neon `dev` du client.)
15. 🧑 Déployer, puis **valider sur l'URL `.vercel.app`** : galeries (images
    servies par `media.`), lightbox, connexion admin, upload d'une photo test
    (elle doit arriver dans `ac-media`), suppression de la photo test, tarifs,
    contact, analytics (visite comptée).

## Phase 5 — DNS (zéro coupure)

16. 🧑 Cloudflare client → *Add site* → `<domaine>` (plan Free). Cloudflare
    scanne les enregistrements existants. Noter les **2 nameservers** fournis.
17. 🧑 **La veille de la bascule** : chez Wix (gestion du domaine), abaisser le
    TTL des enregistrements à 300 s si l'option existe.
18. 🧑 Vercel client → Settings → Domains → ajouter `<domaine>` et
    `www.<domaine>` (choisir la redirection www → apex).
19. 🧑 Dans Cloudflare DNS, créer :

    | Type | Nom | Valeur | Proxy |
    |---|---|---|---|
    | A | `@` | `76.76.21.21` (Vercel) | **DNS only** (nuage gris) |
    | CNAME | `www` | `cname.vercel-dns.com` | **DNS only** |
    | CNAME | `media` | (créé automatiquement par R2 custom domain) | Proxied |

    ⚠️ Les enregistrements Vercel doivent rester **DNS only** : le proxy
    Cloudflare devant le CDN Vercel provoque des conflits de cache/SSL.
20. 🧑 **Bascule** : chez Wix → Domaines → *Utiliser des serveurs de noms
    personnalisés* → coller les 2 nameservers Cloudflare. Propagation :
    minutes à quelques heures. **L'ancien site continue de répondre pendant
    toute la propagation** → zéro coupure.
21. 🧑 Pendant la fenêtre de propagation : **gel de contenu** (pas d'édition
    admin). Si des éditions ont eu lieu depuis la Phase 2 : refaire le
    dump/restore juste avant l'étape 20 (10 secondes).
22. 🧑 Vérifier : `https://<domaine>` (SSL Vercel émis automatiquement),
    `https://www.<domaine>` (redirige), `https://media.<domaine>/<une-clé>`.

## Phase 6 — Consolidation (dans la semaine)

23. 🤖 **Sauvegardes** : le workflow `.github/workflows/backup.yml` est prêt.
    🧑 Créer les 6 secrets GitHub listés en tête du fichier, ajouter la règle
    de cycle de vie « expiration 30 j » sur `ac-backups/db/` (dashboard R2),
    puis lancer une fois à la main (Actions → backups → *Run workflow*).
24. 🧑 **Test de restauration** (obligatoire — une sauvegarde non testée
    n'existe pas) : télécharger le dump du jour, puis
    ```bash
    openssl enc -d -aes-256-cbc -pbkdf2 -in db_<date>.sql.gz.enc \
      -pass pass:<PHRASE> | gunzip | psql <URL_D_UNE_BRANCHE_NEON_DE_TEST>
    ```
25. 🧑 **Monitoring** : UptimeRobot (compte email cliente) → moniteur HTTPS sur
    `https://<domaine>` + alerte email.
26. 🧑 **Nettoyage des accès** :
    - purger les comptes admin de dev en base (`admin@preprod.local`…) via
      l'admin → Utilisateurs ;
    - révoquer les anciennes clés (stockage actuel, tokens) ;
    - après **2 semaines** de recul : supprimer l'ancien projet Vercel, le
      Neon perso et l'ancien bucket.

---

## Checklist finale avant remise au client

- [ ] `AUTH_SECRET` régénéré, aucun secret hérité de l'environnement perso
- [ ] 2FA active sur GitHub / Vercel / Cloudflare / Neon
- [ ] Comptes admin : uniquement des emails réels, rôles vérifiés
- [ ] `NEXT_PUBLIC_SITE_URL` = domaine final ; sitemap/robots/canonical OK
- [ ] Redirection www → apex effective ; SSL valide (apex, www, media)
- [ ] Mentions légales complètes ; email de contact réel
- [ ] Upload + suppression photo testés en prod ; invitation utilisateur testée
- [ ] Sauvegarde quotidienne verte + **une restauration testée**
- [ ] Monitoring uptime actif, alerte reçue lors d'un test
- [ ] Lighthouse mobile/desktop passé sur le domaine final
- [ ] Procédure de rollback connue : Vercel → *Instant Rollback* ; DNS → repointer
- [ ] Mini-doc de passation remise (qui possède quoi, coûts, contacts)

## Rollback

- **Avant l'étape 20** : rien à faire, l'ancien site n'a jamais cessé de servir.
- **Après bascule DNS** : repointer les nameservers Wix vers l'ancien état
  (noter l'état initial avant de le changer !) — ou corriger les
  enregistrements dans Cloudflare (TTL 300 s → effet en minutes).
- **Mauvais déploiement** : Vercel → Deployments → *Instant Rollback*.
- **Base corrompue** : restaurer le dump chiffré du matin (cf. §24) ou
  point-in-time restore Neon.

## Notes de portabilité (sortie de secours)

- **Base** : le code accepte tout Postgres standard (driver auto-détecté dans
  `src/server/db/index.ts` — Neon HTTP si l'URL contient `neon.tech`, sinon
  node-postgres). Migrer = dump/restore + changer `DATABASE_URL`.
- **Images** : tout passe par les variables `S3_*` (n'importe quel stockage
  S3-compatible) et le domaine `media.<domaine>` → changer de fournisseur =
  copier les objets + repointer le domaine. **Aucune réécriture de base.**
- **Hébergement** : Next.js reste portable (VPS + `next start`, OpenNext…) ;
  seuls l'ISR/CDN et les previews sont du confort Vercel.
