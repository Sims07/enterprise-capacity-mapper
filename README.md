# 🏢 Éditeur Graphique de Capacités SI & Impact Mapper

> **Un outil lightweight, visuel et interactif pour modéliser les capacités métier (L0 / L1), cartographier les applications du SI et simuler l'impact des projets d'architecture.**

---

## 📌 Présentation

Cet outil a été conçu pour faire le pont entre la **Vision Architecture d'Entreprise (EA)** et l'**Architecture Solution**. 

Il permet aux équipes d'architecture :
1. De définir clairement les **Domaines Métier (Niveau 0)** et leurs **Capacités (Niveau 1)**.
2. D'affecter dynamiquement les **Applications du SI** aux capacités qu'elles couvrent via une interface **Drag & Drop** moderne.
3. De simuler instantanément l'**impact d'une nouvelle fonctionnalité / projet** pour identifier les applications à modifier, les redondances applicatives et les **capacités non couvertes (trous de couverture / Gaps)**.

---

## ✨ Fonctionnalités Clés

- 🎨 **Planche de Cartographie Interactive (L0 & L1)** : Visualisation sous forme de conteneurs de capacités (L0) regroupant leurs sous-capacités (L1).
- 🖱️ **Glisser-Déposer (Drag & Drop)** : Affectez ou désaffectez facilement les applications entre le bac d'attente et les capacités L1 sur la planche de travail.
- ⚡ **Simulateur d'Analyse d'Impact** :
  - Saisissez le projet ou la fonctionnalité ciblée.
  - Sélectionnez les capacités L1 sollicitées.
  - Repérez en un coup d'œil les applications impactées (surbrillance indigo) et les **gaps de couverture** (boîtes clignotantes en rouge).
- ⚠️ **Détection de Redondances** : Identification visuelle des capacités couvertes par plusieurs applications concurrentes (Shadow IT, doublons ERP/SaaS).
- 💾 **Persistance LocalStorage & Export/Import JSON** : Sauvegarde automatique locale de l'état de la planche, avec export JSON un clic pour archivage ou partage avec l'équipe.
- 🚀 **Zero-Dependency Build** : Fichier HTML unique auto-contenu utilisable directement dans un navigateur sans installation ni serveur Web.

---

## 🚀 Démarrage Rapide

### Prérequis
Aucune installation de Node.js, npm ou serveur web n'est requise.

### Lancement
1. Clonez ce dépôt sur votre poste :
   ```bash
   git clone https://github.com/votre-compte/capacites-si-impact-mapper.git
   ```
2. Ouvrez le fichier `index.html` directement dans n'importe quel navigateur moderne (Chrome, Edge, Firefox, Safari).

---

## 📖 Guide d'Utilisation

### 1. Modélisation de la Cartographie
- **Créer un Domaine (L0)** : Cliquez sur `+ Domaine (L0)` dans la barre supérieure pour ajouter un grand domaine fonctionnel (ex: *Finance & Comptabilité*, *CRM & Ventes*).
- **Créer une Capacité (L1)** : Cliquez sur `+ Capacité (L1)` dans l'en-tête d'un domaine L0 pour ajouter une sous-capacité métier précise (ex: *Facturation & Recouvrement*).
- **Créer une Application** : Cliquez sur `+ Application` pour ajouter un composant applicatif à votre inventaire SI avec son statut (*Actif*, *Cible*, *Obsolète*).

### 2. Affectation des Applications (Drag & Drop)
- Glissez-déposez les cartes d'applications depuis le **Bac d'Applications SI** (panneau latéral gauche) vers les boîtes de capacités L1 sur la planche.
- Pour désassigner une application, glissez-la vers la zone **"Déposer ici pour désassigner"** dans le panneau latéral.

### 3. Simulation d'Impact de Projet
1. Basculez en mode `⚡ Mode Analyse d'Impact` dans la barre de contrôle supérieure.
2. Saisissez le nom de votre projet ou fonctionnalité (ex: *Mise en place d'un Portail Client B2B*).
3. Cliquez directement sur la planche sur les capacités L1 sollicitées par le projet.
4. L'outil calcule automatiquement :
   - Le nombre d'applications impactées dans votre SI.
   - Les **Gaps** (capacités visées mais dépourvues de toute application).

---

## 🛠️ Stack Technique

- **Frontend Core** : React 18 (standalone via CDN) + Babel Standalone
- **Styling UI** : Tailwind CSS (CDN) + Icons Unicode / Emojis
- **Interactions** : HTML5 Drag and Drop API native
- **Persistance** : LocalStorage & Web Blob API pour les exports `.json`

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE) - libre réutilisation pour vos travaux d'architecture d'entreprise et projets SI.