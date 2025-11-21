# Bruno Coding Standards

- No diffs unless an actual change is made, the code changes need to be as minimal as possible, avoid making un-necessary whitespace diffs. This is already handled by eslint but make sure you check your code changes before commiting and raising a PR.

## General Style Rules

- Use 2 spaces for indentation. No tabs, just spaces – keeps everything neat and uniform.

- Stick to single quotes for strings. Double quotes are cool elsewhere, but here we go single.

- Always add semicolons at the end of statements. It's like putting a period at the end of a sentence – clarity matters.

- JSX is enabled, so feel free to use it where it makes sense.

## Punctuation and Spacing

- No trailing commas. Keep it clean, no extra commas hanging around.

- Always use parentheses around parameters in arrow functions. Even for single params – consistency is key.

- For multiline constructs, put opening braces on the same line, and ensure consistency. Minimum 2 elements for multiline.

- No newlines inside function parentheses. Keep 'em tight.

- Space before and after the arrow in arrow functions. `() => {}` is good.

- No space between function name and parentheses. `func()` not `func ()`.

- Semicolons go at the end of the line, not on a new line.

- No strict max length – write readable code, not cramped lines.

- Multiple expressions per line in JSX are fine – flexibility is nice.

Remember, these rules are here to make our codebase harmonious. If something doesn't fit perfectly, let's chat about it. Happy coding! 🚀

## Readability and Abstractions

- Avoid abstractions unless the exact same code is being used in more than 3 places.
- Names for functions need to be concise and descriptive.
- Add in JSDoc comments to add more details to the abstractions if needed.
- Follow functional programming but just enough to be readable, we don't need to go as deep as ADTs and Monads, we want to keep the code pipeline obvious and easy for everyone to read and contribute to.
- Avoid single line abstractions where all that's being done is increasing the call stack with one additional function.
- Add in meaningful comments instead of obvious ones where complex code flow is explained properly.
