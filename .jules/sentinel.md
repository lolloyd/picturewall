## 2025-05-18 - Path Traversal in Event Endpoints
**Vulnerability:** Unsanitized `eventId` parameters in GET `/api/events/:eventId` and GET `/api/events/:eventId/images` endpoints allowed arbitrary directory traversal on the filesystem via relative path payloads (`../`).
**Learning:** Concatenating route parameters directly with base directories using `path.join(__dirname, 'Events', eventId)` does not prevent directory traversal if `eventId` contains relative path sequences.
**Prevention:** Use `path.resolve` to verify that the resolved directory path starts with the absolute base directory (`path.resolve(__dirname, 'Events') + path.sep`) before accessing file system operations.
