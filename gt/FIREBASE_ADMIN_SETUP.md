# Firebase setup and first admin

The site's admin role is stored in Firestore at `userRoles/{uid}`. It is not
read from Firebase Authentication custom claims or from an ordinary `users`
profile document.

## Grant the first admin in Firebase Console

1. In Firebase Console, open **Authentication → Users** and find the account
   that should be an administrator. Copy its **User UID**.
2. Open **Firestore Database → Data** in project `jsa11-278d4`.
3. Create a collection named `userRoles` (or open it if it already exists).
4. Create a document with the document ID set to the copied Authentication UID.
5. Add this field:

   | Field | Type | Value |
   | --- | --- | --- |
   | `role` | string | `admin` |

   Example: `userRoles/PASTE_AUTH_UID_HERE` → `{ "role": "admin" }`.
6. Sign out and sign in to KAVASK again, then open the account menu and select
   **Quản trị hệ thống**.

Do not use the email as the document ID; use the exact UID shown in
Authentication. Firestore Console writes are trusted administrative actions.
Client Firestore Rules explicitly deny writes to `userRoles`, so users cannot
grant themselves access from the website.

To remove admin access, delete that user's document in `userRoles` or change
`role` to `user`. The admin dashboard uses the same collection when granting
or removing roles.

## Deploy the protected backend

Deploy callable admin functions and Firestore rules from this directory:

```powershell
npm.cmd --prefix functions install
firebase login
firebase deploy --only functions,firestore:rules --project jsa11-278d4
```

Cloud Functions deployment may require the Firebase project to use the Blaze
plan. Load the shared starter exercise catalog once with trusted credentials:

```powershell
gcloud auth application-default login
npm.cmd --prefix functions run seed:tasks
```

Cloud Functions independently verifies the Firestore admin role for each
privileged request. Firestore rules block client writes to the shared exercise
catalog and deny access to users marked as banned.

## Admin overview and player ranks

The admin overview counts a user as active when their Firebase Authentication
last sign-in was within the previous 30 days. User growth compares accounts
created in the latest 30-day period with the preceding 30-day period; it is
based on account creation dates, not a recorded in-app activity event.

Player ranks are assigned by admins from the user list using the four tiers
shown on the home page. Current assignments are stored in `userRanks/{uid}`;
each change is appended to `rankHistory`. The history starts when this feature
is deployed and does not include earlier rank changes.
