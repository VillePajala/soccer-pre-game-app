import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

function getLastCommitMessage() {
  try {
    const full = execSync('git log -1 --format=%B').toString().trim();
    const lines = full
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return '';
    }

    if (lines[0].startsWith('Merge pull request')) {
      return lines[lines.length - 1];
    }

    return lines[0];
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
