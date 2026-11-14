# Unity High Scores — API Docker / Portainer

**Tylko REST API dla Unity**. Node.js + Express + SQLite + filtr nicków (PL/EN). Bez strony WWW, GitHub Actions i GHCR.

## Wdrożenie przez Portainer z GitHuba

1. Utwórz repozytorium GitHub i wrzuć **wszystkie pliki z tego katalogu do głównego katalogu repozytorium** (w szczególności `Dockerfile`, `compose.yaml`, `server.js`, `package.json`).
2. W Portainerze wybierz **Stacks → Add stack → Repository** (Git repository).
3. Ustaw URL repozytorium, gałąź `refs/heads/main` i **Compose path** na `compose.yaml`.
4. Opcjonalnie ustaw zmienną Stack `HOST_PORT=3000`.
5. Wdróż Stack. Definicja `build: { context: ., dockerfile: Dockerfile }` buduje obraz ze źródeł repozytorium. **Nie potrzebujesz GHCR ani GitHub Actions.**
6. Sprawdź `http://ADRES_SERWERA:3000/api/high-scores`.

**Ważne:** budowanie w ten sposób wymaga, by wersja Portainera i typ środowiska obsługiwały `build:` dla Git Stack oraz dostęp do kontekstu budowy. W niektórych środowiskach Portainer (szczególnie zdalny Agent / niektóre konfiguracje Swarm) budowanie z Git może nie być wspierane. Jeżeli pojawi się błąd `build`, użyj Dockera Compose bezpośrednio na hoście albo rozwiązania z gotowym obrazem. Sam plik Compose jest poprawną konfiguracją budowania lokalnego.

## Lokalne uruchomienie

```bash
docker compose up -d --build
```

Aktualizacja po zmianach w repozytorium: w Portainerze użyj aktualizacji/redeploy ze źródeł Git. Jeśli obraz nie został ponownie zbudowany, wywołaj redeploy z opcją przebudowania obrazu, jeśli Twoja wersja Portainera ją udostępnia. Można też na serwerze wykonać `docker compose up -d --build` w katalogu repozytorium.

## SQLite

Dane znajdują się w wolumenie `highscore_data`, pod ścieżką `/app/data/highscores.sqlite` w kontenerze. Recreate/redeploy nie usuwa tego wolumenu. **Nie usuwaj wolumenu**, jeśli chcesz zachować rekordy. Serwer wykonuje migrację istniejących tabel i w razie potrzeby dodaje kolumnę `timestamp`.

## Endpointy

- `GET /api/high-scores` — TOP 10 wyników.
- `POST /api/high-scores` — zapis najlepszego wyniku gracza. Przykładowe JSON:

```json
{"username":"Ala","points":1500,"timestamp":1794672000000}
```

Nick 1–24 znaki, filtr wulgaryzmów PL/EN (odrzucenie: **HTTP 422**); wynik musi być nieujemną liczbą całkowitą, timestamp dodatnią liczbą całkowitą Unix w **milisekundach**. Ten sam nick przechowuje tylko najlepszy wynik, wraz z jego timestampem. Timestampy w bazie muszą być unikatowe (konflikt **HTTP 409**).

- `GET /api/my-placement?timestamp=1794672000000&points=1500` — wyszukuje dokładny timestamp. Jeżeli wynik istnieje, pokazuje gracza, maksymalnie 5 osób przed nim i 4 po nim. W przeciwnym razie szacuje pozycję na podstawie `points` i zwraca pobliskie istniejące wyniki, bez dodawania fikcyjnego wpisu. `points` wymagane dla wyszukiwania przybliżonego.

Skopiuj `UnityHighScores.cs` do Unity i ustaw URL na `http://ADRES_SERWERA:3000/api` lub adres HTTPS reverse proxy. Używaj *tego samego* timestampu podczas zapisu i odczytu pozycji.

## Bezpieczeństwo

API na tym etapie ufa punktom i timestampom otrzymywanym od klienta. Przed publikacją gry dodaj uwierzytelnianie, ograniczenie liczby żądań i mechanizm weryfikacji wyników, a także HTTPS.
