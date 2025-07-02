# Contributing to ResumeCraft

Thank you for your interest in contributing to ResumeCraft! We welcome contributions from the community and are pleased to have you here.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Requests** - Suggest new features or improvements
- 📝 **Documentation** - Improve our docs and guides
- 🔧 **Code Contributions** - Submit bug fixes or new features
- 🎨 **Design** - UI/UX improvements and new templates
- 🧪 **Testing** - Help us improve test coverage

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Supabase account (for database testing)

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/resumecraft.git
   cd resumecraft
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Configure environment**
   ```bash
   # Copy and edit environment files
   cp env.example backend/.env
   # Edit backend/.env with your test credentials
   ```

5. **Run the application**
   ```bash
   # Terminal 1: Backend
   cd backend && python main.py
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

## 📝 Development Guidelines

### Code Style

#### Python (Backend)
- Follow **PEP 8** style guide
- Use **type hints** for all functions
- Write **docstrings** for classes and functions
- Use **async/await** for database operations

```python
async def get_user_resumes(
    user_id: int, 
    db: AsyncSession
) -> List[Resume]:
    """
    Retrieve all resumes for a specific user.
    
    Args:
        user_id: The ID of the user
        db: Database session
        
    Returns:
        List of resume objects
    """
    result = await db.execute(
        select(Resume).where(Resume.user_id == user_id)
    )
    return result.scalars().all()
```

#### TypeScript (Frontend)
- Use **TypeScript** for all new code
- Follow **React best practices**
- Use **functional components** with hooks
- Implement **proper error handling**

```typescript
interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
}

const useUserProfile = (): {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
} => {
  // Implementation...
};
```

### Commit Convention

We use **Conventional Commits** for clear commit messages:

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Adding or updating tests
- chore: Maintenance tasks

Examples:
feat(auth): add Supabase authentication
fix(editor): resolve LaTeX compilation error
docs(readme): update installation instructions
```

### Branch Naming

```
feature/description-of-feature
bugfix/description-of-bug
docs/description-of-docs-change
refactor/description-of-refactor
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:e2e
```

### Add Tests for New Features
- **Unit tests** for utility functions
- **Integration tests** for API endpoints
- **Component tests** for React components
- **E2E tests** for critical user flows

## 📋 Pull Request Process

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Backend
   cd backend && pytest
   
   # Frontend
   cd frontend && npm test
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the PR template
   - Link related issues
   - Add screenshots for UI changes
   - Request review from maintainers

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## 🐛 Bug Reports

When filing a bug report, please include:

1. **Clear title** and description
2. **Steps to reproduce** the issue
3. **Expected vs actual behavior**
4. **Environment details** (OS, browser, versions)
5. **Screenshots or videos** if applicable
6. **Error messages** or console logs

Use this template:

```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10, macOS 12.0]
- Browser: [e.g. Chrome 91, Firefox 89]
- Version: [e.g. 1.2.3]

**Additional Context**
Any other context about the problem.
```

## 💡 Feature Requests

When suggesting a feature:

1. **Use a clear title** that summarizes the feature
2. **Describe the problem** this feature would solve
3. **Explain the proposed solution**
4. **Consider alternatives** you've thought about
5. **Add mockups or examples** if helpful

## 🏗️ Architecture Overview

```
ResumeCraft/
├── backend/                 # FastAPI backend
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── utils/              # Utilities
│   └── database.py         # Database models
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   └── config/         # Configuration
└── docs/                   # Documentation
```

## 🔧 Development Tools

### Recommended VS Code Extensions
- Python
- Pylance
- TypeScript Importer
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- GitLens

### Useful Commands
```bash
# Backend formatting
black backend/
isort backend/

# Frontend formatting
cd frontend && npm run format

# Type checking
cd frontend && npm run type-check

# Linting
cd frontend && npm run lint
```

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/yourusername/resumecraft/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/resumecraft/issues)
- 📧 Email: contribute@resumecraft.dev

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🎉 Recognition

Contributors will be:
- Added to the [Contributors list](https://github.com/yourusername/resumecraft/graphs/contributors)
- Mentioned in release notes for significant contributions
- Invited to the contributors Discord server

Thank you for contributing to ResumeCraft! 🚀 