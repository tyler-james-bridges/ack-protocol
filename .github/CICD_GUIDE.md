# CI/CD Pipeline Guide

This document describes the continuous integration and continuous deployment (CI/CD) setup for the Onchain Kudos App.

## Overview

The repository uses GitHub Actions for automated testing, security scanning, and releases. The pipeline is designed to ensure code quality, security, and reliable deployments.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** Pull requests and pushes to `main` and `develop` branches

**Jobs:**

- **Lint**: Runs ESLint to check code style and quality
  - Fails fast on linting errors
  - Ensures consistent code standards

- **Type Check**: Runs TypeScript compiler in noEmit mode
  - Catches type errors early
  - Prevents type-related runtime issues

- **Build**: Compiles the Next.js application
  - Verifies the project builds successfully
  - Uploads build artifacts for retention
  - Ensures no build-time errors are introduced

- **Security Audit**: Runs npm audit to check dependencies
  - Detects known vulnerabilities in dependencies
  - Audits at "moderate" level
  - Results are uploaded as artifacts for review

**Features:**
- Uses npm cache for faster dependency installation
- Concurrent job execution for speed
- Comprehensive failure reporting

### 2. Security Workflow (`.github/workflows/security.yml`)

**Trigger:** Pull requests, pushes, and weekly schedule (Sundays at 2 AM UTC)

**Jobs:**

- **Dependency Check**:
  - Runs npm audit against known vulnerability database
  - Fails on high-severity vulnerabilities
  - Blocks merging if critical issues found

- **CodeQL Analysis**:
  - GitHub's advanced static analysis tool
  - Detects potential security issues and bugs
  - Analyzes JavaScript/TypeScript code
  - Results appear in GitHub Security tab

- **Trivy Scan**:
  - Comprehensive filesystem vulnerability scanner
  - Scans all files including configuration and dependencies
  - Generates SARIF report for GitHub integration
  - Useful for detecting supply chain vulnerabilities

- **Secret Scanning**:
  - TruffleHog scans for accidentally committed secrets
  - Detects API keys, tokens, credentials
  - Runs on full commit history
  - Essential for preventing credential leaks

**Features:**
- Runs on schedule for proactive vulnerability detection
- Multiple complementary security tools
- Results integrated into GitHub Security tab
- Prevents insecure code from being merged

### 3. Release Workflow (`.github/workflows/release.yml`)

**Trigger:** Pushes to `main` branch that modify `package.json`

**Jobs:**

1. **Validate Job**:
   - Ensures code quality before release
   - Runs: lint, type-check, and build
   - Prevents releasing broken code

2. **Release Job** (depends on Validate):
   - Detects version changes in `package.json`
   - Creates a git tag with semantic versioning
   - Generates GitHub Release with auto-generated release notes
   - Only runs if version number changed

**Workflow:**
```
Push to main with package.json changes
         ↓
Validate (lint, type-check, build)
         ↓
Detect version change
         ↓
Create git tag (if version changed)
         ↓
Create GitHub Release
```

**Features:**
- Only triggers on package.json changes (excludes chore commits)
- Validates code quality before release
- Automatically generates release notes
- Creates semantic version tags
- Prevents accidental releases

## Running Workflows Manually

### Trigger CI on Pull Request

Simply open a pull request against `main` or `develop` branch. The CI workflow will run automatically.

### Trigger Security Scan

Security scans run automatically on:
- Every pull request
- Every push to main/develop
- Weekly on Sundays at 2 AM UTC

To trigger manually:
```bash
gh workflow run security.yml
```

### Create a Release

1. Update version in `package.json` manually
2. Commit changes with message describing release
3. Push to main branch
4. Release workflow runs automatically and creates:
   - Git tag
   - GitHub Release with auto-generated notes

Example:
```bash
# Update version
npm version patch --no-git-tag-version

# Commit and push
git add package.json package-lock.json
git commit -m "chore: bump version to 0.1.8"
git push origin main
```

### Check Workflow Status

```bash
gh workflow list
gh run list --workflow ci.yml
gh run view <run-id> --log
```

## Caching Strategy

All workflows leverage GitHub's npm caching for faster builds:

```yaml
uses: actions/setup-node@v4
with:
  node-version: '20'
  cache: 'npm'
```

This:
- Automatically caches `node_modules` based on `package-lock.json`
- Dramatically reduces dependency installation time
- Cache is invalidated when `package-lock.json` changes

## Security Best Practices

1. **No Secrets in Code**: Always use GitHub Secrets for sensitive data
2. **Token Permissions**: Workflows use minimal required permissions
3. **Security Scanning**: Multiple tools run on every PR
4. **Audit Trail**: All releases are tagged and tracked
5. **Dependency Updates**: Regularly run npm audit to stay current

## Troubleshooting

### Build Fails on PR

**Issue**: CI workflow fails with build error

**Solutions**:
1. Check error message in workflow logs
2. Run locally: `npm install && npm run build`
3. Verify all dependencies are correct
4. Check for TypeScript errors: `npx tsc --noEmit`

### Security Scan Failing

**Issue**: Dependency or CodeQL scan blocks merging

**Solutions**:
1. For npm audit failures: `npm audit fix` or manually update packages
2. For CodeQL issues: review security findings and fix code
3. For false positives: can be dismissed in Security tab (requires admin)

### Release Not Created

**Issue**: Push to main doesn't trigger release

**Solutions**:
1. Verify `package.json` was modified in the commit
2. Check that version number actually changed
3. Verify release workflow isn't in draft state
4. Check workflow logs for validation failures

### Token Issues

**Issue**: Workflow fails with permission errors

**Solution**: Ensure GitHub token has required scopes:
```bash
gh auth refresh -s workflow
```

## Continuous Improvement

The CI/CD pipeline should be regularly reviewed and improved:

- Monitor workflow execution times
- Analyze failure patterns
- Update Node.js version when security patches released
- Add additional security scanning tools as needed
- Optimize cache usage
- Keep actions dependencies updated

## Performance Metrics

Current pipeline performance targets:
- **Lint**: < 30 seconds
- **Type Check**: < 30 seconds
- **Build**: < 2 minutes
- **Security Audit**: < 1 minute
- **CodeQL**: < 5 minutes
- **Trivy Scan**: < 2 minutes

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Advanced Security](https://github.com/features/security)
- [npm Security Best Practices](https://docs.npmjs.com/files/package-lock.json)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Semantic Versioning](https://semver.org/)
