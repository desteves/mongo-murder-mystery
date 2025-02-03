# [MongoDB Murder Mystery](https://mongomurdermystery.com)

## Can you find out whodunnit?

![Description of image](./app-frontend/murdermystery/src/assets/mdb-search.png)

Uh Oh! There's been a murder in MongoDB City, and the detective needs your help.  The MongoDB Murder Mystery is designed to be both a self-directed lesson to learn MongoDB concepts and commands and a fun game for experienced MongoDB users to solve an intriguing crime.

If you just want to solve the mystery, go to [mongomurdermystery.com](https://mongomurdermystery.com). If you're new to MongoDB, you may want to start at our [walkthrough](https://mongomurdermystery.com/walkthrough). It won't teach you everything about MongoDB, but it should teach you all that you need to solve the mystery.

## What else is here?

All the code to run the https://mongomurdermystery.com site can be found in this repo.

### Front-end

The front-end is a Vite.js application. It has mostly static content and a MongoDB Shell-like prompt so the users can write their own queries and send them to the backend when they click "RUN". To run the front-end locally,

```bash
cd app-frontend/murdermystery
docker build --build-arg API_BASE_URL=http://localhost:3000 -t fe .
docker run -p 8080:8080 fe
```

### Back-end

The back-end is a Node.js application. It accepts GET requests on the  `/eval` endpoint with a `query` parameter. This is an URI-encoded mongodb query. It gets parsed and send to MongoDB Atlas. The results are returned as a `JSON` response. MongoDB Atlas runs on a free-forever small instance. To run the back-end locally,

```bash
cd app-backend
docker build -t mmm-api .
docker run -p 3000:8080 --env-file .env mmm-api
```

## Inspiration

This murder mystery was inspired by the [SQL Murder Mystery](https://github.com/NUKnightLab/sql-mysteries).

## TODOs

- Add arch diagram
- Use EJSON instead of JSON
- Add a Python version
- Add an AI track

## Copyright and License

- [MIT License](./LICENSE)
