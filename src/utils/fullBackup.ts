import { SavedGamesCollection } from "@/types"; // AppState was removed, SavedGamesCollection is still used.
import { Player, Season, Tournament } from "@/types"; // Corrected import path for these types
// Import the constants from the central file
import {
  SAVED_GAMES_KEY,
  APP_SETTINGS_KEY,
  SEASONS_LIST_KEY,
  TOURNAMENTS_LIST_KEY,
  MASTER_ROSTER_KEY,
} from "@/config/storageKeys";
import logger from "@/utils/logger";
import i18n from "i18next";
// Import the new async localStorage utility functions
import {
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
} from "./localStorage";

// Define the structure of the backup file
interface FullBackupData {
  meta: {
    schema: number;
    exportedAt: string;
  };
  localStorage: {
    [SAVED_GAMES_KEY]?: SavedGamesCollection | null;
    [APP_SETTINGS_KEY]?: { currentGameId: string | null } | null;
    [SEASONS_LIST_KEY]?: Season[] | null;
    [TOURNAMENTS_LIST_KEY]?: Tournament[] | null;
    [MASTER_ROSTER_KEY]?: Player[] | null;
  };
}

export const generateFullBackupJson = async (): Promise<string> => {
  const backupData: FullBackupData = {
    meta: {
      schema: 1,
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
    const itemJson = getLocalStorageItem(key);
    if (itemJson) {
      try {
        backupData.localStorage[key as keyof FullBackupData['localStorage']] = JSON.parse(itemJson);
        logger.log(`Backed up data for key: ${key}`);
      } catch (error) {
        logger.error(`Error parsing localStorage item for key ${key}:`, error);
        backupData.localStorage[key as keyof FullBackupData['localStorage']] = null;
      }
    } else {
      logger.log(`No data found for key: ${key}, setting to null.`);
      backupData.localStorage[key as keyof FullBackupData['localStorage']] = null;
    }
  }

  return JSON.stringify(backupData, null, 2);
};

// Function to export all relevant localStorage data
export const exportFullBackup = async (): Promise<string> => {
  logger.log("Starting full backup export...");
  try {
    const jsonString = await generateFullBackupJson();
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;
    a.download = `SoccerApp_Backup_${timestamp}.json`;

    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.log(`Full backup exported successfully as ${a.download}`);
    alert(i18n.t("fullBackup.exportSuccess"));
    return jsonString;
  } catch (error) {
    logger.error("Failed to export full backup:", error);
    alert(i18n.t("fullBackup.exportError"));
    throw error;
  }
};

// Function to import data from a backup file
export const importFullBackup = async (
  jsonContent: string,
): Promise<boolean> => {
  logger.log("Starting full backup import...");
  try {
    const backupData: FullBackupData = JSON.parse(jsonContent);

    // --- Basic Validation ---
    if (typeof backupData !== "object" || backupData === null) {
      throw new Error(
        "Invalid format: Backup file is not a valid JSON object.",
      );
    }
    if (!backupData.meta || typeof backupData.meta !== "object") {
      throw new Error("Invalid format: Missing 'meta' information.");
    }
    if (backupData.meta.schema !== 1) {
      // Basic schema check - can be expanded later
      throw new Error(
        `Unsupported schema version: ${backupData.meta.schema}. This tool supports schema version 1.`,
      );
    }
    if (
      !backupData.localStorage ||
      typeof backupData.localStorage !== "object"
    ) {
      throw new Error("Invalid format: Missing 'localStorage' data object.");
    }

    // --- Confirmation ---
    if (!window.confirm(i18n.t("fullBackup.confirmRestore"))) {
      logger.log("User cancelled the import process.");
      return false; // User cancelled
    }

    logger.log("User confirmed import. Proceeding to overwrite data...");

    // --- Overwrite localStorage ---
    const keysToRestore = Object.keys(backupData.localStorage) as Array<
      keyof FullBackupData["localStorage"]
    >;

    for (const key of keysToRestore) {
      const dataToRestore = backupData.localStorage[key];
      if (dataToRestore !== undefined && dataToRestore !== null) {
        try {
          setLocalStorageItem(key, JSON.stringify(dataToRestore));
          logger.log(`Restored data for key: ${key}`);
        } catch (innerError) {
          logger.error(
            `Error stringifying or setting localStorage item for key ${key}:`,
            innerError,
          );
          // It's important to alert the user and rethrow or handle appropriately
          alert(i18n.t("fullBackup.restoreKeyError", { key }));
          throw new Error(
            `Failed to restore data for key ${key}. Aborting import.`,
          );
        }
      } else {
        // If data for this key is null/undefined in backup, remove it from localStorage if it exists
        // Check if item exists before attempting removal to avoid unnecessary operations/logs
        const currentItem = getLocalStorageItem(key); // Check if item exists
        if (currentItem !== null) {
          removeLocalStorageItem(key);
          logger.log(
            `Removed existing data for key: ${key} as it was explicitly null or not present in the backup.`,
          );
        }
      }
    }

    // --- Final Step: Reload ---
    logger.log("Data restored successfully. Reloading application...");
    alert(i18n.t("fullBackup.restoreSuccess"));

    // Use setTimeout to ensure the alert is seen before reload
    setTimeout(() => {
      window.location.reload();
    }, 500);

    return true; // Indicate success (although reload prevents further action)
  } catch (error) {
    logger.error("Failed to import full backup:", error);
    // Type check for error before accessing message
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(i18n.t("fullBackup.restoreError", { error: errorMessage }));
    return false; // Indicate failure
  }
};
