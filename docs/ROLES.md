# Roles & Permissions

## Hierarchy

admin  >  admin_user  >  branch_manager  >  teacher  >  student

## Matrix

| Capability | admin | admin_user | branch_mgr | teacher | student |
|---|:---:|:---:|:---:|:---:|:---:|
| See all branches | ✓ | ✓ | own | own | own |
| CRUD branches | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create any-role user (branch picker) | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create teacher/student in own branch | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete admin_user | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete admin singleton | NEVER | — | — | — | — |
| Create/edit scenarios | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create instance (cross-branch) | ✓ | ✓ | own | own | ✗ |
| Pause/resume instance | all | all | own branch | assigned | ✗ |
| Archive instance | all | all | own branch | assigned | ✗ |
| Push grades to Moodle | all | all | own branch | assigned | ✗ |
| Cross-branch analytics | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create/attach brand-kits | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit site settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| Maintenance mode toggle | ✓ | ✓ | ✗ | ✗ | ✗ |
| Moodle import (branch picker) | ✓ | ✓ | own branch | ✗ | ✗ |
| Self-register | ✗ | ✗ | ✗ | ✗ | ✓ |

## Branch rules

- Admin's branch is always `HQ` (auto-set, immutable).
- Branch managers create users in their own branch — no picker shown.
- Students inherit the branch of the instance they enroll in.
- Admin/admin_user get a branch picker on every user-create form.
