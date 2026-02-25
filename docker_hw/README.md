** Docker homework **
How to run everything : 

local dev
```bash
 docker compose -f compose.yaml -f compose.dev.yaml up --build
```
prod-like
```bash
docker compose up --build
```
migrations and seed
```bash
docker compose run --rm migrate
docker compose run --rm seed
```

**Optimisation proofs**
To test everything, I just built 3 images from my Dockerfile
<img width="1388" height="116" alt="image" src="https://github.com/user-attachments/assets/80250a73-4676-4721-b175-59db418435fe" />
