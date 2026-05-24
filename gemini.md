# Context Proiect Hackathon: SafeCall (modul Digital Romania)

## 1. Informații Generale
* **Eveniment:** Cluj Hackathon 2026 Digital Romania (timp de lucru 48h).
* **Nume Proiect:** SafeCall.
* **Scop:** Un sistem de triaj digital (asistent vocal AI) care acționează ca un filtru primar pentru apelurile de urgență (112), reducând încărcarea sistemului pentru cazurile non-critice (aprox. 40% din apeluri) și eliminând barierele de limbă.
* **Criterii principale:** Impact Social, UX/Usability, Fezabilitate, Demonstrație funcțională.
* **Stack AI vizat:** OpenAI Whisper (Speech-to-Text & Traducere directă din orice limbă) + OpenAI GPT-4o-mini (Extragere entități și generare JSON structurat).

## 2. Autentificare și Securitate a Datelor (Mock ROeID)
* **Onboarding (Prima deschidere):** Simulare de autentificare guvernamentală (ROeID). Utilizatorul introduce un `nume_de_utilizator` și trece printr-o validare 2FA (simulare cod SMS).
* **Baza de date Mock:** Pe baza numelui de utilizator, aplicația descarcă de pe server *Dosarul Medical* (nume, CNP, istoric medical, alergii, medicație). Aceste date vor influența prompt-ul trimis către GPT-4o-mini.
* **Securitate zilnică:** După configurare, accesul în aplicație (mai ales la secțiunea *Profile*) se face pe baza unui PIN de 4 cifre.
* **Bypass de Urgență:** Pe ecranul de Onboarding există un flux alternativ de tipul "Sari peste - Am o urgență acum!", care permite accesul direct la butonul de 112, dar fără preluarea fișei medicale.

## 3. Experiența Utilizatorului (UX) și Interfața (UI)
* **Navigație:** Două ecrane principale: `Home` (Dashboard urgențe) și `Profile` (Date personale și medicale din ROeID).
* **Butonul Principal de Acțiune (Home):** Un buton central mare. Interacțiune: *Tap-to-talk* (apeși o dată pentru a iniția ascultarea Whisper) / *Tap-to-stop* (apeși din nou pentru a opri înregistrarea și a trimite la procesare).
* **Butonul 112 (Fail-safe):** Prezent permanent în colțul ecranului. Pentru a evita apăsările accidentale, declanșarea apelului către 112 necesită un **long-press de 1.5 secunde**.
* **Disclaimere Obligatorii (Afișate constant în UI):**
  1. *"ID-ul tău digital, alergiile și medicația sunt deja pregătite. Dacă AI-ul detectează o urgență reală, le transmite la 112 împreună cu fișa, în mai puțin de o secundă."*
  2. *"SafeCall nu blochează niciodată un apel la 112. Poți suna direct oricând din colțul ecranului."*

## 4. Pipeline-ul de Procesare AI
1.  **Whisper API:** Preia stream-ul audio, elimină zgomotul de fundal, identifică limba și returnează textul tradus în limba de bază (română).
2.  **GPT-4o-mini API:** Primește textul tradus + datele medicale din profilul utilizatorului (ROeID). Analizează contextul și generează un obiect JSON strict.

## 5. Structura Datelor (Generată de AI)
Aplicația se bazează pe procesarea următorului model de JSON pe care GPT-4o-mini este instruit să îl returneze:

```json
{
  "severitate_interna": 2,
  "rezumat_dispecer": "Pacientul acuză durere locală și roșeață în urma unei posibile contuzii. Mobilitate păstrată.",
  "ui_rezultat_pacient": {
    "simptome_identificate": [
      "Durere locală",
      "Roșeață",
      "Mobilitate păstrată"
    ],
    "cauze_posibile": [
      "Contuzie",
      "Escoriație superficială"
    ],
    "recomandari": [
      "Comprese reci 15 min, de 3 ori pe zi",
      "Antiinflamator topic (ibuprofen gel)",
      "Repaus relativ 24-48 h"
    ],
    "suna_112_daca_apare": [
      "Dacă apare umflătură severă, deformare sau durere ce împiedică sprijinul",
      "Dacă durerea persistă peste 72h"
    ]
  }
}

```

## 6. Logica de Rutare și Afișare (Bifurcația)

* **Caz Minor (Severitate 1-3):** Aplicația folosește obiectul `ui_rezultat_pacient` pentru a randa pe ecran carduri clare și liniștitoare (Simptome, Cauze, Recomandări). Cardul `suna_112_daca_apare` va fi afișat cu un fundal de alertă (roșu/roz deschis). În background, rulează o funcție dinamică de prioritizare care caută pe hartă cele mai apropiate farmacii/centre de permanență și le afișează utilizatorului.
* **Caz Major (Severitate 4-5):**
Aplicația execută automat un apel către 112 (sau încurajează utilizatorul să apese butonul), iar în paralel face un apel `POST` către *Serverul Dispeceratului*.

## 7. Serverul Dispeceratului (Demo-ul Live)

* Trebuie simulat un server backend separat (Node.js/Python) care are o interfață web de dispecerat.
* Când aplicația mobilă înregistrează un Cod Roșu (Severitate 4-5), trimite către acest server un payload conținând:
* Locația GPS a telefonului.
* `rezumat_dispecer` (Textul sumarizat de AI).
* Fişa medicală extrasă prin ROeID.


* Dispecerul (laptopul juriului/mentorilor) primește o notificare vizuală instantanee (via WebSockets sau Polling) cu toate aceste date gata structurate.