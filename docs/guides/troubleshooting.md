# 🔧 Troubleshooting Guide

Common issues and solutions for MatchDay Coach app.

## 🚨 Critical Issues

### App Won't Start / Red Screen Error
**Symptoms**: Red error screen on app launch, console shows service worker errors

**Solution**:
1. Clear browser cache completely (Ctrl+Shift+Delete)
2. Unregister service workers:
   - Open DevTools → Application → Service Workers  
   - Click "Unregister" for all soccer app workers
3. Clear storage:
   - DevTools → Application → Storage → Clear storage
4. Refresh the page

**Prevention**: Always test app after clearing browser data

### Data Loss / Games Not Loading
**Symptoms**: Previously saved games missing, "No saved games" message

**Diagnosis**:
1. Check browser storage: DevTools → Application → Storage
2. Look for IndexedDB `soccerCoachDB` database
3. Check localStorage for `soccerCoach_` prefixed keys

**Solutions**:
- **Data still exists**: Try the storage debug page at `/debug-storage`
- **Data corruption**: Use backup/restore feature if available
- **Complete loss**: Check if you have exported backup files

### Authentication Issues
**Symptoms**: Stuck on sign-in, "Session expired" messages, auth loops

**Solutions**:
1. **Clear auth state**:
   ```javascript
   // In browser console:
   localStorage.removeItem('sb-auth-token')
   localStorage.removeItem('supabase.auth.token')
   ```
2. **Reset session**: Sign out completely, clear cookies, sign back in
3. **Check network**: Ensure internet connection for Supabase auth

## 🎮 Game Issues

### Timer Not Working
**Symptoms**: Timer doesn't start, shows incorrect time, stops unexpectedly

**Solutions**:
- **Timer won't start**: Check if game status is set to "In Progress"
- **Wrong time display**: Refresh page, timer state should restore
- **Timer stops**: Check browser tab visibility - timer pauses when tab is hidden

### Players Not Showing
**Symptoms**: Player bar empty, can't add players to field

**Solutions**:
1. **Check roster settings**: Ensure players are selected in roster modal
2. **Verify player data**: Use `/debug-storage` to check player data exists
3. **Reset player selection**: Go to Roster Settings and reselect players

### Field Layout Issues  
**Symptoms**: Soccer field not displaying correctly, players outside boundaries

**Solutions**:
- **Mobile layout**: Rotate device to landscape for better field view
- **Zoom issues**: Reset browser zoom to 100%
- **Touch problems**: Clear touch event listeners by refreshing

## 💾 Storage & Sync Issues

### Offline Mode Stuck
**Symptoms**: "Working in offline mode" message persists with internet connection

**Solutions**:
1. **Check connection**: Verify internet is actually working
2. **Reset connection status**: Refresh page
3. **Clear storage**: May need to clear and re-authenticate

### Data Not Syncing
**Symptoms**: Changes not saving, data different between devices

**Solutions**:
1. **Force sync**: Sign out and sign back in
2. **Check auth**: Ensure you're signed in to the same account
3. **Manual backup**: Export data before troubleshooting

### Import/Export Problems
**Symptoms**: Backup files won't import, export creates empty files

**Solutions**:
- **Import fails**: Check file format (should be .json)
- **File too large**: Split backup into smaller parts if >10MB
- **Permissions**: Ensure browser can access downloads folder

## 📱 Mobile Issues

### Touch Response Problems  
**Symptoms**: Touches not registering, dragging not working

**Solutions**:
- **iOS Safari**: Disable "Request Desktop Website"
- **Android Chrome**: Clear Chrome app cache
- **General**: Try two-finger touch reset gesture

### Performance Issues
**Symptoms**: App slow, animations stuttering, crashes

**Solutions**:
1. **Close other tabs**: Free up memory
2. **Restart browser**: Clear memory leaks
3. **Update browser**: Ensure latest version
4. **Check device storage**: Free up device storage space

