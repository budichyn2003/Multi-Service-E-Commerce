# --- Build stage -------------------------------------------------------------
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
# No dependencies beyond pgx; go.sum is generated at build time when present.
COPY . .
RUN go mod download || true
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

# --- Runtime stage -----------------------------------------------------------
FROM alpine:3.20
RUN adduser -D -u 10001 appuser
USER appuser
WORKDIR /app
COPY --from=build /out/server /app/server
EXPOSE 8080
ENTRYPOINT ["/app/server"]
