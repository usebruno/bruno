# Bruno CLI — Docker run reports

This folder is the bind-mount target for the Docker Compose example at [`../docker-compose.yml`](../docker-compose.yml).

When you run:

```bash
cd packages/bruno-tests
docker compose run bruno-cli
```

the container writes three report files into this directory:

| File | Format | Purpose |
|------|--------|---------|
| `results.json` | JSON | Machine-readable run summary (request/response, timings, assertion results) |
| `results.xml` | JUnit XML | For CI test reporters (GitHub Actions, GitLab CI, Jenkins, etc.) |
| `results.html` | HTML | Human-readable report you can open in a browser |

The files themselves are gitignored — only this `README.md` and the `.gitignore` are tracked, which keeps the folder present in the repo so the `./reports:/reports` bind mount has somewhere to land without needing manual `mkdir` first.

To skip a format, drop the corresponding `--reporter-*` flag from the `command:` block in `docker-compose.yml`.
