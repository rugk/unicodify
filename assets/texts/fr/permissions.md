# Permissions requises 

Pour une explication générale des permissions d'extensions, lire [cet article du support Mozilla](https://support.mozilla.org/kb/permission-request-messages-firefox-extensions).

## Permissions à l'installation

Actuellement, aucune permission n'est requise à l'installation ou lors de la mise à jour.

## Permissions spécifiques à une fonctionnalité (facultative)

Ces permissions sont requises pour certaines actions spécifiques, si elles sont nécessaires.

| Id Interne  | Permission                                                        | Requise pour …             | Explication  |
|:------------|:------------------------------------------------------------------|:---------------------------|:-------------|
| `downloads` | Download files and read and modify the browser’s download history | Download of QR code as SVG | Needed for … |

## Permissions cachées

De plus, l'extensions nécessite ces permissions, qui ne sont pas requises dans Firefox lorsque l'extension est installée, car ce ne sont pas des permissions critiques.

| Id Interne  | Permission                | Explication                                |
|:------------|:--------------------------|:-------------------------------------------|
| `storage`   | Accéder au stockage local | Nécessaire pour sauvegarder les paramètres |
