# Development guide

## Frontend

Ensure that any frontend design your craft has consistent layout, that is sleek, prefessional and consistent.
API responses are paginated with `{count, next, previous, results}` structure. Always use `response.data?.results || response.data || []` when setting state from API responses.

## Backend

Ensure before you make changes, you check what already exists and reuse/leverage that.
If you make model changes, always remember to run migrations

## Language

When ever you are writing text, always use British(UK) spelling and grammar.