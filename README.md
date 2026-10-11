# Satellite Stream Buddy

Vous êtes un expert en développement Frontend Web/Mobile, spécialisé dans les applications IPTV/EPG sans backend et destinées aux Smart TV / appareils mobiles.



### CONTEXTE ET ARCHITECTURE ACTUELLE

- Projet : PulseEPG.

- Architecture : Application 100% Client-Side (aucun backend propriétaire).

- Sources de données EPG : API externe `epgshare01.online` et parseur de fichiers CHMAX JSON / EPG XMLTV/JSON.

- Interface : Compatible navigation D-Pad (Smart TV) et Touch (Mobile/Tablette), avec modale de confirmation à la sortie et filtrage par bouquet/satellite.



### OBJECTIFS DE LA MISE À JOUR

1. Prendre en charge et structurer la liste complète des 13 satellites (Astra 19.2E, Badr 26E, Hotbird 13E, Eutelsat 7B/7C, TurkmenÄlem/MonacoSat 52E, Astra 28.2E, Star One D2 70W, Türksat 42E, Hispasat 30W, Astra 3B 23.5E, SES-6 40.5W, Nilesat 7W, Amazonas 61W).

2. Refondre la stratégie d'i18n (Internationalisation) et de détection initiale au lancement de l'application.

3. Implémenter une logique de détection automatique de la région géographique / langue système avec gestion des positions orbitales et des edge cases (notamment la zone MENA / Afrique du Nord & Moyen-Orient).



---



### SPÉCIFICATIONS TECHNIQUES À DÉVELOPPER



#### 1. MAPPING DES 13 SATELLITES ET ORBITES

Créer ou mettre à jour la constante/configuration des satellites avec leurs positions orbitales et zones de couverture :

- Index 0: Astra 19.2°E (Europe / MENA)

- Index 1: Badr 4/5/6/7 26.0°E (MENA / Gulf)

- Index 2: Hotbird 13.0°E (Europe / MENA)

- Index 3: Eutelsat 7B/7C 7.0°E (Europe / Middle East / Africa)

- Index 4: TurkmenÄlem/MonacoSat 52.0°E (Middle East / Europe / Central Asia)

- Index 5: Astra 2 28.2°E (UK / Europe)

- Index 6: Star One D2 70.0°W (LATAM / South America)

- Index 7: Türksat 3A/4A 42.0°E (Turkey / Europe / Middle East)

- Index 8: Hispasat 30W-5/30W-6 30.0°W (Europe / LATAM)

- Index 9: Astra 3B 23.5°E (Europe)

- Index 10: SES 6 40.5°W (LATAM / North America)

- Index 11: Nilesat 201 7.0°W (MENA / North Africa)

- Index 12: Amazonas 2 61.0°W (LATAM)



#### 2. STRATÉGIE DE LANGUE ET LOCALISATION DE L'INTERFACE

- Détecter la langue du système/téléphone (`navigator.language` / `locale`) au premier démarrage.

- Traduire automatiquement tous les éléments d'interface (UI, boutons, catégories, paramètres, modale d'exit) dans la langue du téléphone.

- Gérer les langues prioritaires : Arabe (`ar`), Français (`fr`), Anglais (`en`), Espagnol (`es`), Portugais (`pt`), Allemand (`de`), Turc (`tr`).

- Support RTL (Right-to-Left) natif pour la langue arabe (`dir="rtl"`).



#### 3. LOGIQUE AUTO-SELECT SATELLITES (RÉGION & GEOGRAPHIC POSITIONING)

Mettre en place une logique de pré-sélection des satellites lors du premier lancement :

- **Cas 1 : Langue Arabe (`ar`) / Région MENA (Afrique du Nord, Moyen-Orient, Golfe)**

  * Satellites pré-sélectionnés : Nilesat (7W), Badr (26E), Hotbird (13E), Astra (19.2E), Eutelsat (7E).

  * Justification : Cette zone géographique capte simultanément plusieurs positions orbitales d'Est en Ouest tout en gardant l'Arabe comme langue unifiée et multilingue.

- **Cas 2 : Langue Espagnole / Portugaise (`es`, `pt`) ou LATAM**

  * Satellites pré-sélectionnés : Hispasat (30W), Star One D2 (70W), Amazonas (61W), SES-6 (40.5W).

  * Exclusion stricte au niveau de l'auto-select des satellites indisponibles sur la zone Amériques (ex: Astra 19.2E ou Badr 26E).

- **Cas 3 : Langues Européennes (`fr`, `de`, `en`, `it`)**

  * Satellites pré-sélectionnés : Astra 19.2E, Hotbird 13E, Astra 28.2E, Hispasat 30W.

- **Cas 4 : Langue Turque (`tr`)**

  * Satellites pré-sélectionnés : Türksat 42E, Hotbird 13E.



#### 4. EDGE CASES & OVERRIDE MANUEL

- Si la langue ou la géolocalisation ne peut être déterminée, utiliser un fallback universel (Anglais + Hotbird / Astra 19.2E).

- Offrir dans le panneau de configuration / paramètres une option claire permettant à l'utilisateur de :

  1. Forcer la langue d'interface indépendamment du téléphone.

  2. Activer / désactiver manuellement n'importe lequel des 13 satellites sans restriction.



#### 5. INTÉGRATION EPGSHARE01 & RENDER UI

- S'assurer que le filtrage des données issues d'epgshare01.online ou du fichier CHMAX respecte le filtrage par satellite sélectionné et par langue de chaîne.

- Optimiser la mise en mémoire (IndexedDB / LocalStorage) pour gérer rapidement le catalogue des 13 satellites sans ralentir la navigation D-Pad / Smart TV.



Merci de fournir le code mi

s à jour ou le diff précis intégrant cette structure complète.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/39873e05-46e4-4ccb-bf07-5812693a5323).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
