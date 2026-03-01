# PolitiLocal — Design MVP

**Date :** 2026-03-01
**Stack :** Next.js 15 + Supabase + Vercel

---

## Résumé

App mobile-first permettant de scroller des questions de politique locale carte par carte (style Tinder), de voter oui/non ou choix multiple, de créer des questions, et de consulter son historique via un profil.

---

## Architecture

- **Frontend :** Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend :** Supabase (auth, PostgreSQL, Row Level Security)
- **Déploiement :** Vercel (gratuit MVP)
- **Auth :** Email/password + Google OAuth via Supabase Auth

---

## Écrans (3 onglets)

### Discover
- Feed de questions carte par carte, plein écran
- Boutons Oui/Non (ou options multiples) en bas de carte
- Après vote : animation swipe out, résultats brefs, carte suivante
- Si feed vide : message "Reviens demain" ou CTA vers Créer

### Créer
- Titre de la question (max 120 caractères)
- Type : Oui/Non ou choix multiple (jusqu'à 4 options)
- Localisation : champ texte libre (ville/quartier)
- Bouton Publier

### Profil
- Avatar + pseudo
- Onglet "Mes questions" : liste avec stats de votes
- Onglet "Mes réponses" : questions répondues avec mon vote affiché

---

## Modèle de données

```sql
users
  id uuid PK
  email text
  username text
  avatar_url text
  created_at timestamptz

questions
  id uuid PK
  author_id uuid FK → users
  text text (max 120 chars)
  type text CHECK IN ('yes_no', 'multiple')
  options jsonb NULL  -- null si yes_no, sinon [{label, value}]
  location text
  created_at timestamptz

votes
  id uuid PK
  user_id uuid FK → users
  question_id uuid FK → questions
  answer text
  created_at timestamptz
  UNIQUE(user_id, question_id)
```

### Row Level Security
- Lecture questions/votes agrégés : publique
- Création question : utilisateur authentifié
- Modification/suppression question : auteur uniquement
- Votes individuels : visibles uniquement par leur auteur

### Logique du feed
- Requête : questions WHERE id NOT IN (votes de l'utilisateur courant)
- Tri : `created_at DESC` pour le MVP
- Pagination : 10 cartes chargées à la fois

---

## Ce qui est hors scope MVP
- Notifications push
- Algorithme de ranking/recommandation
- Commentaires
- Vérification géographique (GPS)
- Modération des questions
