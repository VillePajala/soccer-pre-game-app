# 🚀 First-Time Developer Guide

Welcome to MatchDay Coach! This guide will get you up and running in 15 minutes.

## 📋 Quick Start Checklist

### 1. Prerequisites ✅
- [ ] Node.js 18+ installed
- [ ] Git configured
- [ ] VS Code or preferred editor
- [ ] Basic React/TypeScript knowledge

### 2. Environment Setup (5 minutes)
```bash
# Clone the repository
git clone https://github.com/VillePajala/soccer-pre-game-app.git
cd soccer-pre-game-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Development Server (2 minutes)
```bash
# Start development server
npm run dev

# Open browser to http://localhost:3000
# You should see the MatchDay Coach start screen
```

### 4. Verify Setup (3 minutes)
- [ ] App loads without errors
- [ ] You can create a new game
- [ ] You can add players to roster
- [ ] Timer functionality works
- [ ] Data persists after refresh

## 🗺️ Application Overview

### Core Features
- **Game Timer**: Match timing with periods and breaks
- **Player Management**: Roster management and player selection
- **Soccer Field**: Interactive field with player positioning
- **Tactics Board**: Drawing and tactical planning
- **Statistics**: Player and team performance tracking

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **State**: Zustand + React Query
- **Storage**: IndexedDB (offline) + Supabase (online)  
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **Analytics**: Sentry + Vercel Analytics

## 📁 Key Directories

```
src/
├── app/                    # Next.js app router pages
├── components/             # React components
│   ├── auth/              # Authentication components
│   ├── game/              # Game-related components  
│   └── ui/                # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and integrations
│   ├── storage/           # Storage abstraction layer
│   └── supabase/          # Supabase client configuration
├── stores/                 # Zustand state stores
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

## 🛠️ Essential Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

### Testing
```bash
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run UI component tests
npm run e2e          # Run end-to-end tests (Playwright)
```

### Database
```bash
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset local database
npm run db:seed      # Seed with sample data
```

## 🔍 Understanding the Codebase

### State Management Pattern
The app uses a hybrid state management approach:

```typescript
// Global state (Zustand)
const useUIStore = create((set) => ({
  isModalOpen: false,
  setModalOpen: (open) => set({ isModalOpen: open })
}));

// Server state (React Query)
const { data: players } = useQuery({
  queryKey: ['players'],
  queryFn: fetchPlayers
});

// Local state (useState)
const [selectedPlayer, setSelectedPlayer] = useState(null);
```

### Storage Architecture
Data flows through multiple layers:

```
User Action → Local State → Storage Manager → Provider (IndexedDB/Supabase)
```

### Component Structure
Components follow atomic design principles:

```
atoms/     # Basic UI elements (Button, Input)
molecules/ # Component combinations (SearchBox, PlayerCard)  
organisms/ # Complex components (PlayerBar, SoccerField)
templates/ # Page layouts
pages/     # Route components
```

## 🎯 Your First Contribution

### 1. Choose a Good First Issue
Look for GitHub issues labeled:
- `good-first-issue`
- `documentation`
- `minor-enhancement`

### 2. Follow the Development Process
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following code style
3. Add tests for new functionality
4. Update documentation if needed
5. Run `npm run lint` and `npm test`
6. Submit pull request

### 3. Code Style Guidelines
- Use TypeScript strictly (minimal `any` types)
- Follow React hooks best practices
- Write tests for new components/hooks
- Use descriptive commit messages
- Update documentation for changes

## 🧪 Testing Your Changes

### Unit Tests
```bash
# Test specific component
npm test -- PlayerBar

# Test with coverage
npm run test:coverage

# Update snapshots
npm test -- --updateSnapshot
```

### Integration Tests
```bash
# Test user workflows
npm run test:integration

# Test API integrations
npm run test:api
```

### Manual Testing Checklist
- [ ] Create new game works
- [ ] Player management functions correctly
- [ ] Timer starts/stops/resets properly
- [ ] Data saves and loads correctly
- [ ] Responsive design works on mobile
- [ ] Offline functionality works
- [ ] Performance is acceptable

## 🤔 Common Questions

### Q: Why IndexedDB AND Supabase?
**A:** Offline-first architecture. IndexedDB provides instant local storage, Supabase syncs when online.

### Q: Can I work offline?
**A:** Yes! The app is designed to work completely offline with local storage.

### Q: How do I debug storage issues?
**A:** Use the Storage Debug component at `/debug-storage` or check browser DevTools → Application → Storage.

### Q: Where are the translations?
**A:** In `public/locales/` with Finnish (fi) and English (en) support.

### Q: How do I add a new feature?
**A:** Start with planning in the `/docs/development/` section, then follow the testing and code quality guidelines.

## 📚 Next Steps

### Learn More
1. **[Architecture Overview](../architecture/README.md)** - Understand the system design
2. **[API Reference](../api/database-schema.md)** - Database and API documentation
3. **[Testing Guide](../production/testing/README.md)** - Comprehensive testing strategy
4. **[Contributing Guidelines](./contributing.md)** - Detailed contribution process

### Get Help
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Documentation Issues**: Use the `documentation` label

### Join the Community
- Star the repository if you find it useful
- Watch for updates and new features
- Contribute improvements and bug fixes
- Share feedback and suggestions

---

*Welcome to the team! 🎉*  
*If you have any questions, don't hesitate to ask in GitHub Discussions.*