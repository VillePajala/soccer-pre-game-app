import { AppState, SavedGamesCollection, Season, Tournament, Player } from '@/app/page'; // Adjust path if needed
// Import the constants from the central file
import { 
  SAVED_GAMES_KEY, 
  APP_SETTINGS_KEY, 
  SEASONS_LIST_KEY, 
  TOURNAMENTS_LIST_KEY, 
  MASTER_ROSTER_KEY 
} from '@/config/constants';

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
export const exportFullBackup = () => {
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

    keysToBackup.forEach(key => {
      const itemJson = localStorage.getItem(key);
      if (itemJson) {
        try {
          // Assign parsed data directly to the correct key in backupData.localStorage
          // Ensure the key type is correctly inferred or cast if necessary
          // The keys are now guaranteed to be one of the imported constants
          backupData.localStorage[key as keyof FullBackupData['localStorage']] = JSON.parse(itemJson);
          console.log(`Backed up data for key: ${key}`);
        } catch (error) {
          console.error(`Error parsing localStorage item for key ${key}:`, error);
          // Store null or an error marker if parsing fails? For now, just skip.
        }
      } else {
        console.log(`No data found for key: ${key}, skipping.`);
        // Ensure the key exists with null value if needed, or simply omit it
        backupData.localStorage[key as keyof FullBackupData['localStorage']] = null;
      }
    });

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
export const importFullBackup = (jsonContent: string): boolean => {
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

    // Add explicit type for key
    keysToRestore.forEach((key: keyof FullBackupData['localStorage']) => {
      const dataToRestore = backupData.localStorage[key];
      if (dataToRestore !== undefined && dataToRestore !== null) {
        try {
          // Use the imported constant keys for restoring
          localStorage.setItem(key, JSON.stringify(dataToRestore));
          console.log(`Restored data for key: ${key}`);
        } catch (innerError) { // Use different variable name for inner catch
          console.error(`Error stringifying or setting localStorage item for key ${key}:`, innerError);
          // Optionally stop the process or collect errors
          throw new Error(`Failed to restore data for key ${key}. Aborting import.`);
        }
      } else if (localStorage.getItem(key)) {
        // If the backup explicitly had null/undefined for a key that exists locally, remove it
        localStorage.removeItem(key);
        console.log(`Removed existing data for key: ${key} as it was not present in the backup.`);
      }
    });

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