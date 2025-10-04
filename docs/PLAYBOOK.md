# Vercel + GitHub Deployment Playbook

## Översikt

Detta dokument beskriver hur man sätter upp och konfigurerar automatiserat deployment-flöde med Vercel och GitHub enligt följande strategi:

- **main** → Vercel Production (`<prod-domän>`)
- **develop** → Vercel Preview med stabil staging-URL (`<staging-domän>`)
- **feature/*** → Vercel Preview per PR

## Branch-strategi

### Branches
- **main**: Skyddad branch, kopplad till Production
- **develop**: Skyddad branch, auto-deploy till staging-miljö
- **feature/***: Kortlivade branchar som mergas in i develop via PR
- **hotfix/***: Snabbfixar från main (för akuta produktionfixar)

### Snabbstart
```bash
git checkout -b develop
git push -u origin develop
```

## GitHub: Branch Protection & PR-flöde

### Aktivera Branch Protection Rules

#### För main:
1. Gå till **Settings** → **Branches** i GitHub-repositoryt
2. Klicka **Add rule**
3. Ange branch name pattern: `main`
4. Aktivera följande:
   - ✅ **Require pull request reviews** (t.ex. 1–2 reviewers)
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Require linear history** (valfritt men snyggt)
5. Välj required status checks:
   - `ci / build-and-test`
   - `ci / security-audit`
   - `Vercel — Preview ready` (om tillgängligt)

#### För develop:
1. Skapa ny regel med pattern: `develop`
2. Aktivera samma checks som main (minst CI)
3. Tillåt squash merges för ren historik

### Rekommenderade status checks
- `lint` (ESLint)
- `typecheck` (TypeScript)
- `build` (Next.js build)
- `security-audit` (npm audit)

## Vercel: Koppling & miljöer

### Projekt-inställningar
1. Gå till **Vercel Dashboard** → **Project Settings** → **Git**
2. Sätt **Production Branch** = `main`
3. Låt Vercel göra Preview-deploys för alla andra branchar/PRs (default)

### Staging-domän för develop
1. Gå till **Domains** i Vercel-projektet
2. Lägg till domän: `<staging-domän>` (t.ex. `stage.example.com`)
3. Under **Assign** → välj **Branch** = `develop`
4. Då pekar `<staging-domän>` alltid på senaste deploy från develop

### Prod-domän
- `<prod-domän>` (t.ex. `example.com`) är kopplad till Production (= main)

### Miljövariabler
I **Vercel** → **Environment Variables**:

- **Production**: prod-nycklar (`<ENV-nycklar>` för API_URL, KEYS, analytik etc.)
- **Preview**: staging/test-nycklar
- **Development**: lokala värden (använd `.env.local`, ignoreras av git)

## PR-flöde i praktiken

### Skapa feature-branch
```bash
git checkout -b feature/xyz
git push -u origin feature/xyz
```

### Öppna PR
1. Öppna PR: `feature/xyz` → **develop**
2. GitHub Actions kör lint/test/build
3. Vercel skapar Preview URL för PR:n (ex: `feature-xyz-abc.vercel.app`)
4. När checks passerar och review är klar → Merge till develop
5. Vercel uppdaterar staging (`<staging-domän>` pekar nu på ny deploy)

### Release till produktion
1. Öppna PR: `develop` → `main` (release-PR)
2. När PR mergas: Vercel gör Production deploy till `<prod-domän>`

## Versioner & changelog (rekommenderat)

### Conventional Commits
Använd följande commit-format:
- `feat:` - nya funktioner
- `fix:` - bugfixar
- `chore:` - underhåll
- `docs:` - dokumentation
- `style:` - formatering
- `refactor:` - refaktorering
- `test:` - tester

### Semantic Release (opt-in)
Om du vill aktivera automatisk versionering:
1. Se `semantic-release` konfiguration i `.releaserc.json`
2. Aktiveras endast på main-branch
3. Skapar automatiskt version/tag/release notes baserat på commit-meddelanden

## Kodkvalitet & "gates"

### Pre-commit hooks (rekommenderat)
För att aktivera Husky + lint-staged:
```bash
npm install --save-dev husky lint-staged
npx husky init
```

Lägg till i `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### Required reviews + Required checks
Stoppar fel push till main/develop och säkerställer kodkvalitet.

## Vanliga fällor (och fix)

### "Preview har fel env-nycklar"
→ Kontrollera att ENV är satta i Vercel på Preview-miljön

### "Staging-URL ändras hela tiden"
→ Se till att domänen är branch-bunden (Assign → Branch = develop), inte bara en "Preview alias"

### "main får pushar direkt"
→ Slå på "Require pull request" i branch protection

### "Olika build-resultat lokalt vs Vercel"
→ Lås Node-version (`engines` i package.json) och använd `npm ci`

## Snabb "cookbook"

### Skapa ny feature & få en test-URL
```bash
git checkout -b feature/header-refactor
git commit -m "feat(header): add sticky behavior"
git push -u origin feature/header-refactor
# Öppna PR -> develop, kolla Vercel Preview-länken i PR:n
```

### Slå ihop till staging
Merge PR → Vercel uppdaterar `<staging-domän>`

### Promota till prod
Öppna PR `develop` → `main`, merge → prod deploy

## Verifiering

### Aktivera Required Status Checks

1. **Gå till GitHub Repository Settings** → **Branches**
2. **För main-branch:**
   - Klicka på `main`-regeln eller skapa ny
   - Aktivera "Require status checks to pass before merging"
   - Välj följande required checks:
     - `ci / build-and-test`
     - `ci / security-audit`
     - `Vercel — Preview ready` (om tillgängligt)
3. **För develop-branch:**
   - Skapa ny regel för `develop`
   - Aktivera samma status checks som main

### Branch Protection Setup

1. **För main:**
   - ✅ Require pull request reviews (1-2 reviewers)
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Require linear history (valfritt)

2. **För develop:**
   - ✅ Require pull request reviews (1 reviewer)
   - ✅ Require status checks to pass
   - ✅ Allow squash merges

### Vercel Staging Domain Binding

1. **Gå till Vercel Dashboard** → **Project Settings** → **Domains**
2. **Lägg till staging-domän:**
   - Klicka "Add Domain"
   - Ange `<staging-domän>` (t.ex. `stage.example.com`)
   - Under "Assign" → välj Branch = `develop`
3. **Verifiera:**
   - Push till develop-branch
   - Kontrollera att `<staging-domän>` uppdateras automatiskt

### Testa Deployment Flow

1. **Feature → Develop:**
   - Skapa feature-branch: `git checkout -b feature/test`
   - Push och skapa PR mot develop
   - Verifiera att CI-checks körs och passerar
   - Verifiera att Vercel Preview skapas
   - Merge PR → kontrollera att staging uppdateras

2. **Develop → Main:**
   - Skapa PR: develop → main
   - Verifiera att alla checks passerar
   - Merge PR → kontrollera att production deployerar

3. **Semantic Release (om aktiverat):**
   - Push till main med conventional commits
   - Verifiera att version/tag/release notes skapas automatiskt

## Platshållare att ersätta

- `<prod-domän>`: Din produktionsdomän (t.ex. `example.com`)
- `<staging-domän>`: Din staging-domän (t.ex. `stage.example.com`)
- `<vercel-projekt>`: Ditt Vercel-projektnamn
- `<ENV-nycklar>`: Dina miljövariabler (API_URL, KEYS, etc.)
