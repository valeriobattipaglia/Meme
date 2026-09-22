# 🧊 MiniFrigo

Dashboard statico per il MiniFrigo con Firebase + Open Food Facts.

## Cosa è stato aggiunto

### 👑 Admin
- Login Firebase normale.
- Creazione/modifica/cancellazione di prodotti.
- Aggiunta prodotto tramite:
  - fotocamera del telefono;
  - lettore barcode USB/HID.
- Dati barcode salvati nel prodotto (`CodiceABarre`) per poterlo ritrovare successivamente.
- Modifica quantità manuale.

### 🥤 Ospite
- Account Firebase separato con ruolo `guest`.
- Accesso tramite barcode fisico attaccato al MiniFrigo.
- Il barcode può essere letto:
  - con il lettore Atlantis collegato al telefono/PC;
  - con la fotocamera del telefono.
- Una volta autenticato, l'ospite non può creare o cancellare prodotti.
- Può solo modificare la quantità di un'unità per scansione.
- Due modalità:
  - `− 1 Prelevo`
  - `+ 1 Rimetto`
- Ogni operazione viene registrata in `Movimenti`.

### 🔐 Sicurezza Firestore
Le regole in `firestore.rules` separano:
- `admin`: pieno controllo;
- `guest`: update della sola proprietà `Quantita`, esclusivamente di ±1;
- utente non autenticato: sola lettura pubblica dell'inventario;
- nessun client può modificare i documenti `users`.

Il controllo del ruolo avviene tramite `users/{uid}.role`.

---

# Configurazione Firebase

## 1. Abilita Authentication

Nel progetto Firebase:

**Authentication → Sign-in method → Email/Password → Enable**

## 2. Crea l'utente ospite

In:

**Authentication → Users → Add user**

usa:

```text
Email: ospite@minifrigo.app
Password: UNA_PASSWORD_CASUALE_LUNGA
```

Non usare una password semplice.

## 3. Crea il profilo Firestore

In:

**Firestore → users → [UID dell'utente ospite]**

crea:

```text
role: "guest"
```

Per l'admin il documento deve contenere:

```text
role: "admin"
```

## 4. Pubblica le Security Rules

Il file `firestore.rules` contiene le regole complete da copiare in:

**Firestore Database → Rules**

oppure da distribuire con Firebase CLI.

---

# Barcode di accesso ospite

Apri localmente:

```text
guest-key-generator.html
```

La pagina genera una chiave casuale e un barcode Code128.

Procedura consigliata:

1. Genera una chiave.
2. Copia la chiave.
3. Impostala come password dell'utente Firebase `ospite@minifrigo.app`.
4. Stampa il barcode.
5. Attaccalo al MiniFrigo.

Il barcode non è un account admin: permette solo di entrare nell'account `guest`.

> Chiunque possieda una copia del barcode può usare l'accesso ospite. Se vuoi revocarlo, cambia la password dell'utente Firebase e genera un nuovo barcode.

---

# Lettore Atlantis

Il lettore deve essere configurato come **USB HID / keyboard emulation**.

Per l'uso con smartphone serve normalmente un adattatore:

```text
USB-A femmina → USB-C maschio
```

Il browser riceve il codice dal lettore come input da tastiera.

## Login ospite

Nel campo del codice ospite:

```text
lettore → barcode sul MiniFrigo → login
```

## Gestione frigo

Dopo il login:

```text
− 1 Prelevo
+ 1 Rimetto
```

Lascia il cursore nel campo del lettore e scansiona il prodotto.

Esempio:

```text
Coca-Cola
Quantità: 8

scan
↓
Quantità: 7
```

Poi la rimetti:

```text
scan
↓
Quantità: 8
```

---

# Barcode dei prodotti

Quando un admin aggiunge un prodotto, il codice viene salvato nel documento:

```text
CodiceABarre: "5201309705015"
```

In questo modo l'ospite può scansionare direttamente quel prodotto.

La ricerca delle informazioni iniziali viene fatta su **Open Food Facts**.

Se un prodotto non è presente su Open Food Facts, il codice può comunque essere salvato manualmente dall'admin.

---

# Struttura

```text
Meme-main/
├── index.html
├── admin.html
├── guest-key-generator.html
├── firebase.js
├── firestore.rules
├── script.js
├── css/
│   └── style.css
└── js/
    ├── dom.js
    ├── firestore.js
    └── render.js
```

## Nota

`firebase.js` contiene solo la configurazione client Firebase. La `apiKey` Firebase Web non è una password: la protezione reale è affidata alle Authentication rules e alle Firestore Security Rules.

