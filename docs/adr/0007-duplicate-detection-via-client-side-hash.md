# Duplicate detection via client-side hash, rejection instead of a silent skip

Uploads should be rejected if the same file (byte-identical) already exists in the same album. We considered a server-side hash comparison (during the write that happens anyway, no extra I/O, but the full file always has to be uploaded first even for a later duplicate) and a client-side pre-check (the browser hashes the file via WebCrypto and asks, before the actual upload, whether the hash already exists in the album). We chose the client-side check because, for this album's typical shape (phone-camera videos, often uploaded over mobile data), avoiding unnecessary data transfer on a duplicate outweighs the added client complexity and the CPU cost of hashing on-device.

When a duplicate is detected, the upload is rejected (no new media item is created) instead of being silently skipped — the uploader gets a message saying that, and by whom, the file was already uploaded, instead of mistakenly seeing an upload success.

The comparison is scoped per album (index/unique constraint on `(albumId, contentHash)`), not global across all albums — the same file in two independent albums is not a duplicate, see the "Duplicate" glossary entry.

Consequence: the hash is used exclusively for duplicate comparison, not as an integrity check on the upload. A manipulated/spoofed client could send a false hash; the server-side upload handling verifies the actual file hash after the write completes, before the `MediaItem` record is created — the client-side pre-check is only an optimization to avoid unnecessary transfers, not a basis for trust.
