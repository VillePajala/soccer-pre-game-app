import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

function getLastCommitMessage() {
  try {
    return execSync('git log -1 --format=%B').toString().trim();
  } catch (err) {
    console.error('Failed to get commit message', err);
    return '';
  }
}

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    return pkg.version || '';
  } catch {
    return '';
  }
}

function main() {
  const notes = getLastCommitMessage();
  const version = getVersion();
  const data = { version, notes };
  writeFileSync('public/release-notes.json', JSON.stringify(data, null, 2));
  console.log('release-notes.json generated');
}

main();
