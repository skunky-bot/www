# Skunky naming migration

Skunky is the sole product and platform name. The canonical public site is https://skunky.net/ and the application repository is https://github.com/skunky-bot/www.

The Python package and command are now `skunky`; reinstall the project and update external imports and scheduled commands when upgrading. The frontend package, worker identifiers and example database settings use the same name.

Before updating an existing runtime, back up its database and inspect the deployed configuration. Changing example database names does not migrate an existing database or credentials. Retain its explicit connection settings until a deliberate database migration is complete. Drain pending worker tasks before changing worker identifiers. This change does not modify running databases, credentials, external DNS or other repositories.
