# Bolt's Journal - Critical Learnings

## 2025-05-19 - Non-blocking async file I/O for polled endpoints
**Learning:** In Node.js Express endpoints that are polled frequently by clients (e.g., gallery images polled every 10 seconds), using synchronous filesystem calls (`fs.readdirSync`, `fs.statSync`) blocks the single-threaded event loop and degrades server response time under concurrent requests.
**Action:** Always use `fs.promises` with `Promise.all` for parallel non-blocking disk I/O in Express handlers.

## 2025-05-18 - Unnecessary DOM re-renders in periodic polling
**Learning:** In client-side wall apps that poll backend endpoints every 10 seconds (`setInterval`), replacing `innerHTML` on every tick causes high CPU utilization, image flashes, and layout thrashing even when data is unchanged.
**Action:** Always cache serialized JSON or compute a checksum to skip DOM teardown and reconstruction when response payload is identical.
