# Bolt's Journal - Critical Learnings

## 2025-05-18 - Unnecessary DOM re-renders in periodic polling
**Learning:** In client-side wall apps that poll backend endpoints every 10 seconds (`setInterval`), replacing `innerHTML` on every tick causes high CPU utilization, image flashes, and layout thrashing even when data is unchanged.
**Action:** Always cache serialized JSON or compute a checksum to skip DOM teardown and reconstruction when response payload is identical.
