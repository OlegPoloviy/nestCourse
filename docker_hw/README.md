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
A few words about distroless prod - we don't have here any CMD, shell or wget, just node and it's utils, so it's super safe and secure

<img width="1388" height="116" alt="image" src="https://github.com/user-attachments/assets/80250a73-4676-4721-b175-59db418435fe" />


**Non - root user**

To check if we are not working under root user, we need to run command which will determine which user is executing this command
```bash
 docker compose run --rm migrate id
```
 And here is result

 ```bash
uid=1000(node) gid=1000(node) groups=1000(node)
```

For the ditroless - I used non-root image 
```
gcr.io/distroless/nodejs20-debian12:nonroot
```
And with help of --chown=nonroot:nonroot the app won't have any access to write into any system directories
