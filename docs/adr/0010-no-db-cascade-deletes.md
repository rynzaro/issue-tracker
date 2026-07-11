# No DB cascade deletes

All FKs `onDelete: Restrict`. Service code handles deletion dependencies explicitly. ADR-0009's cascade is application-level only — DB-level cascades remain disabled to prevent accidental data loss and maintain explicit control over deletion logic.