### PWA Installation Issues
**Symptoms**: Install prompt not showing, app won't install

**Solutions**:
- **Chrome**: Try "Install app" from browser menu
- **Safari**: Use "Add to Home Screen" from share menu
- **Manual**: Bookmark and use as web app

## 🔍 Development Issues

### Build Failures
**Symptoms**: `npm run build` fails with errors

**Common Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version (need 18+)
node --version

# Clear Next.js cache  
rm -rf .next
npm run build
```

### TypeScript Errors
**Symptoms**: Type checking fails, IDE shows red squiggles

**Solutions**:
- **Update types**: `npm update @types/react @types/node`
- **Restart TS server**: In VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
- **Check tsconfig**: Ensure `tsconfig.json` is correct

### Test Failures
**Symptoms**: `npm test` shows failing tests

**Solutions**:
```bash
# Update snapshots
npm test -- --updateSnapshot

# Clear test cache
npm test -- --clearCache

# Run specific test
npm test -- PlayerBar.test.tsx
```

## 🌐 Network & API Issues

### Supabase Connection Problems
**Symptoms**: API errors, "Unable to connect" messages

**Solutions**:
1. **Check Supabase status**: Visit status.supabase.com
2. **Verify environment**: Check `.env.local` has correct keys
3. **Network issues**: Try different network/VPN

### Slow Loading
**Symptoms**: App takes long to load, timeouts

**Solutions**:
- **Check network speed**: Minimum 1Mbps recommended
- **Clear cache**: Force refresh with Ctrl+Shift+R
- **Disable extensions**: Try incognito/private browsing

## 🛠️ Debug Tools

### Browser DevTools
- **Console**: Check for JavaScript errors
- **Network**: Monitor API calls and failures
- **Application**: Inspect storage, service workers, cache
- **Performance**: Profile slow operations

### App Debug Pages
- `/debug-storage` - Storage inspection and cleanup
- `/test-sentry` - Error tracking verification  
- `/admin/monitoring` - Performance metrics (production)

### Useful Console Commands
```javascript
// Check storage contents
console.log(localStorage)
console.log(await indexedDB.databases())

// Clear specific data
localStorage.removeItem('soccerCoach_currentGameId')
indexedDB.deleteDatabase('soccerCoachDB')

// Force offline/online  
window.navigator.onLine = false // Simulate offline

// Check service worker status
navigator.serviceWorker.getRegistrations()
```

## 📞 Getting Help

### Self-Help Resources
1. **Check this troubleshooting guide first**
2. **Search existing GitHub issues**
3. **Try debug tools and console commands**
4. **Test in incognito mode** to rule out extensions

### Reporting Issues
When creating a GitHub issue, include:
- **Device/Browser**: OS, browser version, device type
- **Steps to reproduce**: Exact steps that cause the issue
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens  
- **Console errors**: Any red errors in browser console
- **Screenshots**: Visual issues benefit from screenshots

### Issue Templates
Use appropriate GitHub issue template:
- 🐛 **Bug Report**: For app malfunctions
- 🚀 **Feature Request**: For new functionality
- 📚 **Documentation**: For documentation improvements
- 🔧 **Technical**: For development/build issues

## 🔄 Emergency Recovery

### Complete Reset (Last Resort)
If all else fails:
```bash
# Clear all browser data for the domain
# DevTools → Application → Storage → Clear storage

# Or manually:
localStorage.clear()
sessionStorage.clear()
indexedDB.deleteDatabase('soccerCoachDB')
navigator.serviceWorker.getRegistrations()
  .then(registrations => registrations.forEach(reg => reg.unregister()))
```

⚠️ **Warning**: This will delete ALL your data. Export backups first if possible.

### Data Recovery
If you have backup files:
1. Go to Settings → Import/Export
2. Use "Import Backup" with your .json file
3. Verify data imported correctly
4. Test app functionality

---

*Still having issues? Create a GitHub issue with detailed information and we'll help!*