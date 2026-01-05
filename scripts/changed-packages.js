const { execSync } = require('child_process');

const ref = process.argv.slice(2)[0];

const getRefs = execSync(`git show-ref`);

const refs = getRefs.toString().split('\n').filter((d) => d.includes('refs/heads') || d.includes('refs/tags')).map((d) => {
  const [_, refPath] = d.split(/\s+/);
  return refPath.replace('refs/heads/', '').replace('refs/tags/', '');
});

if (!refs.includes(ref)) {
  throw new Error('The passed in Ref cannot be found');
}

const pipeline = [
  `git diff --dirstat=files,0 ${ref}`,
  `xargs dirname`,
  `cut -d/ -f1-2`,
  `sort`,
  `uniq`,
  `grep packages/`
];

const output = execSync(
  pipeline.join('|')
);

console.log(output.toString());
