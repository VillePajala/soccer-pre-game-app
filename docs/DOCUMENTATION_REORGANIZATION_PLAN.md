# Documentation Reorganization Plan

## Current Root-Level Documentation Files to Move

### 1. **CLAUDE.md** → `/docs/ai/CLAUDE.md`
- **Purpose**: AI assistant guidance for Claude Code
- **Category**: AI/Development Tools
- **Action**: Move to new `ai` subdirectory

### 2. **CONTRIBUTING.md** → Keep in root (standard practice)
- **Purpose**: Contribution guidelines
- **Category**: Project governance
- **Action**: Keep in root - this is standard GitHub/OSS practice

### 3. **PULL_REQUEST_TEMPLATE.md** → `/.github/pull_request_template.md`
- **Purpose**: PR template for GitHub
- **Category**: GitHub integration
- **Action**: Move to `.github` directory (GitHub standard)

### 4. **MANUAL_TESTING.md** → `/docs/testing/MANUAL_TESTING_GUIDE.md`
- **Purpose**: Manual testing procedures
- **Category**: Testing documentation
- **Action**: Move to `testing` subdirectory

### 5. **AGENTS.md** → `/docs/ai/AGENTS.md`
- **Purpose**: AI agent configurations
- **Category**: AI/Development Tools
- **Action**: Move to `ai` subdirectory

### 6. **SECURITY_ADVISORIES.md** → `/docs/security/SECURITY_ADVISORIES.md`
- **Purpose**: Security vulnerabilities and advisories
- **Category**: Security documentation
- **Action**: Move to existing `security` subdirectory

### 7. **STATS_FIX_SUMMARY.md** → `/docs/archive/STATS_FIX_SUMMARY.md`
- **Purpose**: Historical fix documentation
- **Category**: Archive/History
- **Action**: Move to existing `archive` subdirectory (duplicate exists)

### 8. **IMPORT_FIX_SUMMARY.md** → `/docs/archive/IMPORT_FIX_SUMMARY.md`
- **Purpose**: Historical fix documentation
- **Category**: Archive/History
- **Action**: Move to `archive` subdirectory

### 9. **add-players.md** → `/docs/guides/add-players.md`
- **Purpose**: Feature guide for adding players
- **Category**: User guides
- **Action**: Move to existing `guides` subdirectory

### 10. **phase4-service-worker-summary.md** → `/docs/archive/phase4-service-worker-summary.md`
- **Purpose**: Historical development phase documentation
- **Category**: Archive/History
- **Action**: Move to `archive` subdirectory

## Proposed New Directory Structure

```
docs/
├── ai/                          # NEW: AI and automation tools
│   ├── CLAUDE.md               # From root
│   └── AGENTS.md               # From root
├── architecture/               # EXISTING
├── archive/                    # EXISTING
│   ├── IMPORT_FIX_SUMMARY.md   # From root
│   ├── STATS_FIX_SUMMARY.md    # From root (merge with existing)
│   └── phase4-service-worker-summary.md  # From root
├── assets/                     # EXISTING
├── guides/                     # EXISTING
│   └── add-players.md          # From root
├── production/                 # EXISTING
├── project/                    # EXISTING
├── reference/                  # EXISTING
├── security/                   # EXISTING
│   └── SECURITY_ADVISORIES.md  # From root
├── showcase/                   # EXISTING
└── testing/                    # NEW: Testing documentation
    └── MANUAL_TESTING_GUIDE.md # From root

.github/
└── pull_request_template.md    # From root (renamed)

root/
├── README.md                   # Keep (standard)
└── CONTRIBUTING.md             # Keep (standard)
```

## Benefits of This Organization

1. **Clear categorization** - Each document has a logical home
2. **Standard conventions** - Following GitHub/OSS best practices
3. **Easier navigation** - Related documents grouped together
4. **Clean root** - Only essential files remain at root level
5. **Better discoverability** - New contributors can find docs easier

## Implementation Steps

1. Create new directories (`ai`, `testing`)
2. Create `.github` directory if it doesn't exist
3. Move files according to the plan
4. Update any internal references to moved files
5. Update CLAUDE.md paths if it references other docs
6. Commit with clear message about reorganization