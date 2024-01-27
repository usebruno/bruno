String Interpolation

### Goal

Today our interlation logic is duplicated across multiple packages.
The goal is to centralize a single source of truth for all interpolation logic.

### Considerations

- We want to be flexible in terms of key naming conventions.
- We plan to support Nested environments in the future.

### Moving away from handlebars

I think its time to move away from handlebars.
We don't need the full power of handlebars and write a custom interpolation function that meets our needs.
