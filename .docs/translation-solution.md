# Translation Solution

While investigating why several menu items appeared in English even when Finnish is the default language, we found the i18n setup only loaded `public/locales/<lang>/common.json`. Many Finnish strings for the ControlBar menu were located in `public/locales/<lang>/translation.json`, which isn't referenced by `src/i18n.ts`. Because the keys like `controlBar.newGameButton` or `controlBar.menu.title` were missing from `common.json`, the app fell back to the English default values.

The fix is to ensure every key used by the menu exists in the loaded translation file. We copied the missing Finnish and English entries from `translation.json` into `common.json` and added a few new keys. Once these keys were present, the ControlBar displayed all menu items in Finnish when the default language is active.
