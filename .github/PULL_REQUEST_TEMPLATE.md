## Description

Please include a summary of the change, the motivation behind it, and any related issue/task.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update / Refactoring

## How Has This Been Tested?

Please describe the tests you ran to verify your changes. Provide instructions so we can reproduce.

- **Test Suite**: `npm run test` or `npm run test:e2e --workspace=packages/api`
- **Scenarios tested**:

## Quality Checklist

- [ ] My code follows the code style guidelines of this project (Bahasa Indonesia in UI, English in code).
- [ ] I have performed a self-review of my own code.
- [ ] I have verified that all database queries are properly scoped by `tenant_id` (Zero-Cast policy).
- [ ] I have run tests locally and confirmed they all pass.
- [ ] I have updated the documentation accordingly (GEMINI.md, AGENTS.md, etc.).
