<p align="center"><img src="../../src/icons/icon-128.png" width="88" height="88" alt="Icône de Tab Manager"></p>
<h1 align="center">Tab Manager</h1>
<p align="center">Your tabs, in order.</p>

<p align="center"><a href="../../README.md">简体中文</a> | <a href="README.en.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.ko.md">한국어</a> | <a href="README.it.md">Italiano</a> | Français</p>

> Cette traduction est générée par l'IA et peut contenir des imprécisions. Le [README chinois](../../README.md) fait référence. La traduction de la documentation ne signifie pas que l'interface du plugin est disponible en français.

<p align="center"><strong>📦 Télécharger :</strong> <a href="https://github.com/Ueky2000/zotero-tab-manager/releases/latest">Plugin Zotero XPI</a> · <a href="https://github.com/Ueky2000/zotero-tab-manager/releases">Anciennes versions</a> · <a href="#utilisation">Utilisation</a></p>

## Pourquoi Tab Manager ?

Quand on ouvre des dizaines d'articles, les onglets s'accumulent, les titres sont tronqués et il devient difficile de retrouver un document ou de se rappeler pourquoi on l'avait ouvert. Tab Manager organise ces onglets autour de vos sujets de recherche.

| Fonction | Utilité |
| --- | --- |
| 🗂️ Groupes par thème | Réunissez les documents d'un projet, d'une méthode ou d'une tâche de lecture. Une fois le travail terminé, fermez tous les onglets du groupe. |
| 🎨 Couleurs et repli | Personnalisez les couleurs et repliez les groupes inutilisés. La section des onglets non groupés le permet aussi. |
| ✍️ Mémos personnels | Ajoutez « Vérifier les expériences » ou « Code disponible ». Affichez le titre original, le mémo ou les deux, avec un réglage commun au groupe. |
| 🔎 Recherche dans les documents ouverts | Cherchez dans les mémos, les noms de fichiers et les titres originaux, y compris dans les groupes repliés, puis accédez au résultat. |
| 🕒 Suggestions de fermeture | Repérez les documents non consultés depuis longtemps et le nombre de jours écoulés. Vous choisissez lesquels fermer. |
| 💾 Reprendre la lecture | Retrouvez les groupes, couleurs, ordre, mémos et états repliés après un redémarrage. |

Les groupes et les onglets des documents partagent la même ligne. Fermer des onglets ne supprime ni les références ni les pièces jointes de la bibliothèque.

## Installation

1. Téléchargez le fichier **`.xpi`** depuis la [dernière version](https://github.com/Ueky2000/zotero-tab-manager/releases/latest).
2. Dans Zotero, ouvrez **Outils → Plugins → roue dentée → Installer un module depuis un fichier**, puis sélectionnez-le. Certaines versions utilisent le nom « Modules complémentaires ».
3. Ouvrez quelques articles, créez un groupe avec **+** dans la barre d'onglets et faites glisser les onglets sur son nom.

Vous pouvez installer par-dessus une ancienne version en conservant vos réglages. Redémarrez Zotero si nécessaire.

## Utilisation

- **Groupes :** faites glisser un onglet sur le nom d'un groupe ou utilisez son menu contextuel. Cliquez sur le nom pour replier ou déplier le groupe ; faites glisser le nom pour modifier l'ordre des groupes.
- **Glisser-déposer :** les repères distinguent l'ajout à un groupe de l'insertion avant ou après un document. Survolez un groupe replié pendant environ 600 ms pour le déplier temporairement ; annuler le déplacement rétablit son état.
- **Couleurs :** dans le menu du groupe, choisissez une couleur prédéfinie ou saisissez une valeur hexadécimale. Cela fonctionne aussi pour les onglets non groupés.
- **Mémos :** définissez-les dans le menu de l'onglet. Le menu du groupe permet d'uniformiser l'affichage des membres actuels et futurs.
- **Recherche :** utilisez la commande à droite. Sélectionner un résultat déplie son groupe et active le document.
- **Suggestions de fermeture :** le bouton tout à droite liste les documents inactifs ; le seuil par défaut de 7 jours est réglable. Rien n'est fermé automatiquement. Le suivi commence lorsque le plugin commence à enregistrer les consultations.
- **Fermer les onglets d'un groupe :** le menu du groupe ferme les onglets de lecture en conservant leur appartenance au groupe. Dissoudre le groupe supprime plutôt le regroupement.

Ordre du menu du groupe : renommer, dissoudre, couleur, affichage des onglets, fermer tous les onglets du groupe.

La version 0.5.1 corrige le débordement des onglets qui masquait les commandes à droite. La molette permet le défilement horizontal et l'activation d'un onglet hors champ le ramène automatiquement dans la zone visible.

## Compatibilité

Un même XPI vise **Zotero 6.0–10.0.x**. Le 2026-11-17, des profils Windows isolés ont passé 34 vérifications d'installation et de fonctions principales sur 6.0.36, puis 38 chacune sur 7.0.32, 8.0.4, 9.0.6 et 10.0.8. La version 7.0.32 a aussi passé 130 vérifications de non-régression. macOS, Linux et les autres versions correctives n'ont pas été vérifiés sur des installations réelles. Voir le [compte rendu des tests](../COMPATIBILITY.md).

## Données et mises à jour

Les réglages utilisent l'identifiant de bibliothèque et la clé de la pièce jointe et restent dans le profil local Zotero ; ils ne sont pas synchronisés avec la bibliothèque. Les noms de fichiers, titres et notes Zotero ne sont pas modifiés. Désactiver le plugin restaure la barre d'onglets native et conserve les réglages.

L'identifiant `tab-groups@local.zotero` et la préférence `extensions.tabGroups.state` restent inchangés pour préserver les réglages et l'historique des consultations. Les fonctions courantes n'envoient pas d'informations sur les documents. Zotero peut consulter le manifeste et les paquets de ce dépôt selon ses paramètres de mise à jour des modules.

## Documentation et retours

[Historique des modifications](../CHANGELOG.md) · [Instructions de compilation](../DEVELOPMENT.md) · [Signaler un problème](https://github.com/Ueky2000/zotero-tab-manager/issues)

Précisez la version de Zotero, le système d'exploitation, les étapes de reproduction et joignez une capture d'écran. Les documents techniques liés sont dans leurs langues d'origine.

[Licence MIT](../../LICENSE).
