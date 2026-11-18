<p align="center"><img src="../../src/icons/icon-128.png" width="88" height="88" alt="Icona di Tab Manager"></p>
<h1 align="center">Tab Manager</h1>
<p align="center">Your tabs, in order.</p>

<p align="center"><a href="../../README.md">简体中文</a> | <a href="README.en.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.ko.md">한국어</a> | Italiano | <a href="README.fr.md">Français</a></p>

> Questa traduzione è generata dall'IA e può contenere imprecisioni. Il [README cinese](../../README.md) è il riferimento ufficiale. La traduzione della documentazione non implica la disponibilità dell'interfaccia in italiano.

<p align="center"><strong>📦 Download:</strong> <a href="https://github.com/Ueky2000/zotero-tab-manager/releases/latest">Plugin Zotero XPI</a> · <a href="https://github.com/Ueky2000/zotero-tab-manager/releases">Versioni precedenti</a> · <a href="#utilizzo">Utilizzo</a></p>

## Perché Tab Manager?

Quando apri decine di articoli, le schede si affollano, i titoli vengono troncati ed è difficile ritrovare un documento o ricordare perché lo avevi aperto. Tab Manager organizza le schede in base al tuo lavoro di ricerca.

| Funzione | A cosa serve |
| --- | --- |
| 🗂️ Gruppi per argomento | Riunisci i documenti di un progetto, metodo o attività di lettura. Al termine, chiudi tutte le schede del gruppo. |
| 🎨 Colori e gruppi comprimibili | Scegli i colori e comprimi i gruppi che non usi. Funziona anche per le schede senza gruppo. |
| ✍️ Promemoria personali | Aggiungi etichette come «Controllare gli esperimenti» o «Codice disponibile». Mostra il titolo originale, il promemoria o entrambi, anche con un'impostazione comune per il gruppo. |
| 🔎 Ricerca nelle schede aperte | Cerca nei promemoria, nei nomi dei file e nei titoli originali, anche nei gruppi compressi, e passa al documento trovato. |
| 🕒 Suggerimenti di chiusura | Individua i documenti non consultati da tempo e i giorni trascorsi dall'ultima visita. Decidi tu se chiuderli. |
| 💾 Riprendi la lettura | Conserva gruppi, colori, ordine, promemoria e stato di compressione dopo il riavvio. |

Gruppi e schede dei documenti occupano la stessa riga. Chiudere le schede non elimina documenti o allegati dalla libreria.

Tab Manager è stato adattato per **Zotero 6–10**, con supporto per più versioni.

## Installazione

1. Scarica il file **`.xpi`** dalla [versione più recente](https://github.com/Ueky2000/zotero-tab-manager/releases/latest).
2. In Zotero apri **Strumenti → Plugin → ingranaggio → Installa componente aggiuntivo da file** e seleziona il file. In alcune versioni la pagina si chiama «Componenti aggiuntivi».
3. Apri alcuni articoli, crea un gruppo con **+** nella barra delle schede e trascina le schede sul nome del gruppo.

Puoi installare sopra una versione precedente mantenendo le impostazioni. Riavvia Zotero se necessario.

## Utilizzo

- **Gruppi:** trascina una scheda sul nome del gruppo oppure usa il menu contestuale della scheda. Fai clic sul nome per comprimere o espandere; trascina il nome per cambiare l'ordine dei gruppi.
- **Trascinamento:** gli indicatori distinguono l'aggiunta a un gruppo dall'inserimento prima o dopo un documento.
- **Colori:** dal menu contestuale del gruppo scegli un colore predefinito o inserisci un valore esadecimale. È possibile anche per le schede senza gruppo.
- **Promemoria:** impostali dal menu della scheda. Il menu del gruppo permette di uniformare la visualizzazione delle schede attuali e di quelle che verranno aggiunte.
- **Ricerca:** usa il comando a destra. Selezionando un risultato, il gruppo si espande e il documento diventa attivo.
- **Chiusure suggerite:** il comando all'estrema destra elenca i documenti inattivi; la soglia predefinita di 7 giorni è modificabile. Non chiude nulla automaticamente. Gli intervalli sono calcolati da quando il plugin inizia a registrare le visite.
- **Chiudi le schede del gruppo:** il menu contestuale chiude le schede di lettura e conserva le assegnazioni.

<details>
<summary>Novità · v0.6.4: Chiusura dei gruppi e barra degli strumenti</summary>

- **Scioglimento automatico facoltativo:** Una nuova impostazione elimina un gruppo vuoto dopo la chiusura di tutte le sue schede con un solo comando. È disattivata per impostazione predefinita; la sezione senza gruppo rimane. Se il ripristino dei gruppi è attivo, riaprire un documento può ricreare il gruppo originale.
- **Un secondo clic chiude:** Ricerca e suggerimenti di chiusura si aprono al primo clic e si chiudono al secondo. Aprire uno chiude il pannello dell'altro.
- **Impostazioni più semplici:** Il colore della sezione senza gruppo si modifica dal suo menu contestuale, senza un controllo duplicato nelle impostazioni.

Le versioni recenti hanno aggiunto anche salvataggio e ripristino dello spazio di lettura con un clic, un pannello nelle impostazioni di Zotero, elenchi numerati a due o tre colonne e soglie regolabili per la disposizione verticale. In modalità verticale, il documento attivo rimane una scheda orizzontale in alto.

[Scarica l'ultima versione](https://github.com/Ueky2000/zotero-tab-manager/releases/latest) · [Registro completo delle modifiche](../CHANGELOG.md)

</details>

## Compatibilità

Tab Manager è stato adattato per **Zotero 6.0–10.0.x**, con supporto per più versioni. Il 2026-11-17, su profili Windows isolati, sono stati superati 34 controlli di installazione e funzionalità principali su 6.0.36 e 38 ciascuno su 7.0.32, 8.0.4, 9.0.6 e 10.0.8. Su 7.0.32 sono passati anche 130 controlli di regressione. macOS, Linux e le altre versioni di manutenzione non sono stati verificati su installazioni reali. Consulta il [registro dei test](../COMPATIBILITY.md).

## Dati e aggiornamenti

Le impostazioni utilizzano l'ID della libreria e la chiave dell'allegato e restano nel profilo locale di Zotero; non vengono sincronizzate con la libreria. Nomi dei file, titoli e note di Zotero non cambiano. Disattivando il plugin si ripristina la barra originale e si conservano le impostazioni.

L'ID `tab-groups@local.zotero` e la preferenza `extensions.tabGroups.state` rimangono invariati, preservando impostazioni e cronologia delle visite. Le normali funzioni non caricano informazioni sui documenti. Zotero può accedere al manifest e ai pacchetti di questo repository secondo le proprie impostazioni di aggiornamento dei componenti aggiuntivi.

## Documentazione e segnalazioni

[Registro modifiche](../CHANGELOG.md) · [Istruzioni di compilazione](../DEVELOPMENT.md) · [Segnala un problema](https://github.com/Ueky2000/zotero-tab-manager/issues)

Includi versione di Zotero, sistema operativo, passaggi per riprodurre il problema e uno screenshot. I documenti tecnici collegati sono nelle lingue originali.

[Licenza MIT](../../LICENSE).
