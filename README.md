# Unity High Scores API

Kompletny projekt backendowy (Node.js + Express + SQLite) do uruchamiania przez Docker Compose i Portainer. **Nie zawiera strony WWW**; z endpointów korzysta Unity.

## Struktura projektu

```text
unity-highscore-complete-project/
├── src/
│   ├── server.js                    # start serwera i obsługa zatrzymania
│   ├── app.js                       # Express, middleware i błędy
│   ├── config.js                    # konfiguracja przez zmienne środowiskowe
│   ├── routes/highscore.routes.js   # routing API
│   ├── controllers/highscore.controller.js
│   ├── services/
│   │   ├── placement.service.js     # wyszukiwanie dokładne / przybliżone
│   │   └── profanity.service.js     # filtr PL/EN
│   ├── repositories/highscore.repository.js # zapytania SQL
│   ├── db/database.js               # SQLite, migracja i indeksy
│   └── utils/validation.js
├── tests/                            # testy Node.js
├── unity/UnityHighScores.cs         # przykładowy klient Unity
├── Dockerfile
├── compose.yaml
├── .dockerignore
├── .gitignore
├── .env.example
├── package.json
└── README.md
```

## Uruchomienie lokalnie

```sh
npm install
npm test
npm start
```

## Docker Compose

```sh
docker compose up -d --build
docker compose logs -f
```

API: `http://localhost:3000/api` • Health check: `http://localhost:3000/health`.

## Portainer i repozytorium GitHub

1. Wypakuj ZIP i wrzuć **zawartość katalogu projektu** do root repozytorium GitHub.
2. W Portainerze wybierz **Stacks → Add stack → Repository**.
3. Podaj URL repo i gałąź `refs/heads/main`.
4. Ustaw **Compose path** na `compose.yaml` i wdroż Stack.
5. Jeśli wymagane, ustaw zmienną `HOST_PORT` (domyślnie 3000).

Ważne: `build: { context: ., dockerfile: Dockerfile }` jest obsługiwane tylko, jeżeli Twoja instalacja Portainera udostępnia kontekst Git w czasie budowania obrazu. W pewnych środowiskach (szczególnie Agent/Swarm) build z repo może nie być obsługiwany. W takim przypadku trzeba zbudować obraz na hoście i użyć `image:` albo udostępnić obraz w rejestrze. Sam GitHub nie jest rejestrem obrazów.

**Dane są trwałe** w wolumenie `highscore_data` (SQLite: `/app/data/highscores.sqlite`). Nie uruchamiaj `docker compose down -v`, jeśli chcesz zachować wyniki. Przy wdrożeniu do innego środowiska przenieś również dane z wolumenu.

## Endpointy

### GET `/api/high-scores`

Zwraca ranking TOP 10: `{ "scores": [{ "placement": 1, "username": "Adam", "points": 9500, "timestamp": 1794672000000 }] }`.

### POST `/api/high-scores`

```json
{ "username": "Adam", "points": 9500, "timestamp": 1794672000000 }
```

- Jeden najlepszy wynik na nick (case-insensitive).
- Timestamp: **Unix time w milisekundach**, liczba całkowita.
- Nowy wynik zastępuje poprzedni tylko wtedy, gdy ma **więcej punktów**; przy słabszym rekord pozostaje niezmieniony.
- Niedozwolony nick: HTTP `422` z `error: INAPPROPRIATE_USERNAME`.
- Powtórzenie timestampu należącego do innego nicku: HTTP `409`.

### GET `/api/my-placement?timestamp=1794672000000&points=9500`

1. Najpierw szuka istniejącego rekordu po **dokładnym timestampie**.
2. Gdy znajdzie: `found: true`, `player`, do 5 pozycji wyżej i 4 niżej (`scores`).
3. Gdy nie znajdzie: wymaga `points`, oblicza hipotetyczną pozycję gracza i zwraca najbliższe rzeczywiste wyniki (`found: false`, `estimatedPlacement`, `scores`).
4. Jeśli pozycji jest mniej, **nie uzupełnia brakujących rekordów**.

Przykład:

```sh
curl -X POST http://localhost:3000/api/high-scores \
  -H 'Content-Type: application/json' \
  -d '{"username":"Adam","points":9500,"timestamp":1794672000000}'
curl 'http://localhost:3000/api/high-scores'
curl 'http://localhost:3000/api/my-placement?timestamp=1794672000000&points=9500'
```

## Unity

Zobacz `unity/UnityHighScores.cs`. W Unity ustaw bazowy adres API na adres serwera Portainera. `localhost` w kliencie oznacza urządzenie uruchamiające grę, nie host Dockera. Przekaż ten sam timestamp do POST i potem GET.

## Bezpieczeństwo

API przyjmuje wynik podawany przez klienta gry. Filtr nicków nie zapobiega oszustwom ani podszywaniu się pod użytkowników. Przed publicznym wdrożeniem warto włączyć HTTPS przez reverse proxy oraz wprowadzić uwierzytelnianie i walidację wyników po stronie serwera, rate limiting oraz limity żądań. Timestamp nie jest dowodem autentyczności wyniku.
