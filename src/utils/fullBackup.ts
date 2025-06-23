import { SavedGamesCollection } from '@/app/page'; // AppState was removed, SavedGamesCollection is still used.
import { Player, Season, Tournament } from '@/types'; // Corrected import path for these types
// Import the constants from the central file
import { 
  SAVED_GAMES_KEY, 
  APP_SETTINGS_KEY, 
  SEASONS_LIST_KEY, 
  TOURNAMENTS_LIST_KEY, 
  MASTER_ROSTER_KEY 
} from '@/config/constants';
// Import the new async localStorage utility functions
import { getLocalStorageItemAsync, setLocalStorageItemAsync, removeLocalStorageItemAsync } from './localStorage';

// Define the structure of the backup file
interface FullBackupData {
  meta: {
    schema: number; // Version number for future migrations
    exportedAt: string; // ISO timestamp
  };
  localStorage: {
    [SAVED_GAMES_KEY]?: SavedGamesCollection | null;
    [APP_SETTINGS_KEY]?: { currentGameId: string | null } | null;
    [SEASONS_LIST_KEY]?: Season[] | null;
    [TOURNAMENTS_LIST_KEY]?: Tournament[] | null;
    [MASTER_ROSTER_KEY]?: Player[] | null;
  };
}

// Function to export all relevant localStorage data
export const exportFullBackup = async (): Promise<void> => {
  console.log("Starting full backup export...");
  try {
    const backupData: FullBackupData = {
      meta: {
        schema: 1, // Current schema version
        exportedAt: new Date().toISOString(),
      },
      localStorage: {},
    };

    const keysToBackup = [
      SAVED_GAMES_KEY,
      APP_SETTINGS_KEY,
      SEASONS_LIST_KEY,
      TOURNAMENTS_LIST_KEY,
      MASTER_ROSTER_KEY,
    ];

    for (const key of keysToBackup) {
      const itemJson = await getLocalStorageItemAsync(key);
      if (itemJson) {
        try {
          // Assign parsed data directly to the correct key in backupData.localStorage
          backupData.localStorage[key as keyof FullBackupData['localStorage']] = JSON.parse(itemJson);
          console.log(`Backed up data for key: ${key}`);
        } catch (error) {
          console.error(`Error parsing localStorage item for key ${key}:`, error);
          // Explicitly set to null on parsing error
          backupData.localStorage[key as keyof FullBackupData['localStorage']] = null; 
        }
      } else {
        // Explicitly set to null if item doesn't exist or getter failed (it resolves to null)
        console.log(`No data found for key: ${key}, setting to null.`); 
        backupData.localStorage[key as keyof FullBackupData['localStorage']] = null;
      }
    }

    const jsonString = JSON.stringify(backupData, null, 2); // Pretty print
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    a.download = `SoccerApp_Backup_${timestamp}.json`;

    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Full backup exported successfully as ${a.download}`);
    alert('Full backup exported successfully!'); // Provide user feedback

  } catch (error) {
    console.error("Failed to export full backup:", error);
    alert('Error exporting full backup. Check the console for details.');
  }
};

// Function to import data from a backup file
export const importFullBackup = async (jsonContent: string): Promise<boolean> => {
  console.log("Starting full backup import...");
  try {
    const backupData: FullBackupData = JSON.parse(jsonContent);

    // --- Basic Validation ---
    if (typeof backupData !== 'object' || backupData === null) {
      throw new Error("Invalid format: Backup file is not a valid JSON object.");
    }
    if (!backupData.meta || typeof backupData.meta !== 'object') {
      throw new Error("Invalid format: Missing 'meta' information.");
    }
    if (backupData.meta.schema !== 1) {
      // Basic schema check - can be expanded later
      throw new Error(`Unsupported schema version: ${backupData.meta.schema}. This tool supports schema version 1.`);
    }
    if (!backupData.localStorage || typeof backupData.localStorage !== 'object') {
      throw new Error("Invalid format: Missing 'localStorage' data object.");
    }

    // --- Confirmation ---
    if (!window.confirm("Are you sure you want to restore from this backup? This will OVERWRITE all current application data (games, roster, seasons, tournaments, settings) and reload the app. This action cannot be undone.")) {
        console.log("User cancelled the import process.");
        return false; // User cancelled
    }

    console.log("User confirmed import. Proceeding to overwrite data...");

    // --- Overwrite localStorage ---
    const keysToRestore = Object.keys(backupData.localStorage) as Array<keyof FullBackupData['localStorage']>;

    for (const key of keysToRestore) {
      const dataToRestore = backupData.localStorage[key];
      if (dataToRestore !== undefined && dataToRestore !== null) {
        try {
          await setLocalStorageItemAsync(key, JSON.stringify(dataToRestore));
          console.log(`Restored data for key: ${key}`);
        } catch (innerError) { 
          console.error(`Error stringifying or setting localStorage item for key ${key}:`, innerError);
          // It's important to alert the user and rethrow or handle appropriately
          alert(`Failed to restore data for key ${key}. Aborting import to prevent partial restore.`);
          throw new Error(`Failed to restore data for key ${key}. Aborting import.`);
        }
      } else {
        // If data for this key is null/undefined in backup, remove it from localStorage if it exists
        // Check if item exists before attempting removal to avoid unnecessary operations/logs
        const currentItem = await getLocalStorageItemAsync(key); // Check if item exists
        if (currentItem !== null) {
          await removeLocalStorageItemAsync(key);
          console.log(`Removed existing data for key: ${key} as it was explicitly null or not present in the backup.`);
      }
      }
    }

    // --- Final Step: Reload ---
    console.log("Data restored successfully. Reloading application...");
    alert('Full backup restored successfully! The application will now reload.');
    
    // Use setTimeout to ensure the alert is seen before reload
    setTimeout(() => {
        window.location.reload();
    }, 500); 
    
    return true; // Indicate success (although reload prevents further action)

  } catch (error) {
    console.error("Failed to import full backup:", error);
    // Type check for error before accessing message
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`Error importing full backup: ${errorMessage}`);
    return false; // Indicate failure
  }
};